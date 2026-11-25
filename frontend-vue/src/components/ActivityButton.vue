<template>
  <v-btn :icon="compact ? true : undefined" variant="text" to="/notifications" :aria-label="label" :title="label">
    <v-badge :model-value="count > 0" :content="count > 99 ? '99+' : count" color="error">
      <v-icon icon="mdi-bell-outline" />
    </v-badge>
    <span v-if="!compact" class="ml-3">Activity</span>
  </v-btn>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
defineProps({ compact: Boolean });
const { state } = useAuth();
const route = useRoute(), count = ref(0);
const label = computed(() => count.value ? `Activity, ${count.value} unread notifications` : 'Activity');
let timer, pending = false, disposed = false;
async function refresh() {
  if (pending || disposed || document.hidden) return;
  pending = true;
  const token = state.token;
  try {
    const { data } = await api.get('/notifications/unread-count');
    if (!disposed && token === state.token) count.value = Number.isSafeInteger(data.count) && data.count >= 0 ? data.count : 0;
  } catch { /* A failed badge refresh must not interrupt the current page. */ }
  finally { pending = false; }
}
watch(() => route.fullPath, refresh);
watch(() => state.token, () => { count.value = 0; if (state.token) void refresh(); });
onMounted(() => {
  void refresh(); timer = setInterval(refresh, 30000);
  window.addEventListener('docman:notifications-changed', refresh);
  document.addEventListener('visibilitychange', refresh);
});
onUnmounted(() => {
  disposed = true; clearInterval(timer);
  window.removeEventListener('docman:notifications-changed', refresh);
  document.removeEventListener('visibilitychange', refresh);
});
</script>
