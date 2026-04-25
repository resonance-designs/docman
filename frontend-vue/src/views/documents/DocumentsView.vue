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
    empty-text="Create documents directly in the Vue/Vuetify workflow or seed data from backend scripts."
  >
    <template #actions>
      <v-btn
        v-if="canCreate"
        color="primary"
        prepend-icon="mdi-file-plus-outline"
        to="/documents/create"
      >
        Create Document
      </v-btn>
    </template>
  </ResourceListPage>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import ResourceListPage from '@/components/resources/ResourceListPage.vue';
import { useResourceList } from '@/composables/useResourceList';
import { useAuth } from '@/composables/useAuth';

const { items, count, loading, error, load } = useResourceList('/docs');
const { hasRole } = useAuth();
const canCreate = computed(() => hasRole(['editor', 'admin', 'superadmin']));

const columns = [
  { key: 'title', title: 'Title' },
  { key: 'category.name', title: 'Category', value: (item) => item.category?.name || item.category || 'Not set' },
  { key: 'author.username', title: 'Author', value: (item) => item.author?.username || item.author?.email || item.author || 'Not set' },
  { key: 'reviewCompleted', title: 'Review', chip: true, color: 'secondary', value: (item) => item.reviewCompleted ? 'Reviewed' : 'Open' },
];

onMounted(load);
</script>
