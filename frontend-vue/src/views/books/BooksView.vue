<template>
  <ResourceListPage
    eyebrow="Books"
    title="Books"
    subtitle="Review grouped document collections from DocMan."
    :items="items"
    :columns="columns"
    :count="count"
    :loading="loading"
    :error="error"
    empty-icon="mdi-book-open-page-variant-outline"
    empty-title="No books found"
    empty-text="Books will appear here once they exist in DocMan."
  />
</template>

<script setup>
import { onMounted } from 'vue';
import ResourceListPage from '@/components/resources/ResourceListPage.vue';
import { useResourceList } from '@/composables/useResourceList';

const { items, count, loading, error, load } = useResourceList('/books');

const columns = [
  { key: 'title', title: 'Title', value: (item) => item.title || item.name || 'Untitled book' },
  { key: 'description', title: 'Description' },
  { key: 'documents', title: 'Documents', chip: true, value: (item) => item.documents?.length || 0 },
];

onMounted(load);
</script>

