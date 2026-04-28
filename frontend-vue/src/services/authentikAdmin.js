import { api } from '@/services/api';

export async function fetchUnlinkedAuthentikUsers(limit = 250) {
  const response = await api.get('/users/authentik/unlinked', {
    params: { limit },
  });

  return response.data;
}

export async function linkAuthentikUser(payload) {
  const response = await api.post('/users/authentik/link', payload);
  return response.data;
}
