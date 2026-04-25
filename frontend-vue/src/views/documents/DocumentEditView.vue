<template>
  <v-container class="py-8" fluid>
    <v-btn class="mb-4" variant="text" prepend-icon="mdi-arrow-left" :to="backTarget">
      Back
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
      title="Edit Document"
      subtitle="Ported Vue/Vuetify metadata and assignment editing workflow."
      :cancel-to="backTarget"
      submit-label="Save Changes"
      :submitting="submitting"
      :show-file-upload="false"
      @submit="handleSubmit"
    />
  </v-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DocumentEditorForm from '@/components/documents/DocumentEditorForm.vue';
import { useDocumentFormData } from '@/composables/useDocumentFormData';
import { api } from '@/services/api';
import { personName } from '@/lib/people';

const route = useRoute();
const router = useRouter();
const submitting = ref(false);
const submitError = ref('');
const detailLoading = ref(false);
const detailError = ref('');
const errors = reactive({});

const { users, categories, externalContactTypes, loading: formDataLoading, error: formDataError, load } = useDocumentFormData();
const form = reactive(createEmptyForm());

const userOptions = computed(() =>
  users.value.map((user) => ({
    ...user,
    displayName: personName(user),
  })),
);

const loading = computed(() => formDataLoading.value || detailLoading.value);
const loadError = computed(() => formDataError.value || detailError.value);
const backTarget = computed(() => `/documents/${route.params.id}`);

onMounted(async () => {
  await Promise.all([load(), loadDocument()]);
});

async function loadDocument() {
  detailLoading.value = true;
  detailError.value = '';

  try {
    const response = await api.get(`/docs/${route.params.id}`);
    hydrateForm(response.data);
  } catch (requestError) {
    detailError.value = requestError.response?.data?.message || 'Could not load this document.';
  } finally {
    detailLoading.value = false;
  }
}

async function handleSubmit() {
  clearErrors();
  submitError.value = '';

  if (!validateForm()) {
    return;
  }

  submitting.value = true;

  try {
    await api.put(`/docs/${route.params.id}`, buildUpdatePayload(form));

    await router.push(`/documents/${route.params.id}`);
  } catch (requestError) {
    submitError.value = requestError.response?.data?.message || 'Could not update the document.';
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

function hydrateForm(document) {
  form.title = document.title || '';
  form.description = document.description || '';
  form.author = extractId(document.author);
  form.category = extractId(document.category);
  form.opensForReview = toInputDate(document.opensForReview || document.reviewDate);
  form.reviewInterval = document.reviewInterval || 'quarterly';
  form.reviewIntervalDays = document.reviewIntervalDays || null;
  form.reviewPeriod = document.reviewPeriod || '2weeks';
  form.reviewDueDate = toInputDate(document.reviewDueDate);
  form.nextReviewDueOn = toInputDate(document.nextReviewDueOn);
  form.owners = (document.owners || []).map(extractId).filter(Boolean);
  form.stakeholders = (document.stakeholders || []).map(extractId).filter(Boolean);
  form.reviewAssignees = (document.reviewAssignees || []).map(extractId).filter(Boolean);
  form.reviewNotes = document.reviewNotes || '';
  form.externalContacts = (document.externalContacts || []).map((contact) => ({
    name: contact.name || '',
    email: contact.email || '',
    phoneNumber: contact.phoneNumber || '',
    type: extractId(contact.type) || '',
  }));
}

function extractId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || '';
}

function toInputDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
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

  return Object.keys(errors).length === 0;
}

function buildUpdatePayload(currentForm) {
  const payload = {
    title: currentForm.title.trim(),
    description: currentForm.description.trim(),
    author: currentForm.author,
    category: currentForm.category,
    opensForReview: new Date(currentForm.opensForReview).toISOString(),
    reviewInterval: currentForm.reviewInterval,
    reviewPeriod: currentForm.reviewPeriod,
    reviewNotes: currentForm.reviewNotes?.trim() || '',
    owners: JSON.stringify(currentForm.owners),
    stakeholders: JSON.stringify(currentForm.stakeholders),
    reviewAssignees: JSON.stringify(currentForm.reviewAssignees),
    externalContacts: JSON.stringify(
      currentForm.externalContacts
        .filter((contact) => contact.name?.trim() && contact.email?.trim())
        .map((contact) => ({
          name: contact.name.trim(),
          email: contact.email.trim(),
          phoneNumber: contact.phoneNumber?.trim() || '',
          type: contact.type || null,
        })),
    ),
  };

  if (currentForm.reviewInterval === 'custom' && currentForm.reviewIntervalDays) {
    payload.reviewIntervalDays = currentForm.reviewIntervalDays;
  }

  if (currentForm.reviewDueDate) {
    payload.reviewDueDate = new Date(currentForm.reviewDueDate).toISOString();
  }

  if (currentForm.nextReviewDueOn) {
    payload.nextReviewDueOn = new Date(currentForm.nextReviewDueOn).toISOString();
  }

  return payload;
}
</script>
