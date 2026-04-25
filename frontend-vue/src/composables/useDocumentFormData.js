import { ref } from 'vue';
import { api } from '@/services/api';
import { normalizeCollection } from '@/composables/useResourceList';

export function useDocumentFormData() {
  const users = ref([]);
  const categories = ref([]);
  const externalContactTypes = ref([]);
  const loading = ref(false);
  const error = ref('');

  async function load() {
    loading.value = true;
    error.value = '';

    try {
      const [usersResponse, categoriesResponse, externalTypesResponse] = await Promise.all([
        api.get('/users'),
        api.get('/categories'),
        api.get('/external-contacts/types'),
      ]);

      users.value = normalizeCollection(usersResponse.data).sort((left, right) =>
        `${left.firstname || ''} ${left.lastname || ''} ${left.email || ''}`.localeCompare(
          `${right.firstname || ''} ${right.lastname || ''} ${right.email || ''}`,
        ),
      );

      categories.value = normalizeCollection(categoriesResponse.data)
        .filter((category) => category.type === 'Document');

      externalContactTypes.value = Array.isArray(externalTypesResponse.data)
        ? externalTypesResponse.data
        : [];
    } catch (requestError) {
      error.value = requestError.response?.data?.message || 'Could not load document form data.';
      users.value = [];
      categories.value = [];
      externalContactTypes.value = [];
    } finally {
      loading.value = false;
    }
  }

  return {
    users,
    categories,
    externalContactTypes,
    loading,
    error,
    load,
  };
}
