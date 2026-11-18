<template>
  <v-container class="py-8"><h1 class="text-h4 mb-4">Activity</h1>
    <v-alert v-if="error" type="error">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate />
    <p v-else-if="!items.length">No notifications yet.</p>
    <v-card v-for="item in items" :key="item._id" class="mb-3" :title="item.title">
      <v-card-text>{{ item.message }}<div class="text-caption">{{ new Date(item.createdAt).toLocaleString() }}</div></v-card-text>
      <v-card-actions>
        <v-btn v-if="item.relatedDoc" :to="`/documents/${item.relatedDoc._id || item.relatedDoc}`">Open document</v-btn>
        <v-btn v-if="!item.isRead" @click="markRead(item)">Mark read</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import { api } from '@/services/api';
const items = ref([]), loading = ref(true), error = ref('');
onMounted(async () => { try { items.value = (await api.get('/notifications')).data; } catch { error.value = 'Could not load notifications.'; } finally { loading.value = false; } });
async function markRead(item) { try { await api.patch(`/notifications/${item._id}/read`); item.isRead = true; } catch { error.value = 'Could not mark notification read.'; } }
</script>
