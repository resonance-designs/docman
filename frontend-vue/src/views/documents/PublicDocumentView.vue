<template>
  <v-container style="max-width: 800px" class="py-8">
    <v-alert v-if="error" type="error">{{ error }}</v-alert>
    <v-progress-linear v-else-if="loading" indeterminate />
    <v-card v-else-if="document" :title="document.title">
      <v-card-text><p>{{ document.filename }} · Published version {{ document.version }}</p><p class="mt-3">Shared publicly. No sign-in required.</p></v-card-text>
      <v-card-actions><v-btn :href="downloadUrl" color="primary">Download published file</v-btn></v-card-actions>
    </v-card>
  </v-container>
</template>
<script setup>
import { computed, watch, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api, resolveApiBaseUrl } from '@/services/api';
const route = useRoute(), document = ref(null), loading = ref(true), error = ref('');
const path = computed(() => `/docs/public/${encodeURIComponent(route.params.token)}`);
const downloadUrl = computed(() => api.getUri({ baseURL: resolveApiBaseUrl(), url: `${path.value}/download` }));
let generation = 0;
watch(path, async value => {
  const current = ++generation;
  document.value = null; error.value = ''; loading.value = true;
  try { const { data } = await api.get(value); if (current === generation) document.value = data; }
  catch { if (current === generation) error.value = 'This public document is unavailable. Its link may have been revoked, or no version is published.'; }
  finally { if (current === generation) loading.value = false; }
}, { immediate: true });
</script>
