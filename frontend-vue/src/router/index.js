import AcceptInvitationView from '@/views/auth/AcceptInvitationView.vue';
import RegisterView from '@/views/auth/RegisterView.vue';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';
import SuiteHome from '@/views/SuiteHome.vue';
import LoginView from '@/views/auth/LoginView.vue';
import AuthentikCallbackView from '@/views/auth/AuthentikCallbackView.vue';
import DocumentsView from '@/views/documents/DocumentsView.vue';
import DocumentDetailView from '@/views/documents/DocumentDetailView.vue';
import DocumentCreateView from '@/views/documents/DocumentCreateView.vue';
import DocumentEditView from '@/views/documents/DocumentEditView.vue';
import BooksView from '@/views/books/BooksView.vue';
import CategoriesView from '@/views/categories/CategoriesView.vue';
import TeamsView from '@/views/teams/TeamsView.vue';
import ProjectsView from '@/views/projects/ProjectsView.vue';
import SystemSettingsView from '@/views/admin/SystemSettingsView.vue';
import ApprovalsView from '@/views/approvals/ApprovalsView.vue';
import { useAuth } from '@/composables/useAuth';

const routes = [
  { path: '/public/documents/:token', component: () => import('@/views/documents/PublicDocumentView.vue'), meta: { public: true } },
  { path: '/account', component: () => import('@/views/AccountView.vue'), meta: { requiresAuth: true } },
  { path: '/accept-invitation', component: AcceptInvitationView },
  { path: '/register', component: RegisterView },
  { path: '/notifications', component: () => import('@/views/NotificationsView.vue'), meta: { requiresAuth: true } },
  { path: '/admin/users', name: 'user-management', redirect: to => ({ name: 'system-settings', query: { ...to.query, tab: 'security', section: 'users' }, hash: to.hash }), meta: { requiresAuth: true, roles: ['superadmin'] } },
  {
    path: '/',
    name: 'home',
    component: SuiteHome,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },
  {
    path: '/auth/callback',
    name: 'authentik-callback',
    component: AuthentikCallbackView,
    meta: { public: true },
  },
  {
    path: '/documents',
    name: 'documents',
    component: DocumentsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/documents/create',
    name: 'document-create',
    component: DocumentCreateView,
    meta: { requiresAuth: true, roles: ['editor', 'admin', 'superadmin'] },
  },
  {
    path: '/documents/:id',
    name: 'document-detail',
    component: DocumentDetailView,
    meta: { requiresAuth: true },
  },
  {
    path: '/documents/:id/edit',
    name: 'document-edit',
    component: DocumentEditView,
    meta: { requiresAuth: true, roles: ['editor', 'admin', 'superadmin'] },
  },
  {
    path: '/books',
    name: 'books',
    component: BooksView,
    meta: { requiresAuth: true },
  },
  {
    path: '/categories',
    name: 'categories',
    component: CategoriesView,
    meta: { requiresAuth: true },
  },
  {
    path: '/teams',
    name: 'teams',
    component: TeamsView,
    meta: { requiresAuth: true, roles: ['viewer', 'editor', 'admin', 'superadmin'] },
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectsView,
    meta: { requiresAuth: true, roles: ['viewer', 'editor', 'admin', 'superadmin'] },
  },
  {
    path: '/approvals',
    name: 'approvals',
    component: ApprovalsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/audit',
    name: 'audit-log',
    redirect: to => ({ name: 'system-settings', query: { ...to.query, tab: 'security', section: 'audit' }, hash: to.hash }),
    meta: { requiresAuth: true, roles: ['admin', 'superadmin'] },
  },
  {
    path: '/admin/system',
    name: 'system-settings',
    component: SystemSettingsView,
    meta: { requiresAuth: true, roles: ['admin', 'superadmin'] },
  },
  {
    path: '/admin/authentik-linking',
    name: 'authentik-linking',
    redirect: to => ({ name: 'system-settings', query: { ...to.query, tab: 'security', section: 'authentik' }, hash: to.hash }),
    meta: { requiresAuth: true, roles: ['superadmin'] },
  },
];

export function createDocManRouter(runtimeConfig = {}) {
  const history = runtimeConfig.embedded
    ? createMemoryHistory()
    : createWebHistory(runtimeConfig.routerBase);

  const router = createRouter({
    history,
    routes,
  });

  router.beforeEach((to) => {
    const { isAuthenticated, hasRole } = useAuth();

    if (to.meta.requiresAuth && !isAuthenticated.value) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    if (to.meta.roles && !hasRole(to.meta.roles)) {
      return { name: 'home' };
    }

    // Redirect source guards do not execute: enforce privileged settings on the target.
    if (to.name === 'system-settings' && (
      ['email', 'updates'].includes(to.query.tab) || ['users', 'authentik'].includes(to.query.section)
    ) && !hasRole(['superadmin'])) {
      return { name: 'home' };
    }

    return true;
  });

  return router;
}
