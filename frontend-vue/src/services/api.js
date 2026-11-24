import axios from 'axios';
import { getRuntimeConfig, getStorageKey } from '@/runtime/config';

export function resolveApiBaseUrl() {
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig.apiBaseUrl) {
    return runtimeConfig.apiBaseUrl;
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5001/api`;
  }

  return '/api';
}

export const api = axios.create({
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  config.baseURL = config.baseURL || resolveApiBaseUrl();

  const token = localStorage.getItem(getStorageKey('token'));
  // Associate failures with the session that actually sent this request.
  config.docmanSessionToken = token || null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestToken = error.config?.docmanSessionToken;
    if (error.response?.status === 401 && requestToken === localStorage.getItem(getStorageKey('token'))) {
      localStorage.removeItem(getStorageKey('token'));
      localStorage.removeItem(getStorageKey('user'));
      window.dispatchEvent(new Event('docman:session-expired'));
    }

    return Promise.reject(error);
  },
);
