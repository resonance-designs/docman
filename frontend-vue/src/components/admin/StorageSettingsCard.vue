<template>
  <v-card :loading="loading" class="mt-6">
    <v-card-title>Document storage</v-card-title>
    <v-card-subtitle>Encryption at rest and the maximum upload size. Applies to new uploads.</v-card-subtitle>
    <v-card-text v-if="form">
      <v-alert v-if="message" :type="messageType" variant="tonal" class="mb-4" role="status">{{ message }}</v-alert>
      <v-alert v-if="!form.encryptionReady" type="warning" variant="tonal" class="mb-4">
        The server has no DOCUMENT_ENCRYPTION_KEY, so new files are stored unencrypted. A server administrator must add
        the key (Ubuntu guide, document encryption section) before encryption at rest can be turned on.
      </v-alert>
      <v-switch
        v-model="form.encryptAtRest"
        color="primary"
        :disabled="saving || !form.encryptionReady"
        label="Encrypt uploaded files at rest"
        hint="Files are encrypted as they are written to disk and decrypted only for users allowed to download them. Nothing changes for users. Turning this off does not decrypt files already stored."
        persistent-hint
      />
      <v-text-field
        v-model.number="form.maxUploadMB"
        class="mt-6"
        type="number"
        :min="1"
        :max="form.maxUploadCeilingMB"
        step="1"
        suffix="MB"
        label="Maximum upload size"
        :disabled="saving"
        :hint="`1 to ${form.maxUploadCeilingMB} MB. The web server's request size limit must be at least this large (see the Ubuntu guide).`"
        persistent-hint
        style="max-width: 320px"
      />
    </v-card-text>
    <v-card-actions v-if="form">
      <v-spacer />
      <v-btn color="primary" :loading="saving" :disabled="!changed" @click="save">Save storage settings</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '@/services/api';
import { useStorageSettings } from '@/composables/useStorageSettings';

const { load: refreshShared } = useStorageSettings();
const form = ref(null);
const original = ref(null);
const loading = ref(false);
const saving = ref(false);
const message = ref('');
const messageType = ref('success');

const changed = computed(() => form.value && original.value
  && (form.value.encryptAtRest !== original.value.encryptAtRest || form.value.maxUploadMB !== original.value.maxUploadMB));

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/system/storage');
    form.value = { ...data };
    original.value = { ...data };
  } catch (error) {
    message.value = error.response?.data?.message || 'Could not load storage settings.';
    messageType.value = 'error';
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  message.value = '';
  try {
    const { data } = await api.put('/system/storage', {
      encryptAtRest: Boolean(form.value.encryptAtRest),
      maxUploadMB: Number(form.value.maxUploadMB),
    });
    form.value = { ...data };
    original.value = { ...data };
    await refreshShared(true);
    message.value = 'Storage settings saved.';
    messageType.value = 'success';
  } catch (error) {
    message.value = error.response?.data?.message || 'Could not save storage settings.';
    messageType.value = 'error';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
