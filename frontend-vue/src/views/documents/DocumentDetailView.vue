<template>
  <v-container class="py-8" fluid>
    <v-btn class="mb-4" variant="text" prepend-icon="mdi-arrow-left" to="/documents">
      Back to documents
    </v-btn>

    <v-alert
      v-if="error"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ error }}
    </v-alert>

    <v-skeleton-loader v-if="loading" type="article, actions" />

    <template v-else-if="document">
      <PublicSharingCard v-if="canEdit" :key="document._id" :document-id="document._id" />
      <v-row>
        <v-col cols="12" lg="8">
          <v-card>
            <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-4">
              <span class="text-h4 font-weight-bold">{{ document.title }}</span>
              <v-btn
                v-if="canEdit"
                color="primary"
                prepend-icon="mdi-file-document-edit-outline"
                :to="`/documents/${document._id}/edit`"
              >
                Edit
              </v-btn>
            </v-card-title>
            <v-card-subtitle>
              {{ document.currentVersion ? `Published version ${document.currentVersion}` : 'No published version yet' }}
              <span v-if="document.latestVersion > document.currentVersion"> · v{{ document.latestVersion }} in approval workflow</span>
              · {{ reviewLabel }}
            </v-card-subtitle>
            <v-card-text>
              <p class="text-body-1 mb-6">{{ document.description }}</p>

              <v-row>
                <v-col cols="12" md="6">
                  <v-list density="comfortable">
                    <v-list-item prepend-icon="mdi-account-outline" title="Author" :subtitle="personName(document.author)" />
                    <v-list-item prepend-icon="mdi-folder-outline" title="Category" :subtitle="document.category?.name || document.category || 'Not set'" />
                    <v-list-item prepend-icon="mdi-calendar-start" title="Opens for Review" :subtitle="formatCalendarDate(document.opensForReview)" />
                  </v-list>
                </v-col>
                <v-col cols="12" md="6">
                  <v-list density="comfortable">
                    <v-list-item prepend-icon="mdi-calendar-check" title="Next Review Due" :subtitle="formatCalendarDate(document.nextReviewDueOn)" />
                    <v-list-item prepend-icon="mdi-update" title="Updated" :subtitle="formatDate(document.updatedAt)" />
                    <v-list-item prepend-icon="mdi-clock-outline" title="Created" :subtitle="formatDate(document.createdAt)" />
                  </v-list>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card title="Review State">
            <v-card-text>
              <v-chip :color="document.reviewCompleted ? 'success' : 'warning'" variant="tonal">
                {{ reviewLabel }}
              </v-chip>
              <v-divider class="my-4" />
              <div class="text-subtitle-2 mb-2">Owners</div>
              <v-chip-group>
                <v-chip v-for="owner in document.owners || []" :key="owner._id || owner">
                  {{ personName(owner) }}
                </v-chip>
              </v-chip-group>
              <div v-if="!document.owners?.length" class="text-medium-emphasis">No owners assigned.</div>
              <div class="text-subtitle-2 mt-4 mb-2">Approvers</div>
              <v-chip-group>
                <v-chip v-for="approver in document.approvers || []" :key="approver._id || approver">
                  {{ personName(approver) }}
                </v-chip>
              </v-chip-group>
              <div v-if="!document.approvers?.length" class="text-medium-emphasis">Owners approve new versions.</div>
            </v-card-text>
            <v-card-actions v-if="isAdmin">
              <v-btn color="error" variant="text" prepend-icon="mdi-delete-outline" @click="deleteDialog = true">
                Delete document
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <v-col cols="12">
          <DocumentVersionsPanel :document="document" :current-user="currentUser" @changed="refresh" />
        </v-col>

        <v-col cols="12">
          <DocumentHistoryPanel ref="historyPanel" :document-id="document._id" />
        </v-col>
      </v-row>

      <v-dialog v-model="deleteDialog" max-width="520">
        <v-card title="Delete document">
          <v-card-text>
            <p class="mb-3">
              The document is hidden from everyone but kept with all of its versions, revision history, and audit trail.
              An administrator can restore it later.
            </p>
            <v-textarea v-model="deleteReason" label="Reason (required)" rows="3" auto-grow />
            <v-alert v-if="deleteError" type="error" variant="tonal">{{ deleteError }}</v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
            <v-btn color="error" :loading="deleting" :disabled="!deleteReason.trim()" @click="deleteDocument">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-container>
</template>

<script setup>
import PublicSharingCard from '@/components/PublicSharingCard.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useResourceDetail } from '@/composables/useResourceDetail';
import { useAuth } from '@/composables/useAuth';
import { personName } from '@/lib/people';
import { errorMessage, formatDate, formatCalendarDate } from '@/lib/format';
import { api } from '@/services/api';
import DocumentVersionsPanel from '@/components/documents/DocumentVersionsPanel.vue';
import DocumentHistoryPanel from '@/components/documents/DocumentHistoryPanel.vue';

const route = useRoute();
const router = useRouter();
const { item: document, loading, error, load } = useResourceDetail((id) => `/docs/${id}`);
const { hasRole, state } = useAuth();

const historyPanel = ref(null);
const deleteDialog = ref(false);
const deleteReason = ref('');
const deleteError = ref('');
const deleting = ref(false);

const currentUser = computed(() => state.user);
const isAdmin = computed(() => hasRole(['admin', 'superadmin']));
const reviewLabel = computed(() => document.value?.reviewCompleted ? 'Review complete' : 'Review open');
const canEdit = computed(() => {
  if (isAdmin.value) return true;
  if (!hasRole(['editor'])) return false;
  const userId = String(state.user?.id || state.user?._id || '');
  const idOf = (value) => String(value?._id || value || '');
  return idOf(document.value?.author) === userId || (document.value?.owners || []).some((owner) => idOf(owner) === userId);
});

async function refresh() {
  await load(route.params.id);
  historyPanel.value?.load();
}

async function deleteDocument() {
  deleting.value = true;
  deleteError.value = '';
  try {
    await api.delete(`/docs/${document.value._id}`, { data: { reason: deleteReason.value.trim() } });
    deleteDialog.value = false;
    await router.push('/documents');
  } catch (err) {
    deleteError.value = errorMessage(err, 'Delete failed.');
  } finally {
    deleting.value = false;
  }
}

onMounted(() => load(route.params.id));
</script>
