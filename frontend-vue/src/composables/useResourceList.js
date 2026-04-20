import { computed, ref } from 'vue';
import { api } from '@/services/api';

export function useResourceList(endpoint, normalizer = normalizeCollection) {
  const items = ref([]);
  const loading = ref(false);
  const error = ref('');

  const count = computed(() => items.value.length);

  async function load() {
    loading.value = true;
    error.value = '';

    try {
      const response = await api.get(endpoint);
      items.value = normalizer(response.data);
    } catch (requestError) {
      error.value = requestError.response?.data?.message || `Could not load ${endpoint}.`;
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    count,
    loading,
    error,
    load,
  };
}

export function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.documents)) {
    return payload.documents;
  }

  if (Array.isArray(payload?.docs)) {
    return payload.docs;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

