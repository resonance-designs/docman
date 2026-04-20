<template>
  <ResourceListPage
    eyebrow="Categories"
    title="Categories"
    subtitle="Browse document classification values."
    :items="items"
    :columns="columns"
    :count="count"
    :loading="loading"
    :error="error"
    empty-icon="mdi-folder-outline"
    empty-title="No categories found"
    empty-text="Categories will appear here once configured."
  />
</template>

<script setup>
import { onMounted } from 'vue';
import ResourceListPage from '@/components/resources/ResourceListPage.vue';
import { useResourceList } from '@/composables/useResourceList';

const { items, count, loading, error, load } = useResourceList('/categories');

const columns = [
  { key: 'name', title: 'Name', value: (item) => item.name || item.title || 'Untitled category' },
  { key: 'description', title: 'Description' },
  { key: 'type', title: 'Type', chip: true, value: (item) => item.type || 'General' },
];

onMounted(load);
</script>

