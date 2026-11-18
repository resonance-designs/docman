<template>
  <v-card :loading="loading" class="mt-6">
    <v-card-title>Outgoing email</v-card-title>
    <v-card-subtitle>Choose how DocMan sends password resets and review notifications.</v-card-subtitle>
    <v-card-text>
      <v-alert v-if="message" :type="messageType" variant="tonal" class="mb-4" role="status">{{ message }}</v-alert>
      <v-form v-if="loaded" @submit.prevent="save">
        <fieldset :disabled="busy" class="mail-fields">
          <v-select v-model="form.provider" label="Email service" :items="providers" />
          <v-alert v-if="form.provider === 'environment'" :type="status.environmentConfigured ? 'info' : 'warning'" variant="tonal" class="mb-4">
            Uses existing AWS SES server settings. {{ status.environmentConfigured ? `Sender: ${status.environmentSender}. Credentials stay on the server.` : 'No valid sender is configured. Choose SMTP or AWS SES below to configure email here.' }}
          </v-alert>
          <v-alert v-if="form.provider === 'disabled'" type="warning" variant="tonal" class="mb-4">Saving this choice stops outgoing email, including password-reset messages.</v-alert>
          <template v-if="['smtp', 'ses'].includes(form.provider)">
            <v-row>
              <v-col cols="12" md="6"><v-text-field v-model="form.fromEmail" label="Sender email address" type="email" required autocomplete="off" /></v-col>
              <v-col cols="12" md="6"><v-text-field v-model="form.fromName" label="Sender display name" maxlength="100" /></v-col>
            </v-row>
            <v-text-field v-model="form.replyTo" label="Reply-to address (optional)" type="email" />
            <template v-if="form.provider === 'smtp'">
              <v-row>
                <v-col cols="12" md="8"><v-text-field v-model="form.smtpHost" label="SMTP server hostname or IP" hint="Ask IT for the outgoing SMTP server, not the webmail website address." persistent-hint required /></v-col>
                <v-col cols="12" md="4"><v-text-field v-model.number="form.smtpPort" label="SMTP port" type="number" min="1" max="65535" required /></v-col>
              </v-row>
              <v-select v-model="form.smtpSecurity" label="Connection security" :items="securityOptions" hint="Use the mode and port supplied by IT. STARTTLS commonly uses 587; direct TLS commonly uses 465." persistent-hint class="mb-3" />
              <v-select v-model="form.smtpAuth" label="SMTP authentication" :items="authOptions" />
              <v-alert v-if="form.smtpAuth === 'none'" type="info" variant="tonal" class="mb-4">No login credentials will be sent. IT must authorize this application server to relay mail and approve the sender address.</v-alert>
              <v-alert v-if="form.smtpSecurity === 'none'" type="warning" variant="tonal" class="mb-4">Email contents will travel to the relay without encryption. Use only if IT explicitly requires this internal-relay configuration. Password authentication is not allowed in this mode.</v-alert>
              <template v-if="form.smtpAuth === 'password'">
                <v-text-field v-model="form.smtpUsername" label="SMTP username" autocomplete="off" required />
                <v-text-field v-model="form.smtpPassword" label="SMTP password" type="password" autocomplete="new-password" :hint="secretHint" persistent-hint />
              </template>
            </template>
            <template v-else>
              <v-text-field v-model="form.sesRegion" label="AWS region" placeholder="us-east-1" required />
              <v-select v-model="form.sesAuth" label="AWS authentication" :items="sesAuthOptions" />
              <v-alert v-if="form.sesAuth === 'role'" type="info" variant="tonal" class="mb-4">Uses the AWS credentials or IAM role configured on this server. No AWS keys are saved through this form.</v-alert>
              <template v-else>
                <v-text-field v-model="form.sesAccessKeyId" label="AWS access key ID" type="password" autocomplete="new-password" :hint="secretHint" persistent-hint />
                <v-text-field v-model="form.sesSecretAccessKey" label="AWS secret access key" type="password" autocomplete="new-password" hint="Enter both fields to replace saved keys. Leave both blank to keep existing keys." persistent-hint />
              </template>
              <div class="text-caption mb-4">The sender must be verified in the selected AWS SES region. SES sandbox accounts also restrict recipients.</div>
            </template>
          </template>
          <v-alert v-if="needsCredentials && !status.encryptionReady" type="warning" variant="tonal" class="mb-4">Credential encryption has not been configured on the server. A server administrator must complete that one-time setup before credentials can be saved here.</v-alert>
          <div v-if="status.credentialsStored" class="text-caption mb-4">Credentials are stored encrypted and cannot be displayed. Switching service or choosing a method without saved credentials removes the old credentials when you save. Changing SMTP server, port, security mode, or username requires entering its password again.</div>
          <v-btn type="submit" color="primary" :loading="saving" :disabled="!dirty || (needsCredentials && !status.encryptionReady)">Save email settings</v-btn>
          <v-btn class="ml-2" variant="text" @click="load">Discard changes / reload</v-btn>
        </fieldset>
      </v-form>
      <v-btn v-else-if="!loading" variant="tonal" @click="load">Retry loading email settings</v-btn>
      <v-divider class="my-6" />
      <h2 class="text-h6 mb-2">Send a test email</h2>
      <div class="text-body-2 mb-3">Tests the saved settings. Save changes first, then check the recipient inbox and junk folder. Server acceptance alone does not confirm inbox delivery.</div>
      <v-form @submit.prevent="sendTest">
        <v-text-field v-model="recipient" label="Test recipient email address" type="email" required :disabled="busy" />
        <v-btn type="submit" variant="tonal" :loading="testing" :disabled="!loaded || busy || dirty || !recipient || form.provider === 'disabled'">Send test email</v-btn>
        <span v-if="dirty" class="text-caption ml-3">Save or discard changes before testing.</span>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '@/services/api';
