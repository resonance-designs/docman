<template>
  <v-card class="mt-6" title="Public document sharing">
    <v-card-text>
      <v-alert v-if="message" :type="failed ? 'error' : 'success'" class="mb-4">{{ message }}</v-alert>
      <template v-if="loaded">
        <v-switch v-model="enabled" label="Allow public document sharing" color="primary" :disabled="busy" hint="When off, users cannot create or replace public links." persistent-hint />
        <div class="ml-6">
          <v-switch v-model="disableExistingLinks" label="Disable existing public links while sharing is off" color="primary" :disabled="busy" persistent-hint hint="When enabled, turning sharing off also blocks existing public pages and downloads. Turning sharing back on restores those links." />
        </div>
        <p class="mt-3">If the second switch is off, existing links keep working even when new public sharing is disabled. Individual links can still be permanently revoked on their document. Downloaded copies and downloads already in progress cannot be recalled.</p>
        <v-btn class="mt-4" :loading="busy" @click="save">Save public sharing settings</v-btn>
      </template>
      <v-btn v-else :loading="busy" @click="load">Load settings</v-btn>
    </v-card-text>
  </v-card>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import { api } from '@/services/api';
const enabled = ref(true), disableExistingLinks = ref(true), loaded = ref(false), busy = ref(false), failed = ref(false), message = ref('');
async function load() {
  busy.value = true;
  try { const { data } = await api.get('/system/public-sharing'); enabled.value = data.enabled; disableExistingLinks.value = data.disableExistingLinks; loaded.value = true; }
  catch { failed.value = true; message.value = 'Unable to load public sharing settings.'; }
  finally { busy.value = false; }
}
async function save() {
  busy.value = true;
  try { await api.put('/system/public-sharing', { enabled: enabled.value, disableExistingLinks: disableExistingLinks.value }); failed.value = false; message.value = 'Public sharing settings saved.'; }
  catch (e) { failed.value = true; message.value = e.response?.data?.message || 'Unable to save settings.'; }
  finally { busy.value = false; }
}
onMounted(load);
</script>
