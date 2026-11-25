import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computed,ref} from 'vue';
function fixture(overrides={}){
  const store=new Map();const calls=[];
  const source=readFileSync(new URL('./components/admin/SoftwareUpdatesCard.vue',import.meta.url),'utf8').match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*;\r?\n/gm,'');
  const bindings={computed,ref,onMounted(){},onUnmounted(){},getStorageKey:x=>x,
    sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
    api:{get:async()=>({data:{status:'idle',ticket:'read-only'}}),post:async(path,body)=>{calls.push([path,body]);return {data:{status:'running',ticket:'read-only'}};}},
    fetch:async()=>({ok:true,json:async()=>({status:'running'})}),AbortSignal,setTimeout:()=>1,clearTimeout(){},window:{location:{reload(){}}},...overrides};
  const card=new Function(...Object.keys(bindings),source+';return {job,answer,selected,confirm,error,sending,accept,start,answerPrompt,cancel,resume,poll,busy,recoveryRequired,connectionLost,helper,helperLoading,checkHelper};')(...Object.values(bindings));
  return {card,calls,store};
}
test('start verifies independent progress endpoint before scheduling',async()=>{
  const {card,calls}=fixture({fetch:async()=>({ok:false})});
  card.selected.value={tag:'v3.0.4',commit:'a'.repeat(40)};
  await card.start();assert.equal(calls.length,0);assert.ok(card.error.value);
});

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
for(const action of ['answerPrompt','cancel','start','resume']){
  test(`late progress cannot overwrite ${action}`,async()=>{
    const pending=deferred();let polls=0;
    const {card}=fixture({fetch:()=>++polls===1?pending.promise:Promise.resolve({ok:true,json:async()=>({status:'running'})})});
    card.accept({status:'waiting',ticket:'ticket',prompt:{id:'old'}});
    card.selected.value={tag:'v3.0.4',commit:'a'.repeat(40)};
    const polling=card.poll();await card[action]();const accepted=card.job.value;
    pending.resolve({ok:true,json:async()=>({status:'waiting',prompt:{id:'old'}})});
    await polling;assert.equal(card.job.value,accepted);
  });
}
test('polls skip pending mutation and continue after its failure',async()=>{
  const pending=deferred();let count=0,timers=0;
  const {card}=fixture({api:{post:()=>pending.promise},fetch:async()=>{count++;return {ok:true,json:async()=>({status:'running'})};},setTimeout:()=>++timers});
  card.accept({status:'waiting',ticket:'ticket',prompt:{id:'old'}});
  const answering=card.answerPrompt();await card.poll();assert.equal(count,0);
  pending.reject(new Error('offline'));await answering;await card.poll();
  assert.equal(count,1);assert.equal(timers,2);
});
for(const pendingPath of ['status','releases']){
  test(`mount starts saved-ticket polling while ${pendingPath} is pending`,async()=>{
    let mount,unmount,fetches=0,scheduled;
    const pending=deferred();
    const {card}=fixture({onMounted:fn=>mount=fn,onUnmounted:fn=>unmount=fn,
      sessionStorage:{getItem:()=> 'saved-ticket',setItem(){}},
      api:{get:path=>path.endsWith(pendingPath)?pending.promise:Promise.resolve({data:{status:'running',ticket:'saved-ticket'}})},
      fetch:async()=>{fetches++;return {ok:true,json:async()=>({status:'running',stage:'Backup'})};},setTimeout:fn=>{scheduled=fn;return 1;}});
    mount();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(fetches,1);assert.equal(card.job.value.stage,'Backup');
    pending.resolve({data:{status:'waiting',prompt:{id:'stale'}}});
    await new Promise(resolve=>setImmediate(resolve));assert.equal(card.job.value.stage,'Backup');
    unmount();assert.equal(typeof scheduled,'function');
  });
}
test('start pins selected release and hides confirmation after acceptance',async()=>{
  const {card,calls}=fixture();card.selected.value={tag:'v3.0.4',commit:'a'.repeat(40)};card.confirm.value=true;
  await card.start();assert.deepEqual(calls[0],['/software-updates/start',{tag:'v3.0.4',commit:'a'.repeat(40)}]);
  assert.equal(card.confirm.value,false);assert.equal(card.busy.value,true);
});
test('secret answers are cleared and never saved in session storage',async()=>{
  const {card,calls,store}=fixture();card.accept({status:'waiting',ticket:'read-only',prompt:{id:'prompt',secret:true}});
  card.answer.value='private fixture';await card.answerPrompt();
  assert.equal(card.answer.value,'');assert.deepEqual(calls[0],['/software-updates/answer',{promptId:'prompt',answer:'private fixture'}]);
  assert.deepEqual([...store.values()],['read-only']);
});
test('progress reconnects independently of the stopped application API',async()=>{
  const {card}=fixture({api:{get(){throw new Error('backend stopped');}},fetch:async()=>({ok:true,json:async()=>({status:'recovery-required',message:'Recovery required'})})});
  card.accept({status:'running',ticket:'read-only'});await card.poll();
  assert.equal(card.recoveryRequired.value,true);assert.equal(card.busy.value,false);
});


test('helper readiness is independent and reports legacy, failure and recovery states',async()=>{
  let result={state:'update-required',message:'Refresh required'};
  const {card}=fixture({api:{get:async()=>({data:result})}});
  await card.checkHelper();assert.equal(card.helper.value.state,'update-required');
  result={state:'ready',message:'Matched'};await card.checkHelper();assert.equal(card.helper.value.state,'ready');
  card.accept({status:'running'});card.accept({status:'complete'});
  assert.equal(card.helper.value.state,'unknown');assert.match(card.helper.value.message,/Reload/);
  result={};await card.checkHelper();assert.equal(card.helper.value.state,'unknown');
});
test('helper check failure never implies ready or overwrites update progress',async()=>{
  const {card}=fixture({api:{get:async()=>{throw new Error('offline');}}});
  card.accept({status:'running',stage:'Backup'});
  await card.checkHelper();assert.equal(card.helper.value.state,'unknown');
  assert.equal(card.job.value.stage,'Backup');assert.equal(card.helperLoading.value,false);
});

for (const fails of [false, true]) {
  test(`pre-completion helper response is discarded (failure=${fails})`, async () => {
    const pending=deferred();
    const {card}=fixture({api:{get:()=>pending.promise}});
    const checking=card.checkHelper();
    card.accept({status:'complete'});
    const invalidated=card.helper.value;
    if(fails) pending.reject(new Error('offline'));
    else pending.resolve({data:{state:'ready'}});
    await checking;
    assert.equal(card.helper.value,invalidated);
    assert.equal(card.helperLoading.value,false);
  });
}
test('helper checks started after completion can verify readiness',async()=>{
  const {card}=fixture({api:{get:async()=>({data:{state:'ready'}})}});
  card.accept({status:'complete'});await card.checkHelper();
  assert.equal(card.helper.value.state,'ready');
});
