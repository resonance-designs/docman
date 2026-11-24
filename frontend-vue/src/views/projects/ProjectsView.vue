<template>
  <v-container class="py-8" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div><div class="text-overline text-primary">Organize your work</div><h1 class="text-h4 font-weight-bold">Projects</h1><p class="text-body-1 text-medium-emphasis mt-2">Manage delivery work, collaborators, and linked resources.</p></div>
      <v-btn v-if="canCreate" color="primary" prepend-icon="mdi-plus" @click="openEditor()">Create project</v-btn>
    </div>
    <v-alert v-if="message" :type="relationshipsPending ? 'warning' : 'success'" class="mb-4" closable @click:close="message = ''">{{ message }}</v-alert>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }} <v-btn variant="text" @click="load">Retry</v-btn></v-alert>
    <v-card>
      <v-card-text><v-row align="center"><v-col cols="12" md="6"><v-text-field v-model="search" label="Search projects" prepend-inner-icon="mdi-magnify" clearable hide-details /></v-col><v-col cols="6" md="3"><v-select v-model="statusFilter" :items="projectStatuses" label="Status" clearable hide-details /></v-col><v-col cols="6" md="3"><v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="load">Refresh</v-btn></v-col></v-row></v-card-text>
      <v-data-table :headers="headers" :items="filteredProjects" :loading="loading" :items-per-page="10" item-value="_id" :items-per-page-options="[10,25,50]">
        <template #item.name="{ item }"><strong>{{ item.name }}</strong><div class="text-caption text-medium-emphasis project-description">{{ item.description || 'No description' }}</div></template>
        <template #item.status="{ item }"><v-chip size="small" :color="statusColor(item.status)">{{ item.status }}</v-chip></template>
        <template #item.teams="{ item }">{{ (item.teams || []).map(team => team.name || entityId(team)).join(', ') || 'No teams' }}</template>
        <template #item.actions="{ item }"><v-btn variant="text" size="small" :aria-label="`Open project ${item.name}`" @click="openProject(item._id)">Open</v-btn></template>
        <template #no-data><div class="py-8 text-center"><v-icon size="40" color="primary">mdi-briefcase-outline</v-icon><p class="mt-3">{{ search || statusFilter ? 'No projects match these filters.' : 'No projects are available yet.' }}</p><v-btn v-if="canCreate && !search && !statusFilter" class="mt-3" variant="tonal" @click="openEditor()">Create your first project</v-btn></div></template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="detailOpen" max-width="1120" scrollable :persistent="busy">
      <v-card>
        <v-card-title class="d-flex flex-wrap justify-space-between align-center ga-3"><span class="text-h5 project-heading">{{ selected?.name || 'Project details' }}</span><v-btn icon="mdi-close" variant="text" aria-label="Close project" :disabled="busy" @click="detailOpen = false" /></v-card-title>
        <v-card-text>
          <v-progress-linear v-if="detailLoading" indeterminate />
          <v-alert v-if="detailError" type="error" class="mb-4">{{ detailError }} <v-btn variant="text" :disabled="busy" @click="refreshSelected()">Retry</v-btn></v-alert>
          <template v-if="selected && !detailLoading">
            <div class="d-flex flex-wrap ga-2 mb-3"><v-chip :color="statusColor(selected.status)" size="small">{{ selected.status }}</v-chip><v-chip size="small" variant="outlined">{{ selected.priority }} priority</v-chip><v-chip v-for="tag in selected.tags || []" :key="tag" size="small">{{ tag }}</v-chip></div>
            <p class="mb-4">{{ selected.description || 'No description provided.' }}</p>
            <v-row class="mb-3"><v-col cols="12" sm="4"><div class="text-caption text-medium-emphasis">Owner</div>{{ personName(selected.owner) }}</v-col><v-col cols="6" sm="4"><div class="text-caption text-medium-emphasis">Start date</div>{{ dateLabel(selected.startDate) }}</v-col><v-col cols="6" sm="4"><div class="text-caption text-medium-emphasis">End date</div>{{ dateLabel(selected.endDate) }}</v-col></v-row>
            <div class="mb-4"><strong class="mr-2">Linked teams</strong><v-chip v-for="team in selected.teams || []" :key="entityId(team)" class="mr-2 mb-2" size="small">{{ team.name || entityId(team) }}</v-chip></div>
            <div class="d-flex ga-2 mb-4"><v-btn v-if="permissions.manage" variant="tonal" :disabled="busy" prepend-icon="mdi-pencil-outline" @click="openEditor(selected)">Edit project</v-btn><v-btn v-if="permissions.delete" color="error" variant="text" :disabled="busy" @click="confirmAction = { kind: 'project', name: selected.name }">Delete project</v-btn></div>
            <v-alert type="info" variant="tonal" class="mb-4">Linking a document or book organizes it here. Document access still depends on the document's own assignments or public sharing.</v-alert>
            <v-tabs v-model="tab"><v-tab value="people">Collaborators</v-tab><v-tab value="documents">Documents</v-tab><v-tab value="books">Books</v-tab></v-tabs>
            <v-divider class="mb-4" />
            <template v-if="tab === 'people'">
              <v-alert v-if="sectionErrors.people" type="warning" class="mb-3">{{ sectionErrors.people }}</v-alert>
              <v-form v-if="permissions.manage" class="mb-4" @submit.prevent="addCollaborator">
                <v-row align="center"><v-col cols="12" md="6"><v-autocomplete v-model="collaboratorId" :items="availablePeople" :item-title="personOption" item-value="_id" label="Add a collaborator" clearable :disabled="busy" hint="Only members of a linked team can be added. Add them to a team first if needed." persistent-hint /></v-col><v-col cols="7" md="3"><v-select v-model="collaboratorRole" :items="collaboratorRoles" label="Project role" :disabled="busy" /></v-col><v-col cols="5" md="3"><v-btn type="submit" color="primary" :disabled="busy || !collaboratorId" :loading="busy">Add</v-btn></v-col></v-row>
              </v-form>
              <v-data-table :headers="peopleHeaders" :items="people" :items-per-page="10" :items-per-page-options="[10,25,50]" item-value="_id">
                <template #item.name="{ item }">{{ personName(item) }}<div class="text-caption text-medium-emphasis">{{ item.email }}</div></template>
                <template #item.source="{ item }"><v-chip size="small" variant="tonal">{{ entityId(item) === entityId(selected.owner) ? 'Owner' : item.isDirect ? 'Direct collaborator' : `Team: ${item.teamName || 'member'}` }}</v-chip></template>
                <template #item.role="{ item }"><v-select v-if="permissions.manage && item.isDirect && entityId(item) !== entityId(selected.owner)" :model-value="item.role" :items="collaboratorRoles" :aria-label="`Project role for ${personName(item)}`" density="compact" hide-details :disabled="busy" style="min-width: 140px" @update:model-value="changeRole(item, $event)" /><span v-else>{{ item.role }}</span></template>
                <template #item.actions="{ item }"><v-btn v-if="item.isDirect && entityId(item) !== entityId(selected.owner) && (permissions.manage || entityId(item) === userId)" color="error" variant="text" size="small" :disabled="busy" @click="confirmAction = { kind: 'person', item, name: personName(item) }">{{ entityId(item) === userId ? 'Leave project' : 'Remove' }}</v-btn><span v-else-if="!item.isDirect" class="text-caption">Managed in Teams</span></template>
                <template #no-data>No collaborators to display.</template>
              </v-data-table>
            </template>
            <template v-else>
              <v-alert v-if="sectionErrors[tab]" type="warning" class="mb-3">{{ sectionErrors[tab] }}</v-alert>
              <v-form v-if="permissions.manage" @submit.prevent="addResources(tab)">
                <v-row align="center"><v-col cols="12" md="9"><v-autocomplete v-model="resourceSelection[tab]" :items="availableResources[tab]" item-title="title" item-value="_id" multiple chips closable-chips clearable :label="`Select ${tab} to link`" :disabled="busy" /></v-col><v-col cols="12" md="3"><v-btn type="submit" color="primary" :disabled="busy || !resourceSelection[tab]?.length">Link {{ tab }}</v-btn></v-col></v-row>
              </v-form>
              <v-data-table :headers="resourceHeaders" :items="resources[tab]" :items-per-page="10" :items-per-page-options="[10,25,50]" item-value="_id">
                <template #item.title="{ item }">{{ item.title || 'Untitled' }}</template>
                <template #item.actions="{ item }"><v-btn v-if="tab === 'documents'" :to="`/documents/${item._id}`" size="small" variant="text">Open document</v-btn><v-btn v-if="permissions.manage" :disabled="busy" color="error" size="small" variant="text" @click="confirmAction = { kind: tab, item, name: item.title }">Unlink</v-btn></template>
                <template #no-data>No {{ tab }} linked or available to your account.</template>
              </v-data-table>
            </template>
          </template>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="busy" @click="detailOpen = false">Close</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editorOpen" max-width="800" scrollable :persistent="saving">
      <v-card :title="editingId ? 'Edit project' : 'Create project'">
        <v-card-text>
          <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
          <v-progress-linear v-if="choicesLoading" indeterminate class="mb-4" />
          <v-form id="project-editor" @submit.prevent="saveProject">
            <v-text-field v-model="form.name" label="Project name" required maxlength="100" counter :disabled="saving" />
            <v-textarea v-model="form.description" label="Description" maxlength="1000" counter rows="3" :disabled="saving" />
            <v-autocomplete v-model="form.teamIds" :items="teamOptions" item-title="name" item-value="_id" label="Linked teams" multiple chips closable-chips required :disabled="saving || choicesLoading" hint="Choose at least one team. Linking a team does not grant access to its documents." persistent-hint class="mb-4" />
            <v-row><v-col cols="12" sm="6"><v-select v-model="form.status" label="Status" :items="projectStatuses" :disabled="saving" /></v-col><v-col cols="12" sm="6"><v-select v-model="form.priority" label="Priority" :items="projectPriorities" :disabled="saving" /></v-col></v-row>
            <v-row><v-col cols="12" sm="6"><v-text-field v-model="form.startDate" label="Start date" type="date" :disabled="saving" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.endDate" label="End date" type="date" :min="form.startDate || undefined" :disabled="saving" /></v-col></v-row>
            <v-text-field v-model="form.tagsText" label="Tags" hint="Separate tags with commas. Maximum 50 characters per tag." persistent-hint :disabled="saving" />
            <p v-if="!editingId" class="text-caption mt-4">You will own the new project. Add collaborators, books and documents after creating it.</p>
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="editorOpen = false">Cancel</v-btn><v-btn form="project-editor" type="submit" color="primary" :loading="saving" :disabled="choicesLoading || choicesFailed">{{ editingId ? 'Save changes' : 'Create project' }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog :model-value="Boolean(confirmAction)" max-width="520" :persistent="busy" @update:model-value="value => { if (!value) confirmAction = null; }">
      <v-card :title="confirmAction?.kind === 'project' ? 'Delete project?' : confirmAction?.kind === 'person' ? 'Remove collaborator?' : 'Unlink resource?'">
        <v-card-text><p class="mb-3"><strong>{{ confirmAction?.name }}</strong></p><p>{{ confirmAction?.kind === 'project' ? 'This permanently deletes the project workspace and its associations. The linked documents, books, teams and user accounts are not deleted.' : confirmAction?.kind === 'person' ? 'This removes the direct project assignment. Access through a linked team or separate document assignment may remain.' : 'This removes the association only. The original resource and its document permissions stay unchanged.' }}</p><v-alert v-if="actionError" type="error" class="mt-3">{{ actionError }}</v-alert></v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="busy" @click="confirmAction = null">Cancel</v-btn><v-btn color="error" :loading="busy" @click="confirmMutation">Confirm</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
import { personName } from '@/lib/people';
import { relationshipMessage } from '@/lib/relationshipMessage';
import { entityId, projectPermissions, projectPayload, projectStatuses, projectPriorities, collaboratorRoles } from './projectManagement';
const { state } = useAuth();
const userId = computed(() => entityId(state.user));
const canCreate = computed(() => projectPermissions(null, state.user).create);
const permissions = computed(() => projectPermissions(selected.value, state.user));
const projects = ref([]), loading = ref(false), error = ref(''), message = ref(''), search = ref(''), statusFilter = ref(null);
const relationshipsPending = ref(false);
const selectedId = ref(null);
const selected = ref(null), detailOpen = ref(false), detailLoading = ref(false), detailError = ref(''), tab = ref('people'), busy = ref(false);
const people = ref([]), availablePeople = ref([]), collaboratorId = ref(null), collaboratorRole = ref('contributor');
const resources = reactive({documents:[],books:[]}), availableResources = reactive({documents:[],books:[]}), resourceSelection = reactive({documents:[],books:[]}), sectionErrors = reactive({people:'',documents:'',books:''});
const editorOpen = ref(false), editingId = ref(null), saving = ref(false), formError = ref(''), choicesLoading = ref(false), choicesFailed = ref(false), teamOptions = ref([]);
const form = reactive({name:'',description:'',teamIds:[],status:'active',priority:'medium',startDate:'',endDate:'',tagsText:''});
const confirmAction = ref(null), actionError = ref('');
const headers = [{title:'Project',key:'name'},{title:'Status',key:'status'},{title:'Priority',key:'priority'},{title:'Teams',key:'teams',sortable:false},{title:'Actions',key:'actions',sortable:false}];
const peopleHeaders = [{title:'Person',key:'name'},{title:'Access source',key:'source'},{title:'Role',key:'role'},{title:'Actions',key:'actions',sortable:false}];
const resourceHeaders = [{title:'Title',key:'title'},{title:'Actions',key:'actions',sortable:false}];
const filteredProjects = computed(() => projects.value.filter(item => (!statusFilter.value || item.status === statusFilter.value) && `${item.name} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes((search.value || '').toLowerCase())));
const arrayOf = (data, key) => Array.isArray(data) ? data : data?.[key] || [];
const describeError = (e, fallback) => e.response?.data?.errors?.join('; ') || e.response?.data?.message || fallback;
const dateInput = value => value ? String(value).slice(0,10) : '';
const dateLabel = value => dateInput(value) || 'Not set';
const personOption = person => `${personName(person)}${person.email ? ` (${person.email})` : ''}`;
const statusColor = status => ({active:'success',completed:'primary','on-hold':'warning',archived:'grey'}[status] || 'primary');
let detailGeneration = 0;
let editorGeneration = 0, originalTeamIds = [];
watch(editorOpen, value => { if (!value) editorGeneration++; }, { flush: 'sync' });
watch(confirmAction,()=>{ actionError.value=''; });
watch(detailOpen, value => { if (!value) detailGeneration++; });
async function load() {
 loading.value=true;error.value='';
 try { projects.value=arrayOf((await api.get(state.user?.role === 'viewer' ? '/projects/my-projects' : '/projects')).data,'projects'); }
 catch(e){ error.value=describeError(e,'Could not load projects.'); }
 finally {loading.value=false;}
}
async function openProject(id) {
 selectedId.value=id; detailOpen.value=true; selected.value=null; tab.value='people'; collaboratorId.value=null; resourceSelection.documents=[];resourceSelection.books=[];
 await refreshSelected(id);
}
async function refreshSelected(id = selectedId.value) {
 if(!id)return;
 const generation=++detailGeneration;detailLoading.value=true;detailError.value='';
 try {
  const {data}=await api.get(`/projects/${id}`);
  if(generation!==detailGeneration)return;
  selected.value=data;
  await loadSections(id,generation);
 }catch(e){ if(generation===detailGeneration)detailError.value=describeError(e,'Could not load project details.'); }
 finally {if(generation===detailGeneration)detailLoading.value=false;}
}
async function loadSections(id,generation) {
 for(const key of ['people','documents','books'])sectionErrors[key]='';
 const jobs=[['people',`/projects/${id}/collaborators`],['documents',`/projects/${id}/documents`],['books',`/projects/${id}/books`]];
 if(permissions.value.manage)jobs.push(['availablePeople',`/projects/${id}/available-collaborators`],['availableDocuments',`/projects/${id}/available-documents`],['availableBooks',`/projects/${id}/available-books`]);
 const results=await Promise.allSettled(jobs.map(([,url])=>api.get(url)));
 if(generation!==detailGeneration)return;
 people.value=[];availablePeople.value=[];resources.documents=[];resources.books=[];availableResources.documents=[];availableResources.books=[];
 results.forEach((result,index)=>{
  const key=jobs[index][0];
  if(result.status==='rejected'){sectionErrors[key.toLowerCase().includes('people')?'people':key.toLowerCase().includes('document')?'documents':'books']=describeError(result.reason,'This section could not be loaded. Refresh to retry.');return;}
  const rows=arrayOf(result.value.data,key);
  if(key==='people')people.value=rows;else if(key==='availablePeople')availablePeople.value=rows;else if(key==='availableDocuments')availableResources.documents=rows;else if(key==='availableBooks')availableResources.books=rows;else resources[key]=rows;
 });
}
async function openEditor(project=null) {
 const generation=++editorGeneration;
 originalTeamIds=(project?.teams || []).map(entityId);
 editingId.value=project?._id || null;formError.value='';editorOpen.value=true;choicesFailed.value=false;
 Object.assign(form,{name:project?.name || '',description:project?.description || '',teamIds:(project?.teams || []).map(entityId),status:project?.status || 'active',priority:project?.priority || 'medium',startDate:dateInput(project?.startDate),endDate:dateInput(project?.endDate),tagsText:(project?.tags || []).join(', ')});
 choicesLoading.value=true;
 try {
  const response=await api.get(['admin','superadmin'].includes(state.user?.role)?'/teams':'/teams/my-teams');
  if(generation!==editorGeneration)return;
  const options=arrayOf(response.data,'teams');
  teamOptions.value=[...new Map([...options,...(project?.teams || []).filter(team=>team?._id)].map(team=>[entityId(team),team])).values()];
 }catch(e){if(generation===editorGeneration){choicesFailed.value=true;formError.value=describeError(e,'Could not load teams. Close this dialog and retry.');}}
 finally{if(generation===editorGeneration)choicesLoading.value=false;}
}
async function saveProject() {
 formError.value='';let payload;
 try {payload=projectPayload(form,editingId.value?originalTeamIds:null);}catch(e){formError.value=e.message;return;}
 saving.value=true;
 try {
  const response=editingId.value?await api.put(`/projects/${editingId.value}`,payload):await api.post('/projects',payload);
  const id=editingId.value || response.data.project?._id;
  editorOpen.value=false;relationshipsPending.value=Boolean(response.data.relationshipsPending);message.value=relationshipMessage(response.data,editingId.value?'Project updated.':'Project created.');await load();if(id)await openProject(id);
 }catch(e){formError.value=describeError(e,'Could not save project.');}
 finally{saving.value=false;}
}
async function mutate(fn, success) {
 busy.value=true;detailError.value='';
 try{const response=await fn();await refreshSelected();await load();relationshipsPending.value=Boolean(response?.data?.relationshipsPending);message.value=relationshipMessage(response?.data,success);return true;}
 catch(e){detailError.value=describeError(e,'The change could not be saved.');return false;}
 finally{busy.value=false;}
}
async function addCollaborator(){if(!collaboratorId.value)return;if(await mutate(()=>api.post(`/projects/${selected.value._id}/collaborators`,{collaboratorId:collaboratorId.value,role:collaboratorRole.value}),'Collaborator added.'))collaboratorId.value=null;}
async function changeRole(person,role){if(role===person.role)return;await mutate(()=>api.put(`/projects/${selected.value._id}/collaborators/${entityId(person)}/role`,{role}),'Collaborator role updated.');}
async function addResources(kind){const ids=resourceSelection[kind];if(!ids?.length)return;if(await mutate(()=>api.post(`/projects/${selected.value._id}/${kind}`,{[kind==='books'?'bookIds':'documentIds']:ids}),`${kind === 'books' ? 'Books' : 'Documents'} linked.`))resourceSelection[kind]=[];}
async function confirmMutation(){
 const action=confirmAction.value;if(!action)return;busy.value=true;actionError.value='';
 try{
  const id=selected.value._id;
  relationshipsPending.value=false;
  if(action.kind==='project'){const response=await api.delete(`/projects/${id}`);detailOpen.value=false;selected.value=null;relationshipsPending.value=Boolean(response.data.relationshipsPending);message.value=relationshipMessage(response.data,'Project deleted. Linked resources were retained.');}
  else if(action.kind==='person'){
   await api.delete(`/projects/${id}/collaborators/${entityId(action.item)}`);
   if(entityId(action.item)===userId.value){detailOpen.value=false;selected.value=null;}else await refreshSelected(id);
   message.value='Direct collaborator removed.';
  }else {await api.delete(`/projects/${id}/${action.kind}`,{data:{[action.kind==='books'?'bookIds':'documentIds']:[entityId(action.item)]}});await refreshSelected(id);message.value='Resource unlinked.';}
  confirmAction.value=null;await load();
 }catch(e){actionError.value=describeError(e,'The change could not be completed.');}
 finally{busy.value=false;}
}
onMounted(load);
</script>
<style scoped>
.project-description { max-width: 36rem; white-space: normal; }
.project-heading { overflow-wrap: anywhere; }
</style>
