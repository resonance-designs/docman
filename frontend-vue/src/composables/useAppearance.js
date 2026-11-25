import { ref, readonly } from 'vue';
import { api } from '@/services/api';
import { defaultAppearance, safeAppearance } from '@/lib/appearance';
const appearance = ref(safeAppearance(defaultAppearance));
let revision = 0;
export function useAppearance() {
  async function loadAppearance() {
    const started = ++revision;
    const { data } = await api.get('/system/appearance');
    if (started === revision) appearance.value = safeAppearance(data.settings);
    return data;
  }
  function applyAppearance(settings) {
    revision += 1;
    appearance.value = safeAppearance(settings);
  }
  return { appearance: readonly(appearance), loadAppearance, applyAppearance };
}
