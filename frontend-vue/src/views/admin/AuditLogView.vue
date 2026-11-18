<template>
  <v-container class="py-8" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Audit log</h1>
        <div class="text-medium-emphasis">Append-only and hash-chained. Entries cannot be edited or deleted.</div>
      </div>
      <div class="d-flex ga-2">
        <v-btn variant="outlined" prepend-icon="mdi-file-delimited-outline" :loading="exporting === 'csv'" @click="exportLog('csv')">Export CSV</v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-code-json" :loading="exporting === 'json'" @click="exportLog('json')">Export JSON</v-btn>
        <v-btn v-if="isSuperadmin" color="primary" prepend-icon="mdi-shield-check" :loading="verifying" @click="verify">Verify integrity</v-btn>
      </div>
    </div>

    <v-alert v-if="verifyResult" class="mb-4" :type="verifyResult.valid ? 'success' : 'error'" variant="tonal" closable @click:close="verifyResult = null">
      <template v-if="verifyResult.valid">Chain intact: {{ verifyResult.checked }} entries verified.</template>
      <template v-else>
        Integrity check FAILED at entry #{{ verifyResult.firstInvalidSequence }} ({{ verifyResult.reason }}).
        The audit log may have been altered outside the application.
      </template>
    </v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-card class="mb-4">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="3">
            <v-combobox v-model="filters.action" :items="actionOptions" label="Action (or prefix, e.g. version.)" clearable />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.actorEmail" label="User email" clearable />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="filters.outcome" :items="['success', 'denied', 'failure']" label="Outcome" clearable />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="filters.from" type="date" label="From" />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="filters.to" type="date" label="To" />
          </v-col>
        </v-row>
        <div class="d-flex ga-2">
          <v-btn color="primary" prepend-icon="mdi-magnify" @click="search">Search</v-btn>
          <v-btn variant="text" @click="reset">Clear</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card>
      <v-progress-linear v-if="loading" indeterminate />
      <AuditEntryTable :entries="items" />
      <v-card-actions>
        <span class="text-caption text-medium-emphasis ml-2">{{ total }} entries</span>
        <v-spacer />
        <v-pagination v-model="page" :length="pageCount" density="comfortable" total-visible="7" @update:model-value="load" />
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '@/services/api';
import { downloadFromApi } from '@/services/download';
import { useAuth } from '@/composables/useAuth';
import { errorMessage } from '@/lib/format';
import AuditEntryTable from '@/components/audit/AuditEntryTable.vue';

const PAGE_SIZE = 50;
const { hasRole } = useAuth();
const isSuperadmin = computed(() => hasRole(['superadmin']));

const filters = reactive({ action: null, actorEmail: '', outcome: null, from: '', to: '' });
const items = ref([]);
const total = ref(0);
const page = ref(1);
const actionOptions = ref([]);
const loading = ref(false);
const exporting = ref('');
const verifying = ref(false);
const verifyResult = ref(null);
const error = ref('');

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

function queryParams() {
  const params = {};
  if (filters.action) params.action = filters.action;
  if (filters.actorEmail) params.actorEmail = filters.actorEmail.trim();
  if (filters.outcome) params.outcome = filters.outcome;
  if (filters.from) params.from = new Date(`${filters.from}T00:00:00`).toISOString();
  if (filters.to) params.to = new Date(`${filters.to}T23:59:59.999`).toISOString();
  return params;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get('/audit', { params: { ...queryParams(), limit: PAGE_SIZE, skip: (page.value - 1) * PAGE_SIZE } });
    items.value = response.data?.items || [];
    total.value = response.data?.total || 0;
    actionOptions.value = response.data?.actions || actionOptions.value;
  } catch (err) {
    error.value = errorMessage(err, 'Could not load the audit log.');
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  load();
}

function reset() {
  Object.assign(filters, { action: null, actorEmail: '', outcome: null, from: '', to: '' });
  search();
}

async function exportLog(format) {
  exporting.value = format;
  try {
    await downloadFromApi('/audit/export', { ...queryParams(), format }, `docman-audit.${format}`);
  } catch (err) {
    error.value = err?.response?.status === 413 ? 'Export too large. Narrow the date range.' : 'Export failed.';
  } finally {
    exporting.value = '';
  }
}

async function verify() {
  verifying.value = true;
  try {
    const response = await api.get('/audit/verify');
    verifyResult.value = response.data;
    await load();
  } catch (err) {
    error.value = errorMessage(err, 'Verification failed to run.');
  } finally {
    verifying.value = false;
  }
}

onMounted(load);
</script>
