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
  const card=new Function(...Object.keys(bindings),source+';return {job,answer,selected,confirm,error,sending,accept,start,answerPrompt,poll,busy,recoveryRequired};')(...Object.values(bindings));
  return {card,calls,store};
}
test('start verifies independent progress endpoint before scheduling',async()=>{
  const {card,calls}=fixture({fetch:async()=>({ok:false})});
  card.selected.value={tag:'v3.0.4',commit:'a'.repeat(40)};
  await card.start();assert.equal(calls.length,0);assert.ok(card.error.value);
});
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
