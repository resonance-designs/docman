<template>
  <v-container class="py-8"><h1 class="text-h4 mb-4">Activity</h1>
    <v-alert v-if="error" type="error" class="mb-3">{{ error }}<v-btn variant="text" :loading="loading" @click="load">Refresh</v-btn></v-alert>
    <v-alert v-if="message" type="success" class="mb-3">{{ message }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate />
    <p v-else-if="!error && !items.length">No notifications yet.</p>
    <v-card v-for="item in items" :key="item._id" class="mb-3" :title="item.title">
      <v-card-text><div class="font-weight-medium mb-2">{{ item.relatedDoc?.title || item.relatedTeam?.name || item.relatedProject?.name }}</div>{{ item.message }}<div class="text-caption">{{ new Date(item.createdAt).toLocaleString() }}</div></v-card-text>
      <v-card-actions class="flex-wrap">
        <v-btn v-if="item.type === 'team_invitation' && item.invitationToken" color="primary" :loading="accepting === item._id" :disabled="Boolean(accepting)" @click="accept(item)">Accept team invitation</v-btn>
        <v-btn v-if="item.relatedDoc" :to="`/documents/${item.relatedDoc._id || item.relatedDoc}`">Open document</v-btn>
        <v-btn v-if="item.relatedTeam" to="/teams">Open teams</v-btn>
        <v-btn v-if="item.relatedProject" to="/projects">Open projects</v-btn>
        <v-btn v-if="!item.isRead" :loading="marking === item._id" :disabled="Boolean(marking)" @click="markRead(item)">Mark read</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import { api } from '@/services/api';
const message = ref(''), accepting = ref(null), marking = ref(null);
const items = ref([]), loading = ref(true), error = ref('');
async function load() { loading.value = true; error.value = ''; try { items.value = (await api.get('/notifications')).data; } catch { error.value = 'Could not load notifications.'; } finally { loading.value = false; } }
onMounted(load);
async function markRead(item) { if (marking.value) return; marking.value = item._id; error.value = ''; try { await api.patch(`/notifications/${item._id}/read`); item.isRead = true; } catch { error.value = 'Could not mark notification read.'; } finally { marking.value = null; } }
async function accept(item) {
  accepting.value = item._id; error.value = ''; message.value = '';
  try { const { data } = await api.post(`/teams/accept/${encodeURIComponent(item.invitationToken)}`); message.value = data.message; delete item.invitationToken; item.isRead = true; }
  catch (e) { error.value = e.response?.data?.message || 'Unable to accept invitation.'; }
  finally { accepting.value = null; }
}
</script>
