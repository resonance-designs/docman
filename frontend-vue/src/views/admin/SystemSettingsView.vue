<template>
  <v-container class="py-8" fluid>
    <h1 class="text-h4 font-weight-bold mb-1">System settings</h1>
    <div class="text-medium-emphasis mb-6">Infrastructure options for this DocMan server.</div>

    <v-alert v-if="message" class="mb-4" :type="messageType" variant="tonal" closable @click:close="message = ''">{{ message }}</v-alert>

    <v-row>
      <v-col cols="12" lg="7">
        <v-card :loading="loading">
          <v-card-title>Rate-limiting store (Redis)</v-card-title>
          <v-card-subtitle>Where login and API rate-limit counters are kept.</v-card-subtitle>
          <v-card-text v-if="status">
            <div class="d-flex flex-wrap align-center ga-2 mb-4">
              <span>Active:</span>
              <v-chip :color="status.health.ok ? 'success' : 'error'" variant="tonal" :prepend-icon="status.health.ok ? 'mdi-check-circle' : 'mdi-alert-circle'">
                {{ providerLabels[status.activeProvider] || status.activeProvider }}
              </v-chip>
              <span class="text-caption text-medium-emphasis">
                {{ status.health.ok ? `${status.health.latencyMs} ms` : status.health.error }} · set by {{ sourceLabels[status.source] || status.source }}
              </span>
            </div>
            <v-alert v-if="status.fallbackCount" type="warning" variant="tonal" density="compact" class="mb-4">
              The active store failed {{ status.fallbackCount }} time(s); requests used the in-memory fallback.
              Last error: {{ status.lastError }}
            </v-alert>

            <v-radio-group v-model="selected" :disabled="!isSuperadmin">
              <v-radio value="auto">
                <template #label>
                  <div>
                    <div>Automatic (follow server configuration)</div>
                    <div class="text-caption text-medium-emphasis">Uses REDIS_PROVIDER, otherwise whichever store is configured.</div>
                  </div>
                </template>
              </v-radio>
              <v-radio v-for="provider in status.availableProviders" :key="provider" :value="provider" :disabled="!status.providers[provider]?.configured">
                <template #label>
                  <div>
                    <div>
                      {{ providerLabels[provider] }}
                      <v-chip v-if="!status.providers[provider]?.configured" size="x-small" class="ml-1">not configured</v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ providerDescriptions[provider] }}
                      <span v-if="status.providers[provider]?.target"> · {{ status.providers[provider].target }}</span>
                    </div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
            <div class="text-caption text-medium-emphasis">
              Connection details live in the server environment file (credentials are never stored in the database).
              Switching tests the connection first and is recorded in the audit log.
            </div>
          </v-card-text>
          <v-card-actions v-if="isSuperadmin">
            <v-btn variant="text" prepend-icon="mdi-refresh" @click="load">Re-test</v-btn>
            <v-spacer />
            <v-btn color="primary" :loading="saving" :disabled="!changed" @click="save">Apply</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card :loading="deletedLoading">
          <v-card-title>Deleted documents</v-card-title>
          <v-card-subtitle>Soft-deleted records kept for retention. Restore if deleted by mistake.</v-card-subtitle>
          <v-list v-if="deleted.length" density="compact">
            <v-list-item v-for="doc in deleted" :key="doc._id" :title="doc.title">
              <v-list-item-subtitle>
                {{ formatDateTime(doc.deletedAt) }} · {{ personName(doc.deletedBy) }}
                <span v-if="doc.deleteReason"> — {{ doc.deleteReason }}</span>
              </v-list-item-subtitle>
              <template #append>
                <v-btn size="small" variant="tonal" :loading="restoring === doc._id" @click="restore(doc)">Restore</v-btn>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-medium-emphasis">No deleted documents.</v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <AccountSettingsCard v-if="isSuperadmin" />
    <SoftwareUpdatesCard v-if="isSuperadmin" />
    <StorageSettingsCard v-if="isSuperadmin" />
    <EmailSettingsCard v-if="isSuperadmin" />
    <NotificationSettingsCard v-if="isSuperadmin" />
    <PublicSharingSettingsCard v-if="isSuperadmin" />
  </v-container>
</template>

<script setup>
import SoftwareUpdatesCard from '@/components/admin/SoftwareUpdatesCard.vue';
import PublicSharingSettingsCard from '@/components/admin/PublicSharingSettingsCard.vue';
import NotificationSettingsCard from '@/components/admin/NotificationSettingsCard.vue';
import AccountSettingsCard from '@/components/admin/AccountSettingsCard.vue';
import { computed, onMounted, ref } from 'vue';
import StorageSettingsCard from '@/components/admin/StorageSettingsCard.vue';
import EmailSettingsCard from '@/components/admin/EmailSettingsCard.vue';
import { api } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
import { personName } from '@/lib/people';
import { errorMessage, formatDateTime } from '@/lib/format';

const providerLabels = { upstash: 'Upstash (hosted)', local: 'Self-hosted Redis', memory: 'In-memory (no Redis)' };
const providerDescriptions = {
  upstash: 'Managed Redis over HTTPS. Counters leave this server.',
  local: 'Redis running on agency infrastructure.',
  memory: 'Counters kept inside the Node process. Single server only; reset on restart.',
};
const sourceLabels = { 'system-setting': 'System Settings', environment: 'REDIS_PROVIDER', auto: 'auto-detection' };

const { hasRole } = useAuth();
const isSuperadmin = computed(() => hasRole(['superadmin']));

const status = ref(null);
const selected = ref('auto');
const loading = ref(false);
const saving = ref(false);
const message = ref('');
const messageType = ref('success');
const deleted = ref([]);
const deletedLoading = ref(false);
const restoring = ref('');

const changed = computed(() => (status.value?.runtimeChoice || 'auto') !== selected.value);

function notify(text, type = 'success') {
  message.value = text;
  messageType.value = type;
}

async function load() {
  loading.value = true;
  try {
    const response = await api.get('/system/redis');
    status.value = response.data;
    selected.value = response.data.runtimeChoice || 'auto';
  } catch (err) {
    notify(errorMessage(err, 'Could not load Redis status.'), 'error');
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const response = await api.put('/system/redis', { provider: selected.value === 'auto' ? null : selected.value });
    status.value = response.data;
    selected.value = response.data.runtimeChoice || 'auto';
    notify(response.data.message || 'Saved.');
  } catch (err) {
    notify(errorMessage(err, 'Could not switch provider.'), 'error');
    selected.value = status.value?.runtimeChoice || 'auto';
  } finally {
    saving.value = false;
  }
}

async function loadDeleted() {
  deletedLoading.value = true;
  try {
    const response = await api.get('/docs/deleted');
    deleted.value = response.data || [];
  } catch {
    deleted.value = [];
  } finally {
    deletedLoading.value = false;
  }
}

async function restore(doc) {
  restoring.value = doc._id;
  try {
    await api.post(`/docs/${doc._id}/restore`, { reason: 'Restored from System Settings' });
    notify(`Restored "${doc.title}".`);
    await loadDeleted();
  } catch (err) {
    notify(errorMessage(err, 'Restore failed.'), 'error');
  } finally {
    restoring.value = '';
  }
}

onMounted(() => {
  load();
  loadDeleted();
});
</script>
