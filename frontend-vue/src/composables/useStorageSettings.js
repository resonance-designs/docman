import { ref } from 'vue';
import { api } from '@/services/api';

// Shared, lightly cached view of the server's document storage settings (max upload size, encryption at rest).
const settings = ref(null);
let pending = null;

export function useStorageSettings() {
  async function load(force = false) {
    if (settings.value && !force) return settings.value;
    if (!pending || force) {
      pending = api.get('/system/storage')
        .then((response) => { settings.value = response.data; return settings.value; })
        .catch(() => settings.value)
        .finally(() => { pending = null; });
    }
    return pending;
  }

  /** Returns an error message when the file exceeds the configured limit, otherwise ''. */
  function sizeError(file) {
    const limit = settings.value?.maxUploadMB;
    if (!file || !limit) return '';
    return file.size > limit * 1024 * 1024 ? `This file is larger than the ${limit} MB upload limit.` : '';
  }

  return { settings, load, sizeError };
}
