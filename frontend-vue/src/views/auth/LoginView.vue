<template>
  <v-container class="py-10" fluid>
    <v-row justify="center">
      <v-col cols="12" md="7" lg="5">
        <v-card class="pa-2">
          <v-card-title class="text-h4 font-weight-bold">
            Sign in to DocMan
          </v-card-title>
          <v-card-subtitle>
            Use your existing DocMan account to open the documents module.
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
                Sign in
              </v-btn>
            </v-form>
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
const { login, state } = useAuth();

const email = ref('');
const password = ref('');

async function submit() {
  await login(email.value, password.value);
  await router.push(route.query.redirect || '/documents');
}
</script>

