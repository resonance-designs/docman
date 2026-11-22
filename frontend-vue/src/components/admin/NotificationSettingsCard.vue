<template>
  <v-card class="mt-6" title="Activity notifications">
    <v-card-text>
      <v-alert v-if="message" :type="failed ? 'error' : 'success'" class="mb-4">{{ message }}</v-alert>
      <template v-if="loaded">
        <v-switch v-model="enabled" label="Send activity notifications by email" color="primary" hint="Uses Outgoing email settings. Turning off pauses queued activity emails; in-app notifications, invitations and password resets continue." persistent-hint />
        <p class="mt-4">Assignments, account roles, team/project membership, review tasks and document workflow changes notify affected users. Emails contain a sign-in link, not document contents. Review reminders are checked hourly.</p>
        <p class="mt-3">Pending: {{ counts.pending || 0 }} · Sending: {{ counts.sending || 0 }} · Sent: {{ counts.sent || 0 }} · Failed: {{ counts.failed || 0 }} · Skipped: {{ counts.skipped || 0 }}</p>
        <v-btn class="mt-3 mr-2" :disabled="busy" @click="save">Save notification settings</v-btn>
        <v-btn class="mt-3 mr-2" :disabled="busy || !counts.failed" @click="retry">Retry failed emails</v-btn>
      </template>
      <v-btn class="mt-3" :disabled="busy" variant="text" @click="load">Refresh status</v-btn>
    </v-card-text>
  </v-card>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@/services/api';
const enabled = ref(true), counts = ref({}), loaded = ref(false), busy = ref(false), failed = ref(false), message = ref('');
function error(e) { failed.value = true; message.value = e.response?.data?.message || 'Notification settings unavailable.'; }
async function load() { busy.value = true; try { const { data } = await api.get('/system/notifications'); enabled.value = data.enabled; counts.value = data.counts; loaded.value = true; } catch(e) { error(e); } finally { busy.value = false; } }
async function save() { busy.value = true; try { await api.put('/system/notifications', { enabled: enabled.value }); failed.value = false; message.value = 'Notification settings saved.'; } catch(e) { error(e); } finally { busy.value = false; } }
async function retry() { busy.value = true; try { message.value = (await api.post('/system/notifications/retry')).data.message; failed.value = false; } catch(e) { error(e); } finally { busy.value = false; } await load(); }
onMounted(load);
</script>
