<template>
  <ResourceListPage
    eyebrow="Projects"
    title="Projects"
    subtitle="Review project workspaces and linked documents."
    :items="items"
    :columns="columns"
    :count="count"
    :loading="loading"
    :error="error"
    empty-icon="mdi-briefcase-outline"
    empty-title="No projects found"
    empty-text="Projects will appear here when they are created."
  />
</template>

<script setup>
import { onMounted } from 'vue';
import ResourceListPage from '@/components/resources/ResourceListPage.vue';
import { useResourceList } from '@/composables/useResourceList';

const { items, count, loading, error, load } = useResourceList('/projects');

const columns = [
  { key: 'name', title: 'Name', value: (item) => item.name || item.title || 'Untitled project' },
  { key: 'description', title: 'Description' },
  { key: 'documents', title: 'Documents', chip: true, value: (item) => item.documents?.length || 0 },
  { key: 'collaborators', title: 'Collaborators', chip: true, value: (item) => item.collaborators?.length || 0 },
];

onMounted(load);
</script>

