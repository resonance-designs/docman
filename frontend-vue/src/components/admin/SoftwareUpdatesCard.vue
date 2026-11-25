<template>
  <v-card class="mt-6" :loading="loading">
    <v-card-title>Software updates</v-card-title>
    <v-card-subtitle>Stable releases from resonance-designs/docman on GitHub.</v-card-subtitle>
    <v-card-text>
      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
      <v-alert v-if="connectionLost" type="info" class="mb-4">Waiting for updater progress. Keep this page open; an update may still be running. Do not start another update.</v-alert>
      <v-alert class="mb-4" :type="helper.state === 'ready' ? 'success' : 'warning'" variant="tonal" role="status">
        <strong>{{ helper.state === 'ready' ? 'Updater helper ready' : helper.state === 'update-required' ? 'Server action required: refresh updater helper' : 'Updater helper readiness not confirmed' }}</strong>
        <p>{{ helper.message }}</p>
        <template v-if="helper.state !== 'ready'">
          <p>Helper-dependent features, including system-update notifications, may be unavailable until this is resolved. Profile notifications do not require the helper.</p>
          <p>After the application update finishes and any recovery is resolved, ask the server operator to run on the server:</p>
          <pre class="helper-command">cd /var/www/docman
sudo bash scripts/update/enable-web-updater.sh</pre>
          <p>Expect Syntax OK, active, and PASS. Then recheck below. Do not run helper setup during an update or unresolved recovery.</p>
        </template>
        <v-btn class="mt-2" variant="outlined" :loading="helperLoading" :disabled="busy || recoveryRequired" @click="checkHelper">Recheck helper readiness</v-btn>
      </v-alert>
      <div class="d-flex align-center ga-3 mb-4">
        <span v-if="installed">Installed version: {{ installed }}</span>
        <v-btn variant="tonal" :disabled="busy || loading" @click="check">Check for updates</v-btn>
      </div>
      <v-data-table v-if="checked" :headers="headers" :items="releases" item-value="tag" :items-per-page="5" no-data-text="No newer stable releases are available.">
        <template #item.commit="{ item }"><code>{{ item.commit.slice(0, 12) }}</code></template>
        <template #item.action="{ item }"><v-btn size="small" :disabled="busy || sending || recoveryRequired" @click="choose(item)">Update to {{ item.tag }}</v-btn></template>
      </v-data-table>
      <v-alert v-if="job.status && job.status !== 'idle'" class="mt-4" :type="job.status === 'complete' ? 'success' : recoveryRequired || job.status === 'failed' ? 'error' : 'info'" role="status">
        <strong>{{ job.tag }} — {{ job.stage || job.status }}</strong>
        <div>{{ job.message || 'Update in progress. This page will reconnect while the application restarts.' }}</div>
        <div v-if="job.status === 'complete'">Reload the updated application and check helper readiness. Application success does not confirm that the separate server helper is current.</div>
        <div v-if="job.report?.run_id">Recovery/report ID: <code>{{ job.report.run_id }}</code></div>
        <div v-if="job.report?.backup_snapshot">Backup snapshot: <code>{{ job.report.backup_snapshot }}</code></div>
      </v-alert>
      <v-progress-linear v-if="busy && !job.prompt" indeterminate class="mt-4" />
      <v-form v-if="job.prompt" class="mt-4" @submit.prevent="answerPrompt">
        <p class="mb-3">{{ job.prompt.text }}</p>
        <v-text-field v-model="answer" :type="job.prompt.secret ? 'password' : 'text'" label="Your response" :autocomplete="job.prompt.secret ? 'new-password' : 'off'" maxlength="2048" :disabled="sending" />
        <v-btn type="submit" color="primary" :loading="sending">Continue</v-btn>
        <v-btn variant="text" class="ml-2" :disabled="sending" @click="cancel">Cancel update</v-btn>
      </v-form>
      <v-btn v-if="job.status === 'complete'" class="mt-4" color="primary" @click="reload">Reload updated application</v-btn>
      <p class="text-caption mt-4">The web updater requires one-time setup by the server operator. An encrypted backup is mandatory. LOCAL uses a recovery snapshot on this server; it does not protect against losing the disk. Private logs and passwords are never shown here.</p>
    </v-card-text>
    <v-dialog v-model="confirm" max-width="640" :persistent="sending">
      <v-card title="Prepare software update">
        <v-card-text>
          <p>Update to <strong>{{ selected?.tag }}</strong> at commit <code class="text-break">{{ selected?.commit }}</code>?</p>
          <p class="mt-3">The updater checks this server, asks you to confirm the release and backup settings, builds the release, then stops DocMan for backup and migration. Make sure other administrators, imports, and custom jobs will not write to the database or uploads during maintenance.</p>
          <p class="mt-3">If migration fails after changes begin, the app may remain stopped until the server operator restores the matching backup. This page can still show recovery status.</p>
          <p class="mt-3">The application update does not replace the separate server helper. This release may require a server-operator step afterward. When the update finishes, reload the application and check Helper readiness before treating the upgrade as fully configured.</p>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="sending" @click="confirm = false">Back</v-btn><v-btn color="primary" :loading="sending" @click="start">Start interactive update</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '@/services/api';
