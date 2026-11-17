<template>
  <v-card>
    <v-tabs v-model="tab" density="comfortable">
      <v-tab value="revisions" prepend-icon="mdi-history">Revision history</v-tab>
      <v-tab v-if="auditAllowed" value="audit" prepend-icon="mdi-shield-search">Audit trail</v-tab>
    </v-tabs>
    <v-divider />
    <v-card-text>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>
      <v-window v-model="tab">
        <v-window-item value="revisions">
          <v-progress-linear v-if="loading" indeterminate class="mb-2" />
          <div v-if="!loading && !revisions.length" class="text-medium-emphasis">No revisions recorded.</div>
          <v-timeline density="compact" side="end" truncate-line="both">
            <v-timeline-item
              v-for="revision in revisions"
              :key="revision._id"
              :dot-color="actionColor(revision.action)"
              size="small"
            >
              <div class="d-flex flex-wrap ga-2 align-center">
                <strong>Revision {{ revision.revision }}</strong>
                <v-chip size="x-small" variant="tonal" :color="actionColor(revision.action)">{{ revision.action }}</v-chip>
                <span class="text-caption text-medium-emphasis">
                  {{ formatDateTime(revision.changedAt) }} · {{ personName(revision.changedBy) || 'system' }}
                </span>
              </div>
              <div v-if="revision.reason" class="text-caption mt-1">{{ revision.reason }}</div>
              <div v-for="change in revision.changes || []" :key="change.field" class="text-caption">
                <strong>{{ change.field }}</strong>:
                <span class="text-error">{{ formatValue(change.from) }}</span>
                →
                <span class="text-success">{{ formatValue(change.to) }}</span>
              </div>
            </v-timeline-item>
          </v-timeline>
        </v-window-item>
        <v-window-item v-if="auditAllowed" value="audit">
          <AuditEntryTable :entries="auditEntries" />
        </v-window-item>
      </v-window>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { api } from '@/services/api';
import { personName } from '@/lib/people';
import { errorMessage, formatDateTime, formatValue } from '@/lib/format';
import AuditEntryTable from '@/components/audit/AuditEntryTable.vue';

const props = defineProps({
  documentId: { type: String, required: true },
});

const tab = ref('revisions');
const revisions = ref([]);
const auditEntries = ref([]);
const auditAllowed = ref(false);
const loading = ref(false);
const error = ref('');

function actionColor(action) {
  return { create: 'primary', update: 'info', publish: 'success', delete: 'error', restore: 'warning', review: 'secondary' }[action] || 'grey';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get(`/docs/${props.documentId}/revisions`, { params: { limit: 200 } });
    revisions.value = response.data?.items || [];
  } catch (err) {
    error.value = errorMessage(err, 'Could not load revision history.');
  } finally {
    loading.value = false;
  }
  try {
    const response = await api.get(`/docs/${props.documentId}/audit`, { params: { limit: 200 } });
    auditEntries.value = response.data?.items || [];
    auditAllowed.value = true;
  } catch {
    auditAllowed.value = false;
  }
}

watch(() => props.documentId, load);
onMounted(load);
defineExpose({ load });
</script>
