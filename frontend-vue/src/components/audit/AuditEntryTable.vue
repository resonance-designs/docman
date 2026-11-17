<template>
  <div>
    <v-table density="compact" class="audit-table">
      <thead>
        <tr>
          <th style="width: 72px">#</th>
          <th style="width: 190px">When</th>
          <th>Action</th>
          <th>Who</th>
          <th>Details</th>
          <th v-if="showRequest">Client</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!entries.length">
          <td :colspan="showRequest ? 6 : 5" class="text-medium-emphasis py-4">No audit entries.</td>
        </tr>
        <tr v-for="entry in entries" :key="entry._id || entry.sequence">
          <td class="text-medium-emphasis">{{ entry.sequence }}</td>
          <td>{{ formatDateTime(entry.timestamp) }}</td>
          <td>
            <v-chip size="small" :color="outcomeColor(entry.outcome)" variant="tonal" class="mr-1">
              {{ entry.action }}
            </v-chip>
            <span v-if="entry.outcome !== 'success'" class="text-caption text-uppercase">{{ entry.outcome }}</span>
          </td>
          <td>
            <div>{{ entry.actor?.email || 'system' }}</div>
            <div class="text-caption text-medium-emphasis">{{ entry.actor?.role || '' }}</div>
          </td>
          <td>
            <div>{{ entry.summary }}</div>
            <div v-for="change in entry.changes || []" :key="change.field" class="text-caption">
              <strong>{{ change.field }}</strong>:
              <span class="text-error">{{ formatValue(change.from) }}</span>
              →
              <span class="text-success">{{ formatValue(change.to) }}</span>
            </div>
          </td>
          <td v-if="showRequest" class="text-caption">
            <div>{{ entry.request?.ip || '—' }}</div>
            <div class="text-medium-emphasis">{{ entry.request?.method }} {{ entry.request?.path }}</div>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup>
import { formatDateTime, formatValue } from '@/lib/format';

defineProps({
  entries: { type: Array, default: () => [] },
  showRequest: { type: Boolean, default: true },
});

function outcomeColor(outcome) {
  if (outcome === 'denied') return 'warning';
  if (outcome === 'failure') return 'error';
  return 'primary';
}
</script>