import { getStorageKey } from '@/runtime/config';
const installed=ref(''), releases=ref([]), checked=ref(false), loading=ref(false), sending=ref(false), error=ref('');
const job=ref({status:'idle'}), answer=ref(''), selected=ref(null), confirm=ref(false), connectionLost=ref(false);
const helper=ref({state:'unknown',message:'Checking the separately installed server helper...'}), helperLoading=ref(false);
const busy=computed(()=>['starting','running','waiting'].includes(job.value.status));
const recoveryRequired=computed(()=>['interrupted','recovery-required'].includes(job.value.status));
const headers=[{title:'Release',key:'tag'},{title:'Commit',key:'commit'},{title:'',key:'action',sortable:false}];
const ticketKey=getStorageKey('update-progress-ticket');
let ticket=sessionStorage.getItem(ticketKey) || '', timer, disposed=false;
let controlEpoch=0, controls=0, stateRevision=0, helperGeneration=0;
async function control(request){
  controls++;controlEpoch++;
  try{return await request();}finally{controls--;}
}
if(ticket)job.value={status:'running',stage:'Reconnecting to updater'};
const failure=e=>e.response?.data?.message || 'Could not contact the updater. Ask the server operator to verify one-time setup.';
function accept(data) {
  if(disposed)return;
  stateRevision++;
  if(data.ticket){ticket=data.ticket;sessionStorage.setItem(ticketKey,ticket);}
  if(job.value.prompt?.id!==data.prompt?.id)answer.value='';
  if(data.status==='complete' && job.value.status!=='complete'){helperGeneration++;helper.value={state:'unknown',message:'The application update completed. Reload the updated application, then verify the helper against the new release.'};}
  job.value=data;connectionLost.value=false;
}
async function checkHelper(){
  if(helperLoading.value)return;
  helperLoading.value=true;
  const generation=helperGeneration;
  try{
    const {data}=await api.get('/software-updates/helper');
    if(!disposed && generation===helperGeneration)helper.value=['ready','update-required','unavailable','unknown'].includes(data?.state)
      ? data : {state:'unknown',message:'Helper readiness could not be verified. Ask the server operator to check setup.'};
  }catch{if(!disposed && generation===helperGeneration)helper.value={state:'unknown',message:'Helper readiness could not be verified. Retry after the backend returns or contact the server operator.'};}
  finally{helperLoading.value=false;}
}
async function check(){loading.value=true;error.value='';try{const {data}=await api.get('/software-updates/releases');installed.value=data.installedVersion;releases.value=data.releases;checked.value=true;}catch(e){error.value=failure(e);}finally{loading.value=false;}}
function choose(item){selected.value=item;confirm.value=true;}
async function start(){
  sending.value=true;error.value='';
  try{
    const probe=await fetch('/_docman-update/status',{headers:{Authorization:`Bearer ${ticket}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!probe.ok)throw new Error('Progress route unavailable');
    const progress=await probe.json();
    if(typeof progress.status!=='string')throw new Error('Progress route is not configured');
    const {data}=await control(()=>api.post('/software-updates/start',{tag:selected.value.tag,commit:selected.value.commit}));accept(data);confirm.value=false;
  }
  catch(e){error.value=failure(e);await resume();}finally{sending.value=false;}
}
async function answerPrompt(){
  const promptId=job.value.prompt.id;const value=answer.value;answer.value='';sending.value=true;error.value='';
  try{const {data}=await control(()=>api.post('/software-updates/answer',{promptId,answer:value}));accept(data);}
  catch(e){error.value=failure(e);}finally{sending.value=false;}
}
async function cancel(){sending.value=true;try{accept((await control(()=>api.post('/software-updates/cancel'))).data);}catch(e){error.value=failure(e);}finally{sending.value=false;}}
async function resume(){
  // Read-only recovery must not block saved-ticket polling during backend downtime.
  const epoch=++controlEpoch, revision=stateRevision;
  try{const {data}=await api.get('/software-updates/status');if(epoch===controlEpoch && revision===stateRevision)accept(data);}
  catch(e){if(!disposed && epoch===controlEpoch && revision===stateRevision)error.value=failure(e);}
}
async function poll(){
  const epoch=controlEpoch;
  try{
    if(ticket && busy.value && controls===0){
      // Separate read-only socket survives backend shutdown; never use the auth interceptor here.
      const response=await fetch('/_docman-update/status',{headers:{Authorization:`Bearer ${ticket}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Progress unavailable');
      const data=await response.json();
      if(epoch===controlEpoch && controls===0)accept(data);
    }
  }catch{if(!disposed && epoch===controlEpoch && controls===0)connectionLost.value=true;}
  finally{if(!disposed)timer=setTimeout(poll,3000);}
}
function reload(){window.location.reload();}
onMounted(()=>{void resume();void check();void checkHelper();void poll();});
onUnmounted(()=>{disposed=true;clearTimeout(timer);ticket='';answer.value='';});
</script>
<style scoped>
.helper-command { white-space: pre-wrap; overflow-wrap: anywhere; margin: 12px 0; }
</style>
