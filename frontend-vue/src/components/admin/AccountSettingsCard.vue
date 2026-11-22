<template>
  <v-card class="mt-6" title="Accounts and passwords">
    <v-card-text>
      <v-alert v-if="message" :type="failed ? 'error' : 'success'" class="mb-4">{{ message }}</v-alert>
      <template v-if="form">
        <v-text-field v-model.number="form.minLength" label="Minimum password length" type="number" min="14" max="24" hint="Choose 14–24. Longer passwords are allowed, up to 72 UTF-8 bytes." persistent-hint />
        <v-switch v-model="form.selfRegistrationEnabled" label="Allow local self-registration" color="primary" hint="Off by default. When enabled, visitors can create viewer accounts. Invitations remain available when off." persistent-hint />
        <p class="mt-4">New passwords must follow this policy. Existing passwords remain valid. Invitations expire after 24 hours.</p>
        <v-btn class="mt-4" :loading="busy" @click="save">Save account settings</v-btn>
      </template>
    </v-card-text>
  </v-card>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@/services/api';
const form = ref(null), message = ref(''), failed = ref(false), busy = ref(false);
onMounted(async () => { try { form.value = (await api.get('/system/accounts')).data; } catch { failed.value = true; message.value = 'Could not load account settings. Reload to retry.'; } });
async function save() {
  busy.value = true;
  try { form.value = (await api.put('/system/accounts', form.value)).data; failed.value = false; message.value = 'Account settings saved.'; }
  catch (e) { failed.value = true; message.value = e.response?.data?.message || 'Could not save settings.'; }
  finally { busy.value = false; }
}
</script>
