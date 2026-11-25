<template>
  <v-app class="docman-appearance" :style="appearanceStyles">
    <div class="suite-shell">
      <v-navigation-drawer
        v-if="mobile || appearance.menuPosition !== 'top'"
        v-model="drawer"
        :location="appearance.menuPosition === 'right' ? 'right' : 'left'"
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
        <v-app-bar-nav-icon v-if="mobile || appearance.menuPosition !== 'top'" aria-label="Toggle navigation" @click="drawer = !drawer" />
        <v-app-bar-title class="suite-wordmark">
          <img v-if="appearance.logo.dataUrl && !logoFailed" :src="appearance.logo.dataUrl" @error="logoFailed = true" :alt="appearance.logo.alt" class="app-logo" />
          <span v-else>RDocMan</span>
        </v-app-bar-title>
        <v-spacer />
        <template v-if="mobile && isAuthenticated">
          <v-btn icon="mdi-account-outline" aria-label="My account" title="My account" to="/account" />
          <v-btn icon="mdi-bell-outline" aria-label="Activity" title="Activity" to="/notifications" />
          <v-btn icon="mdi-logout" aria-label="Sign out" title="Sign out" :loading="signingOut" @click="handleLogout" />
        </template>
        <template v-else>
        <v-btn v-if="isAuthenticated" variant="text" prepend-icon="mdi-account-outline" to="/account">My account</v-btn>
        <v-btn v-if="isAuthenticated" variant="text" prepend-icon="mdi-bell-outline" to="/notifications">
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
        </template>
        <template v-if="!mobile && appearance.menuPosition === 'top' && visibleNavItems.length" #extension>
          <nav class="top-navigation" aria-label="Main navigation">
            <v-btn v-for="item in visibleNavItems" :key="item.title" :to="item.to" :prepend-icon="item.icon" variant="text" size="small">{{ item.title }}</v-btn>
          </nav>
        </template>
      </v-app-bar>

      <v-main>
        <div class="app-page"><router-view /></div>
        <footer v-if="appearance.footer.enabled" class="app-footer" :style="{ backgroundColor: appearance.footer.backgroundColor, color: appearance.footer.textColor }">
          <span>{{ appearance.footer.text }}</span>
          <a v-if="appearance.footer.linkUrl && appearance.footer.linkLabel" :href="appearance.footer.linkUrl" :style="{ color: appearance.footer.textColor }" target="_blank" rel="noopener noreferrer">{{ appearance.footer.linkLabel }}</a>
        </footer>
      </v-main>
    </div>
  </v-app>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuth } from '@/composables/useAuth';

import { useAppearance } from '@/composables/useAppearance';
import { appearanceVariables } from '@/lib/appearance';
const { appearance, loadAppearance } = useAppearance();
const appearanceStyles = computed(() => appearanceVariables(appearance.value));
onMounted(() => { loadAppearance().catch(() => { /* Keep safe default branding if settings are temporarily unavailable. */ }); });
const { mobile } = useDisplay();
const router = useRouter();
const { isAuthenticated, hasRole, logout } = useAuth();
const drawer = ref(!mobile.value);
const signingOut = ref(false);
const logoFailed = ref(false);
watch(() => appearance.value.logo.dataUrl, () => { logoFailed.value = false; });
watch([mobile, () => appearance.value.menuPosition], () => { drawer.value = !mobile.value; });

const navItems = [
  {
    title: 'Documents',
    subtitle: 'Files and reviews',
    icon: 'mdi-file-document-outline',
    to: '/documents',
  },
  {
    title: 'Approvals',
    subtitle: 'Versions awaiting decision',
    icon: 'mdi-check-decagram-outline',
    to: '/approvals',
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
    roles: ['viewer', 'editor', 'admin', 'superadmin'],
  },
  {
    title: 'Projects',
    subtitle: 'Delivery spaces',
    icon: 'mdi-briefcase-outline',
    to: '/projects',
    roles: ['viewer', 'editor', 'admin', 'superadmin'],
  },
  {
    title: 'System Settings',
    subtitle: 'Security, users, email, storage',
    icon: 'mdi-cog-outline',
    to: '/admin/system',
    roles: ['admin', 'superadmin'],
  },
];

const visibleNavItems = computed(() => {
  if (!isAuthenticated.value) {
    return [];
  }

  return navItems.filter((item) => !item.roles || hasRole(item.roles));
});

async function handleLogout() {
  if (signingOut.value) return;
  signingOut.value = true;
  try { await logout(); await router.push('/login'); }
  finally { signingOut.value = false; }
}
</script>
