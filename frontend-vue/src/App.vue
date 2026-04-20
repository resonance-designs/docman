<template>
  <v-app>
    <div class="suite-shell">
      <v-navigation-drawer
        v-model="drawer"
        :temporary="mobile"
        width="280"
      >
        <v-list density="comfortable" nav>
          <v-list-subheader>Resonance Suite</v-list-subheader>
          <v-list-item
            v-for="item in visibleNavItems"
            :key="item.title"
            :prepend-icon="item.icon"
            :title="item.title"
            :subtitle="item.subtitle"
            :to="item.to"
            rounded="sm"
          />
        </v-list>
      </v-navigation-drawer>

      <v-app-bar flat border color="surface">
        <v-app-bar-nav-icon @click="drawer = !drawer" />
        <v-app-bar-title class="suite-wordmark">
          DocMan
        </v-app-bar-title>
        <v-spacer />
        <v-btn v-if="isAuthenticated" variant="text" prepend-icon="mdi-bell-outline">
          Activity
        </v-btn>
        <v-btn
          v-if="isAuthenticated"
          variant="outlined"
          prepend-icon="mdi-logout"
          @click="handleLogout"
        >
          Sign out
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="flat"
          prepend-icon="mdi-login"
          to="/login"
        >
          Sign in
        </v-btn>
      </v-app-bar>

      <v-main>
        <router-view />
      </v-main>
    </div>
  </v-app>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuth } from '@/composables/useAuth';

const { mobile } = useDisplay();
const router = useRouter();
const { isAuthenticated, hasRole, logout } = useAuth();
const drawer = ref(true);

const navItems = [
  {
    title: 'Documents',
    subtitle: 'Files and reviews',
    icon: 'mdi-file-document-outline',
    to: '/documents',
  },
  {
    title: 'Books',
    subtitle: 'Grouped document sets',
    icon: 'mdi-book-open-page-variant-outline',
    to: '/books',
  },
  {
    title: 'Categories',
    subtitle: 'Classification',
    icon: 'mdi-folder-outline',
    to: '/categories',
  },
  {
    title: 'Teams',
    subtitle: 'People and permissions',
    icon: 'mdi-account-group-outline',
    to: '/teams',
    roles: ['editor', 'admin', 'superadmin'],
  },
  {
    title: 'Projects',
    subtitle: 'Delivery spaces',
    icon: 'mdi-briefcase-outline',
    to: '/projects',
    roles: ['editor', 'admin', 'superadmin'],
  },
];

const visibleNavItems = computed(() => {
  if (!isAuthenticated.value) {
    return [];
  }

  return navItems.filter((item) => !item.roles || hasRole(item.roles));
});

async function handleLogout() {
  await logout();
  await router.push('/login');
}
</script>
