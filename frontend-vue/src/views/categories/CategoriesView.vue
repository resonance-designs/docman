<template>
  <v-container class="py-8" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div><div class="text-overline text-primary">Classification</div><h1 class="text-h4 font-weight-bold">Categories</h1><p class="text-medium-emphasis mt-2">Organize documents and books with clear, consistent labels.</p></div>
      <v-btn v-if="canManage" color="primary" prepend-icon="mdi-plus" @click="openEditor()">Create category</v-btn>
    </div>
    <v-alert v-if="message" type="success" class="mb-4" closable @click:close="message = ''">{{ message }}</v-alert>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }} <v-btn variant="text" @click="load">Retry</v-btn></v-alert>
    <v-card>
      <v-card-text><v-row align="center"><v-col cols="12" sm="5"><v-select v-model="type" :items="['Document', 'Book']" label="Category type" clearable hide-details @update:model-value="page = 1; load()" /></v-col><v-col cols="12" sm="5"><v-text-field v-model="search" label="Search this page" prepend-inner-icon="mdi-magnify" clearable hide-details /></v-col><v-col cols="12" sm="2"><v-btn variant="text" :loading="loading" @click="load">Refresh</v-btn></v-col></v-row></v-card-text>
      <v-progress-linear v-if="loading" indeterminate />
      <v-table><thead><tr><th>Name</th><th>Type</th><th>Description</th><th v-if="canManage" class="text-right">Actions</th></tr></thead><tbody>
        <tr v-for="item in filtered" :key="item._id"><td class="font-weight-medium">{{ item.name }}</td><td><v-chip size="small" variant="tonal">{{ item.type }}</v-chip></td><td class="category-description">{{ item.description || 'No description' }}</td><td v-if="canManage" class="text-right text-no-wrap"><v-btn size="small" variant="text" :aria-label="`Edit ${item.name}`" @click="openEditor(item)">Edit</v-btn><v-btn size="small" variant="text" color="error" :aria-label="`Delete ${item.name}`" @click="deleteTarget = item; deleteError = ''">Delete</v-btn></td></tr>
        <tr v-if="!loading && !filtered.length"><td :colspan="canManage ? 4 : 3" class="py-8 text-center">{{ search ? 'No categories match on this page. Clear search or try another page.' : 'No categories found. Create a category to get started.' }}</td></tr>
      </tbody></v-table>
      <v-card-actions class="flex-wrap"><span class="text-caption ml-2">{{ total }} categories · page {{ page }} of {{ pages }}</span><v-spacer /><v-pagination v-model="page" :length="pages" :disabled="loading" total-visible="5" @update:model-value="load" /></v-card-actions>
    </v-card>
    <v-dialog v-model="editorOpen" max-width="600" :persistent="saving"><v-card :title="editing ? 'Edit category' : 'Create category'"><v-form @submit.prevent="save"><v-card-text>
      <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
      <v-text-field v-model="form.name" label="Name" required maxlength="100" :disabled="saving" />
      <v-select v-model="form.type" label="Category type" :items="['Document','Book']" :disabled="saving" />
      <v-textarea v-model="form.description" label="Description (optional)" maxlength="1000" counter :disabled="saving" />
      <p class="text-caption">Book categories appear in book forms; Document categories appear in document forms. Referenced categories may need their items reassigned before changing type or deleting.</p>
    </v-card-text><v-card-actions><v-spacer /><v-btn :disabled="saving" @click="editorOpen = false">Cancel</v-btn><v-btn color="primary" type="submit" :loading="saving">{{ editing ? 'Save changes' : 'Create category' }}</v-btn></v-card-actions></v-form></v-card></v-dialog>
    <v-dialog :model-value="Boolean(deleteTarget)" max-width="500" :persistent="saving" @update:model-value="!$event && (deleteTarget = null)"><v-card title="Delete category?"><v-card-text><v-alert v-if="deleteError" type="error" class="mb-4">{{ deleteError }}</v-alert><p>Delete <strong>{{ deleteTarget?.name }}</strong>? Reassign any documents or books that use this category first. This removes the classification, not their files.</p></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="saving" @click="deleteTarget = null">Cancel</v-btn><v-btn color="error" :loading="saving" @click="remove">Delete category</v-btn></v-card-actions></v-card></v-dialog>
  </v-container>
</template>
<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
const { hasRole } = useAuth();
const canManage = computed(() => hasRole(['admin','superadmin']));
const items = ref([]), page = ref(1), total = ref(0), pages = ref(1), type = ref(null), search = ref('');
const loading = ref(false), saving = ref(false), error = ref(''), message = ref(''), formError = ref(''), deleteError = ref('');
const editorOpen = ref(false), editing = ref(null), deleteTarget = ref(null);
const form = reactive({ name: '', type: 'Document', description: '' });
const filtered = computed(() => items.value.filter(item => `${item.name} ${item.description || ''}`.toLowerCase().includes((search.value || '').toLowerCase())));
let request = 0;
async function load() {
  const current = ++request; loading.value = true; error.value = '';
  try { const { data } = await api.get('/categories', { params: { page: page.value, limit: 25, type: type.value || undefined } }); if (current !== request) return; items.value = data.categories || []; total.value = data.pagination?.total || 0; pages.value = Math.max(1, data.pagination?.pages || 1); if (page.value > pages.value) { page.value = pages.value; return load(); } }
  catch (e) { if (current === request) error.value = e.response?.data?.message || 'Unable to load categories.'; }
  finally { if (current === request) loading.value = false; }
}
function openEditor(item = null) { editing.value = item; Object.assign(form, { name: item?.name || '', type: item?.type || type.value || 'Document', description: item?.description || '' }); formError.value = ''; editorOpen.value = true; }
async function save() {
  if (saving.value) return; if (!form.name.trim()) { formError.value = 'Enter a category name.'; return; }
  saving.value = true; formError.value = '';
  try { const payload = { name: form.name.trim(), description: form.description.trim(), type: form.type }; if (editing.value) await api.put(`/categories/${editing.value._id}`, payload); else await api.post('/categories', payload); editorOpen.value = false; message.value = editing.value ? 'Category updated.' : 'Category created.'; await load(); }
  catch (e) { formError.value = e.response?.data?.message || 'Unable to save category.'; }
  finally { saving.value = false; }
}
async function remove() { if (saving.value || !deleteTarget.value) return; saving.value = true; deleteError.value = ''; try { await api.delete(`/categories/${deleteTarget.value._id}`); deleteTarget.value = null; message.value = 'Category deleted.'; await load(); } catch (e) { deleteError.value = e.response?.data?.message || 'Unable to delete category.'; } finally { saving.value = false; } }
onMounted(load);
</script>
<style scoped>.category-description { max-width: 500px; white-space: normal; overflow-wrap: anywhere; }</style>
