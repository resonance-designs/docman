import axios from 'axios';
import { getRuntimeConfig, getStorageKey } from '@/runtime/config';

function resolveApiBaseUrl() {
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
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(getStorageKey('token'));
      localStorage.removeItem(getStorageKey('user'));
    }

    return Promise.reject(error);
  },
);
