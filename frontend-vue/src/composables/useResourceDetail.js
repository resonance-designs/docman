import { ref } from 'vue';
import { api } from '@/services/api';

export function useResourceDetail(endpointFactory) {
  const item = ref(null);
  const loading = ref(false);
  const error = ref('');

  async function load(id) {
    loading.value = true;
    error.value = '';

    try {
      const response = await api.get(endpointFactory(id));
      item.value = response.data;
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Could not load this item.';
      item.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    item,
    loading,
    error,
    load,
  };
}

