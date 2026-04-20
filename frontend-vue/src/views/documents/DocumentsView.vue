<template>
  <ResourceListPage
    eyebrow="Documents"
    title="Document Library"
    subtitle="Browse managed documents and review status from the existing DocMan API."
    :items="items"
    :columns="columns"
    :count="count"
    :loading="loading"
    :error="error"
    :item-path="(item) => `/documents/${item._id || item.id}`"
    empty-icon="mdi-file-document-outline"
    empty-title="No documents found"
    empty-text="Create documents in the existing app or seed data from the backend scripts."
  />
</template>

<script setup>
import { onMounted } from 'vue';
import ResourceListPage from '@/components/resources/ResourceListPage.vue';
import { useResourceList } from '@/composables/useResourceList';

const { items, count, loading, error, load } = useResourceList('/docs');

const columns = [
  { key: 'title', title: 'Title' },
  { key: 'category.name', title: 'Category', value: (item) => item.category?.name || item.category || 'Not set' },
  { key: 'author.username', title: 'Author', value: (item) => item.author?.username || item.author?.email || item.author || 'Not set' },
  { key: 'reviewCompleted', title: 'Review', chip: true, color: 'secondary', value: (item) => item.reviewCompleted ? 'Reviewed' : 'Open' },
];

onMounted(load);
</script>
