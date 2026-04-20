<template>
  <ResourceListPage
    eyebrow="Teams"
    title="Teams"
    subtitle="Review team spaces and member counts."
    :items="items"
    :columns="columns"
    :count="count"
    :loading="loading"
    :error="error"
    empty-icon="mdi-account-group-outline"
    empty-title="No teams found"
    empty-text="Teams will appear here when they are created."
  />
</template>

<script setup>
import { onMounted } from 'vue';
import ResourceListPage from '@/components/resources/ResourceListPage.vue';
import { useResourceList } from '@/composables/useResourceList';

const { items, count, loading, error, load } = useResourceList('/teams');

const columns = [
  { key: 'name', title: 'Name', value: (item) => item.name || 'Untitled team' },
  { key: 'description', title: 'Description' },
  { key: 'members', title: 'Members', chip: true, value: (item) => item.members?.length || 0 },
];

onMounted(load);
</script>

