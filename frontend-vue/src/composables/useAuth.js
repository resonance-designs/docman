import { computed, reactive } from 'vue';
import { api } from '@/services/api';
import { getStorageKey } from '@/runtime/config';

const state = reactive({
  token: null,
  user: null,
  loading: false,
  error: '',
});

syncStateFromStorage();

function readStoredUser() {
  const stored = localStorage.getItem(getStorageKey('user'));
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(getStorageKey('user'));
    return null;
  }
}

function persistSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem(getStorageKey('token'), token);
  localStorage.setItem(getStorageKey('user'), JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem(getStorageKey('token'));
  localStorage.removeItem(getStorageKey('user'));
}

function syncStateFromStorage() {
  state.token = localStorage.getItem(getStorageKey('token'));
  state.user = readStoredUser();
}

export function useAuth() {
  syncStateFromStorage();

  const isAuthenticated = computed(() => Boolean(state.token));
  const userRole = computed(() => state.user?.role || null);

  async function login(email, password) {
    state.loading = true;
    state.error = '';

    try {
      const response = await api.post('/auth/login', { email, password });
      persistSession(response.data.token, response.data.user);
      return response.data.user;
    } catch (error) {
      state.error = error.response?.data?.message || 'Login failed.';
      throw error;
    } finally {
      state.loading = false;
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout should still succeed if the backend is unavailable.
    } finally {
      clearSession();
    }
  }

  function hasRole(roles) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(userRole.value);
  }

  return {
    state,
    isAuthenticated,
    userRole,
    login,
    logout,
    hasRole,
  };
}
