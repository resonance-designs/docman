<template>
  <v-form @submit.prevent="$emit('submit')">
    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>{{ title }}</v-card-title>
          <v-card-subtitle>{{ subtitle }}</v-card-subtitle>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="form.title"
                  label="Title"
                  :error-messages="errors.title"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="form.description"
                  label="Description"
                  rows="4"
                  :error-messages="errors.description"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="form.author"
                  label="Author"
                  :items="users"
                  item-title="displayName"
                  item-value="_id"
                  :error-messages="errors.author"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="form.category"
                  label="Category"
                  :items="categories"
                  item-title="name"
                  item-value="_id"
                  :error-messages="errors.category"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.opensForReview"
                  label="Opens For Review"
                  type="date"
                  :error-messages="errors.opensForReview"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="form.reviewInterval"
                  label="Review Interval"
                  :items="reviewIntervals"
                  item-title="label"
                  item-value="value"
                />
              </v-col>

              <v-col v-if="form.reviewInterval === 'custom'" cols="12" md="6">
                <v-text-field
                  v-model.number="form.reviewIntervalDays"
                  label="Custom Interval Days"
                  type="number"
                  min="1"
                  :error-messages="errors.reviewIntervalDays"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="form.reviewPeriod"
                  label="Review Period"
                  :items="reviewPeriods"
                  item-title="label"
                  item-value="value"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="form.reviewDueDate"
                  label="Review Due Date"
                  type="date"
                  readonly
                  hint="Calculated from Opens For Review + Review Period"
                  persistent-hint
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="form.nextReviewDueOn"
                  label="Next Review Due On"
                  type="date"
                  readonly
                  hint="Calculated from review interval"
                  persistent-hint
                />
              </v-col>

              <v-col cols="12" v-if="showFileUpload">
                <v-file-input
                  v-model="form.file"
                  label="Document File"
                  :error-messages="errors.file"
                  :rules="fileRules"
                  show-size
                  :required="fileRequired"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>Assignments</v-card-title>
          <v-card-text>
            <v-select
              v-model="form.owners"
              class="mb-4"
              label="Owners"
              :items="users"
              item-title="displayName"
              item-value="_id"
              chips
              multiple
            />

            <v-select
              v-model="form.stakeholders"
              class="mb-4"
              label="Stakeholders"
              :items="users"
              item-title="displayName"
              item-value="_id"
              chips
              multiple
            />

            <v-select
              v-model="form.reviewAssignees"
              label="Review Assignees"
              :items="users"
              item-title="displayName"
              item-value="_id"
              chips
              multiple
            />

            <v-textarea
              v-model="form.reviewNotes"
              class="mt-4"
              label="Review Notes"
              rows="3"
            />
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>External Contacts</v-card-title>
          <v-card-text>
            <div
              v-for="(contact, index) in form.externalContacts"
              :key="`contact-${index}`"
              class="mb-4 rounded-sm border pa-3"
            >
              <v-text-field
                v-model="contact.name"
                label="Name"
                density="compact"
              />
              <v-text-field
                v-model="contact.email"
                class="mt-2"
                label="Email"
                density="compact"
              />
              <v-text-field
                v-model="contact.phoneNumber"
                class="mt-2"
                label="Phone"
                density="compact"
              />
              <v-select
                v-model="contact.type"
                class="mt-2"
                label="Type"
                :items="externalContactTypes"
                item-title="name"
                item-value="_id"
                density="compact"
              />
              <v-btn
                class="mt-2"
                color="error"
                size="small"
                variant="text"
                prepend-icon="mdi-delete-outline"
                @click="removeExternalContact(index)"
              >
                Remove Contact
              </v-btn>
            </div>

            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="addExternalContact"
            >
              Add External Contact
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <div class="d-flex flex-wrap justify-space-between ga-3 mt-6">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="cancelTo">
        Cancel
      </v-btn>
      <v-btn color="primary" variant="flat" type="submit" :loading="submitting">
        {{ submitLabel }}
      </v-btn>
    </div>
  </v-form>
</template>

<script setup>
import { computed, watch } from 'vue';

const props = defineProps({
  form: {
    type: Object,
    required: true,
  },
  users: {
    type: Array,
    default: () => [],
  },
  categories: {
    type: Array,
    default: () => [],
  },
  externalContactTypes: {
    type: Array,
    default: () => [],
  },
  errors: {
    type: Object,
    default: () => ({}),
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  cancelTo: {
    type: String,
    default: '/documents',
  },
  submitLabel: {
    type: String,
    required: true,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  showFileUpload: {
    type: Boolean,
    default: true,
  },
  fileRequired: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['submit']);

const reviewIntervals = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Semiannually', value: 'semiannually' },
  { label: 'Annually', value: 'annually' },
  { label: 'Custom', value: 'custom' },
];

const reviewPeriods = [
  { label: '1 Week', value: '1week' },
  { label: '2 Weeks', value: '2weeks' },
  { label: '3 Weeks', value: '3weeks' },
  { label: '1 Month', value: '1month' },
];

const fileRules = computed(() => {
  if (!props.fileRequired) {
    return [];
  }

  return [
    (value) => {
      if (Array.isArray(value)) {
        return value.length > 0 || 'A file is required.';
      }

      return Boolean(value) || 'A file is required.';
    },
  ];
});

function addExternalContact() {
  props.form.externalContacts.push({
    name: '',
    email: '',
    phoneNumber: '',
    type: '',
  });
}

function removeExternalContact(index) {
  props.form.externalContacts.splice(index, 1);
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

function calculateReviewDueDate(opensForReview, reviewPeriod) {
  if (!opensForReview || !reviewPeriod) {
    return '';
  }

  const date = new Date(opensForReview);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  switch (reviewPeriod) {
    case '1week':
      date.setDate(date.getDate() + 7);
      break;
    case '2weeks':
      date.setDate(date.getDate() + 14);
      break;
    case '3weeks':
      date.setDate(date.getDate() + 21);
      break;
    case '1month':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return '';
  }

  return toInputDate(date);
}

function calculateNextReviewDate(opensForReview, reviewInterval, reviewIntervalDays) {
  if (!opensForReview || !reviewInterval) {
    return '';
  }

  const date = new Date(opensForReview);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  switch (reviewInterval) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semiannually':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'custom':
      if (!reviewIntervalDays) {
        return '';
      }
      date.setDate(date.getDate() + Number(reviewIntervalDays));
      break;
    default:
      return '';
  }

  return toInputDate(date);
}

watch(
  () => [props.form.opensForReview, props.form.reviewPeriod],
  ([opensForReview, reviewPeriod]) => {
    props.form.reviewDueDate = calculateReviewDueDate(opensForReview, reviewPeriod);
  },
  { immediate: true },
);

watch(
  () => [props.form.opensForReview, props.form.reviewInterval, props.form.reviewIntervalDays],
  ([opensForReview, reviewInterval, reviewIntervalDays]) => {
    props.form.nextReviewDueOn = calculateNextReviewDate(
      opensForReview,
      reviewInterval,
      reviewIntervalDays,
    );
  },
  { immediate: true },
);
</script>
