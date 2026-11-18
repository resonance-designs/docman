<template>
  <v-container class="py-8" fluid>
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Approvals</h1>
        <div class="text-medium-emphasis">Document versions waiting for your decision.</div>
      </div>
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="load">Refresh</v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-card>
      <v-table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Version</th>
            <th>Submitted</th>
            <th>Approvals</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && !items.length">
            <td colspan="5" class="text-medium-emphasis py-6">Nothing is waiting for your approval.</td>
          </tr>
          <tr v-for="item in items" :key="item._id">
            <td class="font-weight-medium">{{ item.document?.title || 'Untitled' }}</td>
            <td>
              v{{ item.version }} · {{ item.versionLabel }}
              <div v-if="item.changelog" class="text-caption text-medium-emphasis">{{ item.changelog }}</div>
            </td>
            <td>
              {{ personName(item.uploadedBy) }}
              <div class="text-caption text-medium-emphasis">{{ formatDateTime(item.submittedAt || item.uploadedAt) }}</div>
            </td>
            <td>{{ (item.approvals || []).filter((a) => a.decision === 'approved').length }} / {{ item.requiredApprovals }}</td>
            <td class="text-right">
              <v-btn color="primary" variant="tonal" :to="`/documents/${item.document?._id}`">Review</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { api } from '@/services/api';
import { personName } from '@/lib/people';
import { errorMessage, formatDateTime } from '@/lib/format';

const items = ref([]);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get('/docs/approvals/pending');
    items.value = response.data?.items || [];
  } catch (err) {
    error.value = errorMessage(err, 'Could not load approvals.');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
