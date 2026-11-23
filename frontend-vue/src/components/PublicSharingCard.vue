<template>
  <v-card class="mb-4" title="Public sharing">
    <v-card-text>
      <v-alert v-if="error" type="error" class="mb-3">{{ error }}<v-btn v-if="!loaded" variant="text" :loading="loading" @click="load">Retry</v-btn></v-alert>
      <v-alert v-if="loaded && !policy.enabled" type="info" class="mb-3">Public sharing is disabled by a superadmin. {{ policy.disableExistingLinks ? 'Existing links are unavailable until sharing is enabled again.' : 'Existing links continue to work; new links cannot be created.' }}</v-alert>
      <p class="mb-3">Anyone with this link can download the current published file without signing in. New approved versions become available through the same link. Assignments, drafts, and audit history remain private.</p>
      <p v-if="loaded && !enabled" class="mb-3">This document is private. Enabling sharing creates a public link.</p>
      <template v-if="enabled">
        <v-text-field :model-value="link" label="Public document link" readonly />
        <v-btn class="mr-3 mb-3" @click="copy">{{ copied ? 'Copied' : 'Copy link' }}</v-btn>
        <p class="mb-3">Disabling sharing revokes this link. It cannot recall files already downloaded. No file is available until a version is published.</p>
      </template>
      <v-btn :disabled="loading || busy || !loaded || (!enabled && !policy.enabled)" :loading="busy" :color="enabled ? 'error' : 'primary'" @click="toggle">{{ enabled ? 'Disable public sharing' : 'Enable public sharing' }}</v-btn>
    </v-card-text>
  </v-card>
</template>
<script setup>
import { computed, watch, ref } from 'vue';
import { api } from '@/services/api';
import { getRuntimeConfig } from '@/runtime/config';
const props = defineProps({ documentId: { type: String, required: true } });
const loaded = ref(false);
let generation = 0;
const policy = ref({ enabled: true, disableExistingLinks: true });
const enabled = ref(false), token = ref(''), error = ref(''), busy = ref(false), loading = ref(true), copied = ref(false);
const link = computed(() => {
  const base = String(getRuntimeConfig().routerBase || '/').replace(/^\/+|\/+$/g, '');
  return `${window.location.origin}/${base ? `${base}/` : ''}public/documents/${token.value}`;
});
function apply(data) { if (data.policy) policy.value = data.policy; enabled.value = data.enabled; token.value = data.token || ''; copied.value = false; }
async function load() {
  const current = ++generation;
  loading.value = true; loaded.value = false; enabled.value = false; token.value = ''; error.value = '';
  try { const { data } = await api.get(`/docs/${props.documentId}/sharing`); if (current === generation) { apply(data); loaded.value = true; } }
  catch { if (current === generation) error.value = 'Unable to load sharing settings.'; }
  finally { if (current === generation) loading.value = false; }
}
watch(() => props.documentId, load, { immediate: true });
async function toggle() {
  if (busy.value || !loaded.value) return;
  const current = generation;
  busy.value = true; error.value = '';
  try { const { data } = await api.put(`/docs/${props.documentId}/sharing`, { enabled: !enabled.value }); if (current === generation) apply(data); }
  catch (e) { if (current === generation) error.value = e.response?.data?.message || 'Unable to change public sharing.'; }
  finally { busy.value = false; }
}
async function copy() { try { await navigator.clipboard.writeText(link.value); copied.value = true; } catch { error.value = 'Select and copy the link manually.'; } }
</script>
