import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computed,ref} from 'vue';
function fixture(){
  let unmount; const requests=[]; const document={hidden:false};
  const source=readFileSync(new URL('./components/ActivityButton.vue',import.meta.url),'utf8').match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*;\r?\n/gm,'');
  const bindings={computed,ref,defineProps(){},useAuth:()=>({state:{token:'token'}}),useRoute:()=>({}),watch(){},onMounted(){},onUnmounted:fn=>unmount=fn,
    api:{get:()=>new Promise(resolve=>requests.push(resolve))},document,window:{removeEventListener(){}},clearInterval(){}};
  document.removeEventListener=()=>{};
  const component=new Function(...Object.keys(bindings),source+';return {refresh,count};')(...Object.values(bindings));
  return {...component,requests,document,unmount:()=>unmount()};
}
test('overlapping refreshes coalesce into one fresh count request',async()=>{
  const f=fixture();const first=f.refresh();
  await f.refresh();await f.refresh();assert.equal(f.requests.length,1);
  f.requests[0]({data:{count:3}});await first;
  assert.equal(f.requests.length,2);
  f.requests[1]({data:{count:0}});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.count.value,0);assert.equal(f.requests.length,2);
});
for(const stop of ['hidden','unmounted'])test(`queued refresh respects ${stop}`,async()=>{
  const f=fixture();const first=f.refresh();await f.refresh();
  if(stop==='hidden')f.document.hidden=true;else f.unmount();
  f.requests[0]({data:{count:1}});await first;
  assert.equal(f.requests.length,1);
  if(stop==='unmounted')assert.equal(f.count.value,0);
});
