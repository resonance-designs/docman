<template>
  <v-container class="py-8" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div><h1 class="text-h4 font-weight-bold">Users</h1><p class="text-medium-emphasis mt-2">Create accounts and manage access to DocMan.</p></div>
      <v-btn color="primary" prepend-icon="mdi-account-plus-outline" @click="openCreate">Create user</v-btn>
    </div>
    <v-alert v-if="message" type="success" variant="tonal" class="mb-4" closable @click:close="message = ''">{{ message }}</v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">{{ error }} <v-btn variant="text" @click="load">Retry</v-btn></v-alert>
    <v-card :loading="loading">
      <v-card-text>
        <form class="d-flex ga-3 align-start" @submit.prevent="searchUsers">
          <v-text-field v-model="search" label="Search name, username, or email" prepend-inner-icon="mdi-magnify" clearable maxlength="100" />
          <v-btn type="submit" variant="tonal" :disabled="loading">Search</v-btn>
        </form>
        <v-table>
          <thead><tr><th>Name</th><th>Username / email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="account in users" :key="account._id">
              <td>{{ account.firstname }} {{ account.lastname }}<span v-if="isSelf(account)" class="text-caption ml-2">(you)</span></td>
              <td><div>{{ account.username }}</div><div class="text-caption">{{ account.email }}</div></td>
              <td>{{ account.role }}</td>
              <td><v-chip size="small" :color="account.isActive ? 'success' : 'default'">{{ account.isActive ? 'Active' : 'Disabled' }}</v-chip></td>
              <td>
                <v-btn variant="text" size="small" :aria-label="`Edit ${account.username}`" @click="openEdit(account)">Edit</v-btn>
                <v-btn v-if="!isSelf(account) && account.identityProvider !== 'authentik'" variant="text" size="small" @click="openPassword(account)">Reset password</v-btn>
                <v-btn v-if="account.role !== 'superadmin'" variant="text" size="small" :color="account.isActive ? 'error' : 'success'" @click="formError = ''; statusTarget = account">{{ account.isActive ? 'Disable' : 'Enable' }}</v-btn>
              </td>
            </tr>
            <tr v-if="!loading && !users.length"><td colspan="5" class="text-center py-8">No users match your search.</td></tr>
          </tbody>
        </v-table>
        <div class="d-flex flex-wrap align-center justify-space-between mt-4"><span class="text-caption">{{ total }} accounts</span><v-pagination v-model="page" :length="pages" :disabled="loading" @update:model-value="load" /></div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="editorOpen" max-width="640" :persistent="saving">
      <v-card>
        <v-card-title>{{ editing ? 'Edit user' : 'Create user' }}</v-card-title>
        <v-form @submit.prevent="save">
          <v-card-text>
            <v-alert v-if="formError" type="error" variant="tonal" class="mb-4" role="alert">{{ formError }}</v-alert>
            <v-row><v-col cols="12" sm="6"><v-text-field v-model="form.firstname" label="First name" required maxlength="254" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.lastname" label="Last name" required maxlength="254" /></v-col></v-row>
            <v-text-field v-model="form.email" label="Email" type="email" required maxlength="254" />
            <v-text-field v-model="form.username" label="Username" required minlength="3" maxlength="50" hint="3–50 letters, numbers, dots, underscores, or hyphens. New usernames are saved in lowercase." persistent-hint />
            <v-select v-model="form.role" :items="roles" label="Role" class="mt-3" :disabled="editing?.role === 'superadmin'" />
            <p class="text-caption mb-4">Viewers read permitted documents. Editors work on permitted documents. Admins have broader administrative access. Superadmins can also manage accounts.</p>
            <v-row><v-col cols="12" sm="6"><v-text-field v-model="form.department" label="Department (optional)" maxlength="254" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.title" label="Job title (optional)" maxlength="254" /></v-col></v-row>
            <template v-if="!editing">
              <v-text-field v-model="password" label="Initial password" type="password" autocomplete="new-password" required hint="At least 18 characters; at most 72 UTF-8 bytes. Spaces and punctuation are allowed." persistent-hint />
              <v-text-field v-model="confirmation" label="Repeat password" type="password" autocomplete="new-password" required class="mt-3" />
              <p class="text-caption">Save the password before creating the account and share it through your approved secure channel. DocMan does not email it or display it afterward.</p>
            </template>
            <v-alert v-if="editing?.role === 'superadmin'" type="info" variant="tonal" density="compact">Superadmin accounts cannot be demoted or disabled here, to preserve administrative access.</v-alert>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="editorOpen = false">Cancel</v-btn><v-btn color="primary" type="submit" :loading="saving">{{ editing ? 'Save changes' : 'Create user' }}</v-btn></v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(passwordTarget)" max-width="520" :persistent="saving" @update:model-value="closePassword">
      <v-card title="Reset password">
        <v-form @submit.prevent="resetPassword">
          <v-card-text>
            <p class="mb-4">Set a new password for {{ passwordTarget?.username }}. Existing local sessions will be invalidated. Save and share the new password securely; no email is sent.</p>
            <v-alert v-if="formError" type="error" variant="tonal" class="mb-4" role="alert">{{ formError }}</v-alert>
            <v-text-field v-model="password" label="New password" type="password" autocomplete="new-password" required hint="At least 18 characters; at most 72 UTF-8 bytes." persistent-hint />
            <v-text-field v-model="confirmation" label="Repeat password" type="password" autocomplete="new-password" required class="mt-3" />
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="closePassword">Cancel</v-btn><v-btn color="primary" type="submit" :loading="saving">Reset password</v-btn></v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(statusTarget)" max-width="500" :persistent="saving" @update:model-value="statusTarget = null; formError = ''">
      <v-card :title="statusTarget?.isActive ? 'Disable account?' : 'Enable account?'">
        <v-card-text><v-alert v-if="formError" type="error" class="mb-3">{{ formError }}</v-alert>
          {{ statusTarget?.username }} {{ statusTarget?.isActive ? 'will be unable to sign in or use existing sessions. Their document and audit history will remain.' : 'will be able to sign in again. Previous local sessions will remain invalid.' }}
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="statusTarget = null; formError = ''">Cancel</v-btn><v-btn :loading="saving" :color="statusTarget?.isActive ? 'error' : 'primary'" @click="changeStatus">Confirm</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { api } from '@/services/api';
import { useAuth } from '@/composables/useAuth';

