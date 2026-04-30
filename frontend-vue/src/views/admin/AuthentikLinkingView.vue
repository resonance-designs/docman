<template>
  <v-container class="py-8" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <div class="text-overline text-primary">Suite Identity</div>
        <h1 class="text-h4 font-weight-bold">Authentik Linking</h1>
        <p class="text-body-1 text-medium-emphasis mb-0">
          Link existing RDocMan users to Authentik subject IDs so suite-issued tokens can resolve local authorization.
        </p>
      </div>
      <div class="d-flex align-center ga-3">
        <v-chip color="primary" variant="tonal" size="large">
          {{ users.length }} unlinked
        </v-chip>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="loadUsers"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <v-alert
      class="mb-4"
      type="info"
      variant="tonal"
      density="comfortable"
    >
      Verified Authentik emails now auto-link existing RDocMan users and can provision new viewer accounts on first sign-in. Use this screen for manual pre-linking, exceptions, and repair work.
    </v-alert>

    <v-alert
      v-if="error"
      class="mb-4"
      type="error"
      variant="tonal"
      density="comfortable"
    >
      {{ error }}
    </v-alert>

    <v-alert
      v-if="successMessage"
      class="mb-4"
      type="success"
      variant="tonal"
      density="comfortable"
    >
      {{ successMessage }}
    </v-alert>

    <v-card>
      <v-card-text>
        <v-skeleton-loader v-if="loading" type="table" />

        <v-empty-state
          v-else-if="users.length === 0"
          icon="mdi-account-check-outline"
          title="No unlinked users found"
          text="Every visible RDocMan user already has an Authentik subject mapping."
        />

        <v-table v-else>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Lookup</th>
              <th>Authentik Subject</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user._id">
              <td>
                <div class="font-weight-medium">
                  {{ [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username }}
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ user.email }}
                </div>
              </td>
              <td>
                <v-chip size="small" variant="tonal" color="primary">
                  {{ user.role }}
                </v-chip>
              </td>
              <td class="text-body-2 text-medium-emphasis">
                <div><strong>ID:</strong> {{ user._id }}</div>
                <div><strong>Username:</strong> {{ user.username }}</div>
              </td>
              <td>
                <v-text-field
                  v-model="linkInputs[user._id]"
                  label="authentikSub"
                  density="compact"
                  hide-details
                  placeholder="Paste Authentik subject ID"
                />
              </td>
              <td class="authentik-linking__actions">
                <v-btn
                  color="primary"
                  variant="flat"
                  size="small"
                  :loading="linkingUserId === user._id"
                  :disabled="!linkInputs[user._id]?.trim()"
                  @click="linkUser(user)"
                >
                  Link
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { fetchUnlinkedAuthentikUsers, linkAuthentikUser } from '@/services/authentikAdmin';

const users = ref([]);
const loading = ref(false);
const linkingUserId = ref('');
const error = ref('');
const successMessage = ref('');
const linkInputs = ref({});

async function loadUsers() {
  loading.value = true;
  error.value = '';

  try {
    const response = await fetchUnlinkedAuthentikUsers();
    users.value = response.users || [];
  } catch (loadError) {
    error.value = loadError.response?.data?.message || 'Failed to load unlinked users.';
  } finally {
    loading.value = false;
  }
}

async function linkUser(user) {
  const authentikSub = linkInputs.value[user._id]?.trim();
  if (!authentikSub) {
    return;
  }

  linkingUserId.value = user._id;
  error.value = '';
  successMessage.value = '';

  try {
    const response = await linkAuthentikUser({
      userId: user._id,
      authentikSub,
    });

    users.value = users.value.filter((entry) => entry._id !== user._id);
    delete linkInputs.value[user._id];
    successMessage.value = response.message || `Linked ${user.email} successfully.`;
  } catch (linkError) {
    error.value = linkError.response?.data?.message || 'Failed to link user to Authentik.';
  } finally {
    linkingUserId.value = '';
  }
}

onMounted(loadUsers);
</script>
