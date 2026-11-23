<template>
  <v-container class="py-8" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
      <div><div class="text-overline text-primary">People and shared work</div><h1 class="text-h4 font-weight-bold">{{ selectedId ? team?.name || 'Team details' : 'Teams' }}</h1><p class="text-medium-emphasis mt-2">{{ selectedId ? 'Manage membership and organize linked resources.' : 'Create teams and manage the people working together.' }}</p></div>
      <div class="d-flex ga-2">
        <v-btn v-if="selectedId" variant="text" prepend-icon="mdi-arrow-left" :disabled="busy" @click="back">All teams</v-btn>
        <v-btn :loading="loading" :disabled="busy" variant="outlined" prepend-icon="mdi-refresh" @click="refresh">Refresh</v-btn>
        <v-btn v-if="!selectedId && canCreate" color="primary" prepend-icon="mdi-plus" @click="openEditor()">Create team</v-btn>
      </div>
    </div>
    <v-alert v-if="error" type="error" class="mb-4" role="alert">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" class="mb-4" role="status" closable @click:close="message = ''">{{ message }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate />
    <template v-if="!selectedId">
      <v-card class="mb-4"><v-card-text><v-text-field v-model="search" label="Search teams" prepend-inner-icon="mdi-magnify" clearable hide-details /><div class="text-caption mt-2">{{ filtered.length }} teams available to your account</div></v-card-text></v-card>
      <v-card v-if="!loading">
        <v-card-text v-if="!filtered.length" class="py-10 text-center"><v-icon size="40" color="primary">mdi-account-group-outline</v-icon><h2 class="text-h6 mt-3">{{ search ? 'No matching teams' : 'No teams yet' }}</h2><p class="mt-2">{{ search ? 'Clear the search or try another name.' : 'Create a team or ask a team manager to add or invite you.' }}</p></v-card-text>
        <v-table v-else><thead><tr><th>Name</th><th>Owner</th><th>Members</th><th>Actions</th></tr></thead><tbody><tr v-for="item in visible" :key="item._id"><td><div class="font-weight-medium">{{ item.name }}</div><div class="text-caption team-description">{{ item.description }}</div></td><td>{{ personName(item.owner) }}</td><td>{{ item.members?.length || 0 }}</td><td><v-btn variant="text" color="primary" :aria-label="`Open team ${item.name}`" @click="openTeam(item._id)">Open</v-btn></td></tr></tbody></v-table>
        <v-pagination v-if="pages > 1" v-model="page" :length="pages" :total-visible="5" />
      </v-card>
    </template>
    <template v-else-if="team && !loading">
      <v-card class="mb-5"><v-card-text><div class="d-flex flex-wrap align-center justify-space-between ga-3"><div><p class="mb-2">{{ team.description || 'No description provided.' }}</p><span class="text-caption">Owner: {{ personName(team.owner) }}</span></div><div class="d-flex ga-2"><v-btn v-if="access.manage" variant="tonal" color="primary" :disabled="busy" @click="openEditor(team)">Edit team</v-btn><v-btn v-if="access.remove" variant="text" color="error" :disabled="busy" @click="confirm = { kind: 'team', title: `Delete ${team.name}?` }">Delete team</v-btn></div></div></v-card-text></v-card>
      <v-alert type="info" variant="tonal" class="mb-5">Team membership organizes collaboration. Private document access still comes from each document's assignments.</v-alert>
      <v-tabs v-model="tab" class="mb-4" show-arrows><v-tab value="members">Members</v-tab><v-tab v-if="access.invite || access.manage" value="invitations">Invitations</v-tab><v-tab value="documents">Documents</v-tab><v-tab value="books">Books</v-tab><v-tab value="projects">Projects</v-tab></v-tabs>
      <v-card v-if="tab === 'members'"><v-card-title>Team members</v-card-title><v-card-text>
          <v-table><thead><tr><th>Person</th><th>Team role</th><th>Actions</th></tr></thead><tbody><tr v-for="member in team.members" :key="teamId(member.user)">
            <td><div>{{ personName(member.user) }}</div><div class="text-caption">{{ member.user?.email }}</div></td>
            <td><v-chip v-if="teamId(member.user) === teamId(team.owner)" size="small">Owner</v-chip><v-select v-else-if="access.manage" :model-value="member.role" :items="roles" :aria-label="`Team role for ${personName(member.user)}`" density="compact" hide-details class="team-role" :disabled="busy" @update:model-value="value => updateRole(member, value)" /><span v-else>{{ member.role === 'admin' ? 'Team admin' : 'Member' }}</span></td>
            <td><v-btn v-if="teamId(member.user) !== teamId(team.owner) && (access.manage || teamId(member.user) === currentId)" color="error" variant="text" :disabled="busy" @click="confirm = { kind: 'member', member, title: teamId(member.user) === currentId ? 'Leave this team?' : `Remove ${personName(member.user)}?` }">{{ teamId(member.user) === currentId ? 'Leave team' : 'Remove' }}</v-btn></td>
          </tr></tbody></v-table>
          <v-form v-if="access.manage" class="mt-6" @submit.prevent="addMember">
            <h2 class="text-h6 mb-3">Add an existing user</h2><v-alert v-if="userError" type="error" class="mb-3">{{ userError }} <v-btn variant="text" @click="loadUsers">Retry</v-btn></v-alert>
            <v-row><v-col cols="12" md="8"><v-autocomplete v-model="memberUser" :items="availableUsers" item-title="label" item-value="_id" label="User" :loading="usersLoading" :disabled="busy || usersLoading" clearable /></v-col><v-col cols="12" md="4"><v-select v-model="memberRole" :items="roles" label="Team role" :disabled="busy" /></v-col></v-row>
            <v-btn color="primary" type="submit" :disabled="!memberUser || usersLoading || Boolean(userError)" :loading="busy">Add member</v-btn>
          </v-form>
      </v-card-text></v-card>
      <v-card v-if="tab === 'invitations' && (access.invite || access.manage)"><v-card-title>Team invitations</v-card-title><v-card-text>
          <p class="mb-4">Invite an existing, active DocMan account. The recipient accepts from Activity. To create an account first, ask a superadmin to use Users.</p>
          <v-form v-if="access.invite" @submit.prevent="invite"><v-row><v-col cols="12" md="8"><v-text-field v-model="inviteEmail" label="Existing user's email" type="email" autocomplete="off" required :disabled="busy" /></v-col><v-col cols="12" md="4"><v-select v-model="inviteRole" :items="inviteRoles" label="Team role" :disabled="busy" /></v-col></v-row><v-btn type="submit" color="primary" :disabled="!inviteEmail.trim()" :loading="busy">Send invitation</v-btn></v-form>
          <template v-if="access.manage"><h2 class="text-h6 mt-6 mb-3">Invitation history</h2><p v-if="!team.invitations?.length">No invitations yet.</p><v-table v-else><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th></tr></thead><tbody><tr v-for="inv in team.invitations" :key="inv._id || `${inv.email}-${inv.invitedAt}`"><td>{{ inv.email }}</td><td>{{ inv.role === 'admin' ? 'Team admin' : 'Member' }}</td><td>{{ invitationStatus(inv) }}</td><td>{{ formatDate(inv.expiresAt) }}</td></tr></tbody></v-table></template>
      </v-card-text></v-card>
      <TeamResourceLinks v-if="['documents','books','projects'].includes(tab)" :key="`${team._id}-${tab}`" :team-id="team._id" :kind="tab" :can-manage="access.link" />
    </template>
    <v-dialog v-model="editorOpen" max-width="640" :persistent="busy"><v-card :title="editing ? 'Edit team' : 'Create team'"><v-card-text><v-alert v-if="formError" type="error" class="mb-4" role="alert">{{ formError }}</v-alert>
        <v-form @submit.prevent="saveTeam"><v-text-field v-model="form.name" label="Team name" required maxlength="100" counter :disabled="busy" /><v-textarea v-model="form.description" label="Description" maxlength="500" counter :disabled="busy" /><v-switch v-if="editing" v-model="form.allowMemberInvites" label="Allow members to invite other members" hint="The inviting account must also have an editor or higher application role." persistent-hint color="primary" :disabled="busy" /><p v-if="!editing" class="text-body-2 mb-4">You will own this team. Add members and link resources after creating it.</p><div class="d-flex justify-end ga-2 mt-5"><v-btn :disabled="busy" @click="editorOpen = false">Cancel</v-btn><v-btn type="submit" color="primary" :loading="busy" :disabled="!form.name.trim()">{{ editing ? 'Save changes' : 'Create team' }}</v-btn></div></v-form>
    </v-card-text></v-card></v-dialog>
    <v-dialog :model-value="Boolean(confirm)" max-width="520" :persistent="busy" @update:model-value="value => { if (!value) confirm = null; }"><v-card :title="confirm?.title"><v-card-text><p>{{ confirm?.kind === 'team' ? 'The team and its memberships will be deleted. Linked documents, books and projects are not deleted. This cannot be undone.' : 'This removes team membership. Access granted separately on documents is unchanged.' }}</p><v-alert v-if="confirmError" type="error" class="mt-3">{{ confirmError }}</v-alert></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="busy" @click="confirm = null">Cancel</v-btn><v-btn color="error" :loading="busy" @click="confirmAction">Confirm</v-btn></v-card-actions></v-card></v-dialog>
  </v-container>
