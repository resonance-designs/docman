<template>
  <v-container class="py-10" fluid>
    <v-row justify="center">
      <v-col cols="12" md="7" lg="5">
        <v-card class="pa-2">
          <v-card-title class="text-h4 font-weight-bold">
            Sign in to RDocMan
          </v-card-title>
          <v-card-subtitle>
            Use your Resonance Designs account when available, or keep using the local DocMan login during migration.
          </v-card-subtitle>

          <v-card-text>
            <v-alert
              v-if="state.error"
              class="mb-4"
              type="error"
              variant="tonal"
              density="comfortable"
            >
              {{ state.error }}
            </v-alert>

            <v-form @submit.prevent="submit">
              <v-text-field
                v-model="email"
                label="Email or username"
                autocomplete="username"
                prepend-inner-icon="mdi-account-outline"
                required
              />
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                autocomplete="current-password"
                prepend-inner-icon="mdi-lock-outline"
                required
              />
              <v-btn
                class="mt-2"
                color="primary"
                type="submit"
                block
                :loading="state.loading"
              >
                Sign in with local DocMan account
              </v-btn>
            </v-form>

            <div v-if="authentikAvailable" class="my-6 d-flex align-center ga-3">
              <v-divider />
              <span class="text-caption text-medium-emphasis">or</span>
              <v-divider />
            </div>

            <v-btn
              v-if="authentikAvailable"
              color="secondary"
              variant="tonal"
              block
              prepend-icon="mdi-account-key-outline"
              :loading="state.loading"
              @click="submitAuthentik"
            >
              Sign in with Resonance Account
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const route = useRoute();
const router = useRouter();
const { login, state, authentikAvailable, startAuthentikLogin } = useAuth();

const email = ref('');
const password = ref('');

async function submit() {
  await login(email.value, password.value);
  await router.push(route.query.redirect || '/documents');
}

async function submitAuthentik() {
  await startAuthentikLogin(typeof route.query.redirect === 'string' ? route.query.redirect : '/documents');
}
</script>
