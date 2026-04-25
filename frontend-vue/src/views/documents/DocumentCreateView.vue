<template>
  <v-container class="py-8" fluid>
    <v-btn class="mb-4" variant="text" prepend-icon="mdi-arrow-left" to="/documents">
      Back to documents
    </v-btn>

    <v-alert
      v-if="loadError || submitError"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ loadError || submitError }}
    </v-alert>

    <v-skeleton-loader v-if="loading" type="article, actions" />

    <DocumentEditorForm
      v-else
      :form="form"
      :users="userOptions"
      :categories="categories"
      :external-contact-types="externalContactTypes"
      :errors="errors"
      title="Create Document"
      subtitle="Ported Vue/Vuetify workflow for document metadata, assignments, reviews, and upload."
      submit-label="Create Document"
      :submitting="submitting"
      :file-required="true"
      @submit="handleSubmit"
    />
  </v-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import DocumentEditorForm from '@/components/documents/DocumentEditorForm.vue';
import { useDocumentFormData } from '@/composables/useDocumentFormData';
import { api } from '@/services/api';
import { personName } from '@/lib/people';

const router = useRouter();
const { users, categories, externalContactTypes, loading, error: loadError, load } = useDocumentFormData();
const submitting = ref(false);
const submitError = ref('');
const errors = reactive({});

const form = reactive(createEmptyForm());

const userOptions = computed(() =>
  users.value.map((user) => ({
    ...user,
    displayName: personName(user),
  })),
);

onMounted(load);

async function handleSubmit() {
  clearErrors();
  submitError.value = '';

  if (!validateForm()) {
    return;
  }

  submitting.value = true;

  try {
    const payload = buildCreatePayload(form);
    const response = await api.post('/docs', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const documentId = response.data?.doc?._id;

    if (documentId && form.reviewAssignees.length > 0 && form.reviewDueDate) {
      await api.post('/reviews', {
        documentId,
        assignments: form.reviewAssignees.map((assignee) => ({
          assignee,
          dueDate: new Date(form.reviewDueDate).toISOString(),
          notes: form.reviewNotes || '',
        })),
      });
    }

    await router.push(documentId ? `/documents/${documentId}` : '/documents');
  } catch (requestError) {
    submitError.value = requestError.response?.data?.message || 'Could not create the document.';
  } finally {
    submitting.value = false;
  }
}

function createEmptyForm() {
  return {
    title: '',
    description: '',
    author: '',
    category: '',
    opensForReview: '',
    reviewInterval: 'quarterly',
    reviewIntervalDays: null,
    reviewPeriod: '2weeks',
    reviewDueDate: '',
    nextReviewDueOn: '',
    owners: [],
    stakeholders: [],
    reviewAssignees: [],
    reviewNotes: '',
    externalContacts: [],
    file: null,
  };
}

function clearErrors() {
  Object.keys(errors).forEach((key) => {
    delete errors[key];
  });
}

function validateForm() {
  if (!form.title.trim()) {
    errors.title = 'Title is required.';
  }

  if (!form.description.trim()) {
    errors.description = 'Description is required.';
  }

  if (!form.author) {
    errors.author = 'Author is required.';
  }

  if (!form.category) {
    errors.category = 'Category is required.';
  }

  if (!form.opensForReview) {
    errors.opensForReview = 'Opens For Review is required.';
  }

  if (form.reviewInterval === 'custom' && (!form.reviewIntervalDays || form.reviewIntervalDays < 1)) {
    errors.reviewIntervalDays = 'Provide a custom interval in days.';
  }

  const fileValue = Array.isArray(form.file) ? form.file[0] : form.file;
  if (!fileValue) {
    errors.file = 'A file is required.';
  }

  return Object.keys(errors).length === 0;
}

function buildCreatePayload(currentForm) {
  const payload = new FormData();
  payload.append('title', currentForm.title.trim());
  payload.append('description', currentForm.description.trim());
  payload.append('author', currentForm.author);
  payload.append('category', currentForm.category);
  payload.append('opensForReview', new Date(currentForm.opensForReview).toISOString());
  payload.append('reviewInterval', currentForm.reviewInterval);
  payload.append('reviewPeriod', currentForm.reviewPeriod);

  if (currentForm.reviewInterval === 'custom' && currentForm.reviewIntervalDays) {
    payload.append('reviewIntervalDays', String(currentForm.reviewIntervalDays));
  }

  if (currentForm.reviewDueDate) {
    payload.append('reviewDueDate', new Date(currentForm.reviewDueDate).toISOString());
  }

  if (currentForm.nextReviewDueOn) {
    payload.append('nextReviewDueOn', new Date(currentForm.nextReviewDueOn).toISOString());
  }

  if (currentForm.reviewNotes?.trim()) {
    payload.append('reviewNotes', currentForm.reviewNotes.trim());
  }

  payload.append('owners', JSON.stringify(currentForm.owners));
  payload.append('stakeholders', JSON.stringify(currentForm.stakeholders));
  payload.append('reviewAssignees', JSON.stringify(currentForm.reviewAssignees));

  const externalContacts = currentForm.externalContacts
    .filter((contact) => contact.name?.trim() && contact.email?.trim())
    .map((contact) => ({
      name: contact.name.trim(),
      email: contact.email.trim(),
      phoneNumber: contact.phoneNumber?.trim() || '',
      type: contact.type || null,
    }));

  if (externalContacts.length > 0) {
    payload.append('externalContacts', JSON.stringify(externalContacts));
  }

  const fileValue = Array.isArray(currentForm.file) ? currentForm.file[0] : currentForm.file;
  if (fileValue) {
    payload.append('file', fileValue);
  }

  return payload;
}
</script>
