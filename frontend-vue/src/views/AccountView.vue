<template>
  <v-container style="max-width: 900px">
    <h1 class="mb-4">My account</h1>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}<v-btn v-if="!account && !changed" variant="text" :loading="loading" @click="load">Retry</v-btn></v-alert>
    <v-alert v-if="message" type="success" class="mb-4">{{ message }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate />
    <template v-if="account">
      <v-card class="mb-6" title="Profile">
        <v-card-text>
          <p class="mb-4">Username: {{ account.username }} · Email: {{ account.email }} · Role: {{ account.role }}</p>
          <p class="mb-4">Contact a superadmin to change your username or email address.</p>
          <v-alert v-if="account.externallyManaged" type="info" class="mb-4">Your profile and password are managed by your identity provider.</v-alert>
          <v-form @submit.prevent="save">
            <v-text-field v-for="field in fields" :key="field.key" v-model="profile[field.key]" :label="field.label" :disabled="account.externallyManaged || busy" :maxlength="254" :required="['firstname','lastname'].includes(field.key)" />
            <v-textarea v-model="profile.bio" label="About me" maxlength="500" counter :disabled="account.externallyManaged || busy" />
            <v-btn v-if="!account.externallyManaged" type="submit" color="primary" :loading="busy">Save profile</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
      <v-card v-if="!account.externallyManaged" title="Change password">
        <v-card-text>
          <p class="mb-4">Use at least {{ minimum }} characters, up to 72 UTF-8 bytes. Changing your password signs out all existing DocMan sessions.</p>
          <v-form @submit.prevent="change">
            <v-text-field v-model="currentPassword" label="Current password" type="password" autocomplete="current-password" required :disabled="busy" />
            <v-text-field v-model="password" label="New password" type="password" autocomplete="new-password" required :disabled="busy" />
            <v-text-field v-model="confirmation" label="Repeat new password" type="password" autocomplete="new-password" required :disabled="busy" />
            <v-btn type="submit" color="primary" :loading="busy">Change password and sign out</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </template>
    <v-btn v-if="changed" to="/login" color="primary">Sign in with your new password</v-btn>
  </v-container>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
const { refreshProfile, clearLocalSession } = useAuth();
const account = ref(null), loading = ref(true), busy = ref(false), error = ref(''), message = ref(''), minimum = ref(18), changed = ref(false);
const profile = reactive({});
const currentPassword = ref(''), password = ref(''), confirmation = ref('');
const fields = [{ key: 'firstname', label: 'First name' }, { key: 'lastname', label: 'Last name' }, { key: 'telephone', label: 'Telephone' }, { key: 'title', label: 'Job title' }, { key: 'department', label: 'Department' }];
async function load() {
  loading.value = true; error.value = '';
  try {
    const { data } = await api.get('/users/me/account'); account.value = data.user; minimum.value = data.policy.minLength;
    for (const key of [...fields.map(field => field.key), 'bio']) profile[key] = data.user[key] || '';
  } catch (e) { error.value = e.response?.data?.message || 'Unable to load your account.'; }
  finally { loading.value = false; }
}
onMounted(load);
async function save() {
  if (busy.value) return;
  busy.value = true; error.value = ''; message.value = '';
  try { const { data } = await api.patch('/users/me/account', profile); account.value = data.user; await refreshProfile(); message.value = 'Profile saved.'; }
  catch (e) { error.value = e.response?.data?.message || 'Unable to save profile.'; }
  finally { busy.value = false; }
}
async function change() {
  if (busy.value) return;
  error.value = ''; message.value = '';
  if (password.value !== confirmation.value) { error.value = 'New passwords must match.'; return; }
  busy.value = true;
  try {
    const { data } = await api.post('/users/me/password', { currentPassword: currentPassword.value, password: password.value });
    currentPassword.value = ''; password.value = ''; confirmation.value = '';
    clearLocalSession(); account.value = null; changed.value = true; message.value = data.message;
  } catch (e) { error.value = e.response?.data?.message || 'Unable to change password.'; }
  finally { busy.value = false; }
}
</script>
