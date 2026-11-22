<template>
  <v-card variant="outlined" class="mt-5">
    <v-card-title class="d-flex align-center justify-space-between">{{ title }}<v-btn variant="text" :loading="loading" :disabled="busy" @click="load">Refresh</v-btn></v-card-title>
    <v-card-text>
      <v-alert v-if="error" type="error" class="mb-3" role="alert">{{ error }}</v-alert>
      <v-alert v-if="message" type="success" class="mb-3" role="status">{{ message }}</v-alert>
      <p v-if="kind === 'documents'" class="mb-4">Linking a document organizes it here. Its existing document permissions still control who can read it.</p>
      <v-progress-linear v-if="loading" indeterminate />
      <template v-else>
        <v-text-field v-model="search" :label="`Search linked ${kind}`" prepend-inner-icon="mdi-magnify" clearable />
        <v-list v-if="filtered.length" lines="two">
          <v-list-item v-for="item in visible" :key="item._id" :title="item.title || item.name" :subtitle="item.description || item.category?.name || ''">
            <template #append>
              <v-btn v-if="kind === 'documents'" :to="`/documents/${item._id}`" variant="text" size="small">Open</v-btn>
              <v-btn v-if="canManage" variant="text" size="small" color="error" :disabled="busy" @click="removing = item">Unlink</v-btn>
            </template>
          </v-list-item>
        </v-list>
        <p v-else class="text-medium-emphasis py-3">{{ search ? 'No linked resources match your search.' : `No ${kind} linked yet.` }}</p>
        <v-pagination v-if="pages > 1" v-model="page" :length="pages" :total-visible="5" />
        <v-form v-if="canManage" class="mt-4" @submit.prevent="add">
          <v-autocomplete v-model="selected" :items="available" :item-title="item => item.title || item.name" item-value="_id" multiple chips closable-chips clearable :label="`Link ${kind}`" :disabled="busy || Boolean(loadFailed)" no-data-text="No available resources" />
          <v-btn type="submit" color="primary" variant="tonal" :loading="busy" :disabled="!selected.length || loadFailed">Link selected {{ kind }}</v-btn>
        </v-form>
      </template>
    </v-card-text>
    <v-dialog :model-value="Boolean(removing)" max-width="500" :persistent="busy" @update:model-value="value => { if (!value) removing = null; }">
      <v-card :title="`Unlink ${removing?.title || removing?.name || 'resource'}?`">
        <v-card-text>This removes its association with the team. The resource itself is not deleted.<v-alert v-if="error" type="error" class="mt-3">{{ error }}</v-alert></v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="busy" @click="removing = null">Cancel</v-btn><v-btn color="error" :loading="busy" @click="remove">Unlink</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '@/services/api';
const props = defineProps({ teamId: { type: String, required: true }, kind: { type: String, required: true }, canManage: Boolean });
const items = ref([]), available = ref([]), selected = ref([]), loading = ref(false), busy = ref(false), error = ref(''), message = ref(''), removing = ref(null), search = ref(''), page = ref(1), loadFailed = ref(false);
const title = computed(() => props.kind[0].toUpperCase() + props.kind.slice(1));
const field = computed(() => ({ documents: 'documentIds', books: 'bookIds', projects: 'projectIds' })[props.kind]);
const filtered = computed(() => items.value.filter(item => `${item.title || item.name} ${item.description || ''}`.toLowerCase().includes((search.value || '').toLowerCase())));
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 10)));
const visible = computed(() => filtered.value.slice((page.value - 1) * 10, page.value * 10));
watch(search, () => { page.value = 1; });
watch(pages, value => { page.value = Math.min(page.value, value); });
async function load() {
  loading.value = true; error.value = ''; loadFailed.value = false;
  try {
    const results = await Promise.all([api.get(`/teams/${props.teamId}/${props.kind}`), props.canManage ? api.get(`/teams/${props.teamId}/available-${props.kind}`) : Promise.resolve({ data: [] })]);
    items.value = results[0].data.filter(Boolean); available.value = results[1].data.filter(Boolean);
  } catch (e) { loadFailed.value = true; error.value = e.response?.data?.message || `Unable to load ${props.kind}.`; items.value = []; available.value = []; }
  finally { loading.value = false; }
}
async function add() {
  if (!selected.value.length || busy.value) return;
  busy.value = true; message.value = ''; error.value = '';
  try { const result = await api.post(`/teams/${props.teamId}/${props.kind}`, { [field.value]: selected.value }); selected.value = []; message.value = result.data.message; await load(); }
  catch (e) { error.value = e.response?.data?.message || 'Unable to link resources.'; }
  finally { busy.value = false; }
}
async function remove() {
  busy.value = true; message.value = ''; error.value = '';
  try { await api.delete(`/teams/${props.teamId}/${props.kind}`, { data: { [field.value]: [removing.value._id] } }); removing.value = null; message.value = 'Resource unlinked.'; await load(); }
  catch (e) { error.value = e.response?.data?.message || 'Unable to unlink resource.'; }
  finally { busy.value = false; }
}
watch(() => props.canManage, load);
onMounted(load);
</script>