import { errorMessage } from '@/lib/format';

const providers = [
  { title: 'SMTP — agency server or another mail provider', value: 'smtp' },
  { title: 'AWS SES', value: 'ses' },
  { title: 'Use existing server AWS SES settings', value: 'environment' },
  { title: 'Disabled', value: 'disabled' },
];
const securityOptions = [{ title: 'STARTTLS — require an encrypted upgrade', value: 'starttls' }, { title: 'TLS — encrypted from connection start', value: 'tls' }, { title: 'No encryption — internal relay only', value: 'none' }];
const authOptions = [{ title: 'IP-authorized relay — no username/password', value: 'none' }, { title: 'Username and password', value: 'password' }];
const sesAuthOptions = [{ title: 'Server credentials / IAM role', value: 'role' }, { title: 'Store AWS access keys', value: 'keys' }];
const fields = ['provider', 'fromEmail', 'fromName', 'replyTo', 'smtpHost', 'smtpPort', 'smtpSecurity', 'smtpAuth', 'smtpUsername', 'sesRegion', 'sesAuth', 'revision'];
const form = reactive({});
const status = ref({});
const loaded = ref(false), loading = ref(false), saving = ref(false), testing = ref(false);
const message = ref(''), messageType = ref('success'), recipient = ref(''), baseline = ref('');
const busy = computed(() => loading.value || saving.value || testing.value);
const dirty = computed(() => loaded.value && JSON.stringify(form) !== baseline.value);
const needsCredentials = computed(() => (form.provider === 'smtp' && form.smtpAuth === 'password') || (form.provider === 'ses' && form.sesAuth === 'keys'));
const secretHint = computed(() => status.value.credentialsStored ? 'Leave blank to keep credentials for the same saved server/account.' : 'Enter credentials supplied for this application.');
function apply(data) {
  status.value = data;
  for (const field of fields) form[field] = data[field];
  form.smtpPassword = ''; form.sesAccessKeyId = ''; form.sesSecretAccessKey = '';
  baseline.value = JSON.stringify(form); loaded.value = true;
}
function notify(text, type = 'success') { message.value = text; messageType.value = type; }
async function load() {
  if (saving.value || testing.value) return;
  loading.value = true;
  try { apply((await api.get('/system/email')).data); message.value = ''; }
  catch (error) { notify(errorMessage(error, 'Could not load email settings.'), 'error'); }
  finally { loading.value = false; }
}
async function save() {
  if (busy.value) return;
  saving.value = true;
  try { const { data } = await api.put('/system/email', { ...form }); apply(data); notify(data.message); }
  catch (error) { notify(errorMessage(error, 'Could not save email settings.'), 'error'); }
  finally { saving.value = false; }
}
async function sendTest() {
  if (busy.value || dirty.value) return;
  testing.value = true;
  try { const { data } = await api.post('/system/email/test', { recipient: recipient.value }); notify(data.message); }
  catch (error) { notify(errorMessage(error, 'Test email failed.'), 'error'); }
  finally { testing.value = false; }
}
onMounted(load);
</script>
<style scoped>
.mail-fields { border: 0; padding: 0; margin: 0; min-width: 0; }
</style>
