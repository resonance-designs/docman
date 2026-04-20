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
      <v-row>
        <v-col cols="12" lg="8">
          <v-card>
            <v-card-title class="text-h4 font-weight-bold">
              {{ document.title }}
            </v-card-title>
            <v-card-subtitle>
              Version {{ document.currentVersion || 1 }} · {{ reviewLabel }}
            </v-card-subtitle>
            <v-card-text>
              <p class="text-body-1 mb-6">{{ document.description }}</p>

              <v-row>
                <v-col cols="12" md="6">
                  <v-list density="comfortable">
                    <v-list-item prepend-icon="mdi-account-outline" title="Author" :subtitle="personName(document.author)" />
                    <v-list-item prepend-icon="mdi-folder-outline" title="Category" :subtitle="document.category?.name || document.category || 'Not set'" />
                    <v-list-item prepend-icon="mdi-calendar-start" title="Opens for Review" :subtitle="formatDate(document.opensForReview)" />
                  </v-list>
                </v-col>
                <v-col cols="12" md="6">
                  <v-list density="comfortable">
                    <v-list-item prepend-icon="mdi-calendar-check" title="Next Review Due" :subtitle="formatDate(document.nextReviewDueOn)" />
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
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useResourceDetail } from '@/composables/useResourceDetail';

const route = useRoute();
const { item: document, loading, error, load } = useResourceDetail((id) => `/docs/${id}`);

const reviewLabel = computed(() => document.value?.reviewCompleted ? 'Review complete' : 'Review open');

function personName(person) {
  if (!person) {
    return 'Not set';
  }

  if (typeof person === 'string') {
    return person;
  }

  const fullName = [person.firstname, person.lastname].filter(Boolean).join(' ');
  return fullName || person.username || person.email || 'Not set';
}

function formatDate(value) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

onMounted(() => load(route.params.id));
</script>