</template>
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
import { personName } from '@/lib/people';
import { teamAccess, teamId } from './teamAccess';
import TeamResourceLinks from './TeamResourceLinks.vue';
const { state, hasRole } = useAuth();
const teams = ref([]), team = ref(null), selectedId = ref(''), loading = ref(false), busy = ref(false), error = ref(''), message = ref(''), search = ref(''), page = ref(1), tab = ref('members');
const editorOpen = ref(false), editing = ref(false), formError = ref(''), confirm = ref(null), confirmError = ref('');
const form = reactive({ name: '', description: '', allowMemberInvites: false });
const users = ref([]), usersLoading = ref(false), userError = ref(''), memberUser = ref(null), memberRole = ref('member'), inviteEmail = ref(''), inviteRole = ref('member');
const roles = [{ title: 'Member', value: 'member' }, { title: 'Team admin', value: 'admin' }];
const currentId = computed(() => teamId(state.user));
const access = computed(() => teamAccess(team.value, state.user));
const canCreate = computed(() => hasRole(['editor','admin','superadmin']));
const inviteRoles = computed(() => access.value.manage ? roles : roles.slice(0,1));
const availableUsers = computed(() => users.value.filter(user => !team.value?.members?.some(member => teamId(member.user) === teamId(user))).map(user => ({ ...user, label: `${personName(user)} (${user.email || 'no email'})` })));
const filtered = computed(() => teams.value.filter(item => `${item.name} ${item.description || ''}`.toLowerCase().includes((search.value || '').toLowerCase())));
const pages = computed(() => Math.max(1,Math.ceil(filtered.value.length/15)));
const visible = computed(() => filtered.value.slice((page.value-1)*15,page.value*15));
watch(search, () => { page.value = 1; }); watch(pages, value => { page.value = Math.min(value,page.value); }); watch(confirm, () => { confirmError.value = ''; });
function fail(e, fallback) { return e.response?.data?.errors?.join('; ') || e.response?.data?.message || fallback; }
function formatDate(value) { return value ? new Date(value).toLocaleDateString() : 'Not set'; }
function invitationStatus(inv) { return inv.status === 'pending' && new Date(inv.expiresAt) < new Date() ? 'Expired' : inv.status; }
async function loadList() {
  loading.value=true; error.value='';
  try { const result=await api.get(hasRole(['superadmin']) ? '/teams' : '/teams/my-teams'); teams.value=Array.isArray(result.data) ? result.data : result.data.teams || []; }
  catch(e) { error.value=fail(e,'Unable to load teams.'); teams.value=[]; }
  finally { loading.value=false; }
}
async function openTeam(id) { selectedId.value=id; tab.value='members'; message.value=''; memberUser.value=null; inviteEmail.value=''; await loadDetail(); }
async function loadDetail() {
  const id=selectedId.value; loading.value=true; error.value=''; team.value=null;
  try { const { data }=await api.get(`/teams/${id}`); if(selectedId.value!==id) return; team.value=data; if(access.value.manage) await loadUsers(); }
  catch(e) { error.value=fail(e,'Unable to load team.'); }
  finally { loading.value=false; }
}
async function loadUsers() {
  usersLoading.value=true; userError.value=''; const all=[];
  try { let page=1, pages=1; do { const {data}=await api.get('/users',{params:{page,limit:100}}); all.push(...(data.users || (Array.isArray(data) ? data : []))); pages=data.pagination?.pages || 1; page++; } while(page<=pages); users.value=all; }
  catch(e) { users.value=[]; userError.value=fail(e,'Unable to load users.'); }
  finally { usersLoading.value=false; }
}
async function back() { selectedId.value=''; team.value=null; await loadList(); }
async function refresh() { if(selectedId.value) await loadDetail(); else await loadList(); }
function openEditor(item=null) { editing.value=Boolean(item); form.name=item?.name || ''; form.description=item?.description || ''; form.allowMemberInvites=Boolean(item?.settings?.allowMemberInvites); formError.value=''; editorOpen.value=true; }
async function saveTeam() {
  if(busy.value || !form.name.trim()) return; busy.value=true; formError.value='';
  try { const payload={name:form.name.trim(),description:form.description.trim()}; if(editing.value) payload.settings={allowMemberInvites:form.allowMemberInvites}; const result=editing.value ? await api.put(`/teams/${selectedId.value}`,payload) : await api.post('/teams',payload); editorOpen.value=false; selectedId.value=result.data.team._id; await loadDetail(); message.value=editing.value ? 'Team saved.' : 'Team created. Add members below.'; }
  catch(e) { formError.value=fail(e,'Unable to save team.'); }
  finally { busy.value=false; }
}
async function addMember() {
  if(busy.value || !memberUser.value) return; busy.value=true; error.value='';
  try { await api.post(`/teams/${selectedId.value}/members`,{userId:memberUser.value,role:memberRole.value}); memberUser.value=null; await loadDetail(); message.value='Member added.'; }
  catch(e) { error.value=fail(e,'Unable to add member.'); }
  finally { busy.value=false; }
}
async function updateRole(member,role) {
  if(busy.value || role===member.role) return; busy.value=true; error.value='';
  try { await api.put(`/teams/${selectedId.value}/members/${teamId(member.user)}/role`,{role}); await loadDetail(); message.value='Team role updated.'; }
  catch(e) { error.value=fail(e,'Unable to update role.'); }
  finally { busy.value=false; }
}
async function invite() {
  if(busy.value || !inviteEmail.value.trim()) return; busy.value=true; error.value='';
  try { await api.post(`/teams/${selectedId.value}/invite`,{email:inviteEmail.value.trim().toLowerCase(),role:access.value.manage ? inviteRole.value : 'member'}); inviteEmail.value=''; await loadDetail(); message.value='Invitation created. The recipient can accept it from Activity.'; }
  catch(e) { error.value=fail(e,'Unable to send invitation.'); }
  finally { busy.value=false; }
}
async function confirmAction() {
  busy.value=true; confirmError.value='';
  try { const removingTeam=confirm.value.kind==='team', leaving=!removingTeam && teamId(confirm.value.member.user)===currentId.value; await api.delete(removingTeam ? `/teams/${selectedId.value}` : `/teams/${selectedId.value}/members/${teamId(confirm.value.member.user)}`); confirm.value=null; if(removingTeam || leaving) await back(); else await loadDetail(); message.value=removingTeam ? 'Team deleted.' : leaving ? 'You left the team.' : 'Member removed.'; }
  catch(e) { confirmError.value=fail(e,'Unable to complete the action.'); }
  finally { busy.value=false; }
}
onMounted(loadList);
</script>
<style scoped>
.team-description { max-width: 32rem; white-space: normal; padding: 4px 0; }
.team-role { min-width: 150px; max-width: 210px; margin: 8px 0; }
</style>
