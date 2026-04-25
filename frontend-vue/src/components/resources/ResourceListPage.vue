<template>
  <v-container class="py-8" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <div class="text-overline text-primary">{{ eyebrow }}</div>
        <h1 class="text-h4 font-weight-bold">{{ title }}</h1>
        <p class="text-body-1 text-medium-emphasis mb-0">{{ subtitle }}</p>
      </div>
      <div class="d-flex flex-wrap align-center ga-3">
        <slot name="actions" />
        <v-chip color="primary" variant="tonal" size="large">
          {{ filteredItems.length }} of {{ items.length }} loaded
        </v-chip>
      </div>
    </div>

    <v-card class="mb-4">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="7">
            <v-text-field
              v-model="search"
              clearable
              label="Search this view"
              prepend-inner-icon="mdi-magnify"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="5" class="text-medium-emphasis">
            Search filters the loaded rows while API-backed filters are ported from the React app.
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="error"
      class="mb-4"
      type="error"
      variant="tonal"
      density="comfortable"
    >
      {{ error }}
    </v-alert>

    <v-card>
      <v-card-text>
        <v-skeleton-loader v-if="loading" type="table" />

        <v-empty-state
          v-else-if="filteredItems.length === 0"
          :icon="emptyIcon"
          :title="emptyTitle"
          :text="emptyText"
        />

        <v-table v-else>
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key">
                {{ column.title }}
              </th>
              <th v-if="itemPath">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item._id || item.id || item.name || item.title">
              <td v-for="column in columns" :key="column.key">
                <v-chip
                  v-if="column.chip"
                  size="small"
                  variant="tonal"
                  :color="column.color || 'primary'"
                >
                  {{ formatValue(item, column) }}
                </v-chip>
                <span v-else>{{ formatValue(item, column) }}</span>
              </td>
              <td v-if="itemPath">
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  :to="itemPath(item)"
                >
                  Open
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  eyebrow: {
    type: String,
    default: 'DocMan',
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  columns: {
    type: Array,
    required: true,
  },
  count: {
    type: Number,
    required: true,
  },
  loading: {
    type: Boolean,
    required: true,
  },
  error: {
    type: String,
    default: '',
  },
  emptyIcon: {
    type: String,
    default: 'mdi-database-search-outline',
  },
  emptyTitle: {
    type: String,
    default: 'Nothing here yet',
  },
  emptyText: {
    type: String,
    default: 'Once data is available, it will appear here.',
  },
  itemPath: {
    type: Function,
    default: null,
  },
});

const search = ref('');

const filteredItems = computed(() => {
  const needle = search.value.trim().toLowerCase();
  if (!needle) {
    return props.items;
  }

  return props.items.filter((item) => {
    return props.columns.some((column) => {
      return String(formatValue(item, column)).toLowerCase().includes(needle);
    });
  });
});

function formatValue(item, column) {
  if (typeof column.value === 'function') {
    return column.value(item);
  }

  const value = column.key.split('.').reduce((current, key) => current?.[key], item);
  if (Array.isArray(value)) {
    return value.length;
  }

  if (value === undefined || value === null || value === '') {
    return 'Not set';
  }

  return value;
}
</script>
