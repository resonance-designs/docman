<template>
  <v-container class="py-8" style="max-width:600px">
    <v-card title="Set up your DocMan account"><v-card-text>
      <v-alert v-if="message" :type="done ? (auditWarning ? 'warning' : 'success') : 'error'">{{ message }}</v-alert>
      <v-form v-if="!done && policy" @submit.prevent="submit">
        <p class="my-4">Choose at least {{ policy.minLength }} characters, up to 72 UTF-8 bytes. Spaces and punctuation are allowed.</p>
        <v-text-field v-model="password" label="Password" type="password" autocomplete="new-password" required />
        <v-text-field v-model="confirmation" label="Repeat password" type="password" autocomplete="new-password" required />
        <v-btn type="submit" :loading="busy">Activate account</v-btn>
      </v-form>
      <v-btn v-if="done" to="/login" class="mt-4">Sign in</v-btn>
    </v-card-text></v-card>
  </v-container>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@/services/api';
const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
// Remove the token from the visible URL; GET requests never consume it.
window.history.replaceState(window.history.state, '', window.location.pathname);
const password = ref(''), confirmation = ref(''), policy = ref(null), message = ref(''), done = ref(false), busy = ref(false);
const auditWarning = ref(false);
onMounted(async () => { try { policy.value = (await api.get('/auth/account-policy')).data; } catch { message.value = 'Could not load password requirements. Reopen your invitation to retry.'; } });
async function submit() {
  if (password.value !== confirmation.value) { message.value = 'Passwords do not match.'; return; }
  busy.value = true;
  try { const { data } = await api.post('/auth/accept-invitation', { token, password: password.value }); message.value = data.message; auditWarning.value = data.auditRecorded === false; done.value = true; password.value = ''; confirmation.value = ''; }
  catch (e) { message.value = e.response?.data?.message || 'Could not activate account.'; }
  finally { busy.value = false; }
}
</script>
