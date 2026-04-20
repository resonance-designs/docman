import { createRouter, createWebHistory } from 'vue-router';
import SuiteHome from '@/views/SuiteHome.vue';
import LoginView from '@/views/auth/LoginView.vue';
import DocumentsView from '@/views/documents/DocumentsView.vue';
import DocumentDetailView from '@/views/documents/DocumentDetailView.vue';
import BooksView from '@/views/books/BooksView.vue';
import CategoriesView from '@/views/categories/CategoriesView.vue';
import TeamsView from '@/views/teams/TeamsView.vue';
import ProjectsView from '@/views/projects/ProjectsView.vue';
import { useAuth } from '@/composables/useAuth';

const routes = [
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
    path: '/documents',
    name: 'documents',
    component: DocumentsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/documents/:id',
    name: 'document-detail',
    component: DocumentDetailView,
    meta: { requiresAuth: true },
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
    meta: { requiresAuth: true, roles: ['editor', 'admin', 'superadmin'] },
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectsView,
    meta: { requiresAuth: true, roles: ['editor', 'admin', 'superadmin'] },
  },
];

const router = createRouter({
  history: createWebHistory(),
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

  return true;
});

export default router;