const { state } = useAuth();
const users = ref([]), total = ref(0), page = ref(1), pages = ref(1), search = ref('');
const loading = ref(false), saving = ref(false), error = ref(''), formError = ref(''), message = ref('');
const editorOpen = ref(false), editing = ref(null), passwordTarget = ref(null), statusTarget = ref(null);
const password = ref(''), confirmation = ref('');
const roles = ['viewer', 'editor', 'admin', 'superadmin'];
const form = reactive({ firstname: '', lastname: '', email: '', username: '', role: 'viewer', department: '', title: '' });
const isSelf = account => String(account._id) === String(state.user?.id || state.user?._id);
const errorText = err => err.response?.data?.message || 'Unable to contact the server. Try again.';
let requestNumber = 0;
async function load() {
  const request = ++requestNumber;
  loading.value = true; error.value = '';
  try {
    const { data } = await api.get('/users/manage', { params: { page: page.value, search: search.value || '' } });
    if (request !== requestNumber) return;
    users.value = data.users; pages.value = data.pages; total.value = data.total;
  } catch (err) { if (request === requestNumber) error.value = errorText(err); }
  finally { if (request === requestNumber) loading.value = false; }
}
function searchUsers() { page.value = 1; load(); }
function clearPassword() { password.value = ''; confirmation.value = ''; }
watch(editorOpen, open => { if (!open) clearPassword(); });
function openCreate() {
  editing.value = null; formError.value = ''; clearPassword();
  Object.assign(form, { firstname: '', lastname: '', email: '', username: '', role: 'viewer', department: '', title: '' });
  editorOpen.value = true;
}
function openEdit(account) {
  editing.value = account; formError.value = ''; clearPassword();
  for (const key of Object.keys(form)) form[key] = account[key] || '';
  editorOpen.value = true;
}
function passwordError() {
  if ([...password.value].length < 18 || new TextEncoder().encode(password.value).length > 72) return 'Use at least 18 characters and at most 72 UTF-8 bytes.';
  if (password.value !== confirmation.value) return 'Passwords do not match.';
  return '';
}
async function save() {
  if (saving.value) return;
  formError.value = editing.value ? '' : passwordError();
  if (formError.value) return;
  saving.value = true;
  try {
    if (editing.value) await api.patch(`/users/manage/${editing.value._id}`, { ...form });
    else await api.post('/users/manage', { ...form, password: password.value });
    message.value = editing.value ? 'Account updated.' : 'Account created. Share the saved credentials securely.';
    editorOpen.value = false; clearPassword(); await load();
  } catch (err) { formError.value = errorText(err); }
  finally { saving.value = false; }
}
function openPassword(account) { formError.value = ''; clearPassword(); passwordTarget.value = account; }
function closePassword() { if (saving.value) return; passwordTarget.value = null; clearPassword(); formError.value = ''; }
async function resetPassword() {
  if (saving.value) return;
  formError.value = passwordError(); if (formError.value) return;
  saving.value = true;
  try {
    await api.patch(`/users/manage/${passwordTarget.value._id}`, { password: password.value });
    passwordTarget.value = null; clearPassword(); message.value = 'Password reset. Share the saved password securely.';
  } catch (err) { formError.value = errorText(err); }
  finally { saving.value = false; }
}
async function changeStatus() {
  if (saving.value) return;
  saving.value = true; formError.value = '';
  try {
    await api.patch(`/users/manage/${statusTarget.value._id}`, { isActive: !statusTarget.value.isActive });
    statusTarget.value = null; message.value = 'Account status updated.'; await load();
  } catch (err) { formError.value = errorText(err); }
  finally { saving.value = false; }
}
onMounted(load);
</script>
