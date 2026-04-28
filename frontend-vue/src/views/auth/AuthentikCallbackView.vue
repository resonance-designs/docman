<template>
  <v-container class="py-10" fluid>
    <v-row justify="center">
      <v-col cols="12" md="7" lg="5">
        <v-card class="pa-2">
          <v-card-title class="text-h5 font-weight-bold">
            Completing suite sign-in
          </v-card-title>
          <v-card-subtitle>
            We are validating your Resonance Designs account and resolving your local RDocMan access.
          </v-card-subtitle>

          <v-card-text>
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              density="comfortable"
              class="mb-4"
            >
              {{ error }}
            </v-alert>

            <div v-else class="d-flex align-center ga-4">
              <v-progress-circular indeterminate color="primary" />
              <span class="text-body-1">Please wait while we complete sign-in.</span>
            </div>

            <v-btn
              v-if="error"
              class="mt-4"
              color="primary"
              variant="flat"
              to="/login"
            >
              Back to login
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const route = useRoute();
const router = useRouter();
const error = ref('');
const { completeAuthentikLogin } = useAuth();

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : '';
  const returnedState = typeof route.query.state === 'string' ? route.query.state : '';

  if (!code || !returnedState) {
    error.value = 'Missing Authentik authorization response parameters.';
    return;
  }

  try {
    const result = await completeAuthentikLogin(code, returnedState);
    await router.replace(result.redirectPath || '/documents');
  } catch (callbackError) {
    error.value = callbackError.message || 'Failed to complete Authentik sign-in.';
  }
});
</script>
