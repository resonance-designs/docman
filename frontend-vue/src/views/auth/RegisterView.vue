<template>
  <v-container class="py-8" style="max-width:600px"><v-card title="Create a local DocMan account"><v-card-text>
    <v-alert v-if="message" :type="done ? 'success' : 'error'">{{ message }}</v-alert>
    <v-form v-if="policy?.selfRegistrationEnabled && !done" @submit.prevent="submit">
      <v-text-field v-for="field in fields" :key="field.key" v-model="form[field.key]" :label="field.label" required />
      <p>At least {{ policy.minLength }} characters; at most 72 UTF-8 bytes.</p>
      <v-text-field v-model="form.password" label="Password" type="password" autocomplete="new-password" required />
      <v-text-field v-model="confirmation" label="Repeat password" type="password" autocomplete="new-password" required />
      <v-btn type="submit" :loading="busy">Create account</v-btn>
    </v-form>
    <p v-else-if="policy && !done">Self-registration is disabled. Ask an administrator for an invitation.</p>
    <v-btn to="/login" class="mt-4">Sign in</v-btn>
  </v-card-text></v-card></v-container>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api } from '@/services/api';
const fields = [{ key: 'firstname', label: 'First name' }, { key: 'lastname', label: 'Last name' }, { key: 'email', label: 'Email' }, { key: 'username', label: 'Username' }];
const form = reactive({ firstname: '', lastname: '', email: '', username: '', password: '' });
const policy = ref(null), confirmation = ref(''), message = ref(''), busy = ref(false), done = ref(false);
onMounted(async () => { try { policy.value = (await api.get('/auth/account-policy')).data; } catch { message.value = 'Account settings unavailable. Reload to retry.'; } });
async function submit() {
  if (form.password !== confirmation.value) { message.value = 'Passwords do not match.'; return; }
  busy.value = true;
  try { await api.post('/auth/register', form); done.value = true; message.value = 'Account created. Sign in to continue.'; form.password = ''; confirmation.value = ''; }
  catch (e) { message.value = Object.values(e.response?.data?.errors || {}).join(' ') || e.response?.data?.message || 'Registration failed.'; }
  finally { busy.value = false; }
}
</script>
