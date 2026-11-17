<template>
  <v-card>
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2">
      <span>Versions</span>
      <v-chip v-if="policy" size="small" variant="outlined">
        {{ policy.required ? `Approval required (${policy.minApprovals})` : 'Approval not required' }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <v-alert v-if="message" class="mb-3" :type="messageType" variant="tonal" closable @click:close="message = ''">
        {{ message }}
      </v-alert>

      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Version</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Approvals</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && !files.length">
            <td colspan="5" class="text-medium-emphasis py-4">No file versions yet.</td>
          </tr>
          <tr v-for="file in files" :key="file._id">
            <td>
              <div class="font-weight-medium">v{{ file.version }} · {{ file.versionLabel }}</div>
              <div class="text-caption text-medium-emphasis">{{ file.originalname }} · {{ formatBytes(file.size) }}</div>
              <div v-if="file.changelog" class="text-caption">{{ file.changelog }}</div>
              <div v-if="file.sha256" class="text-caption text-medium-emphasis" :title="file.sha256">
                SHA-256 {{ file.sha256.slice(0, 12) }}…
              </div>
            </td>
            <td>
              <v-chip size="small" :color="statusOf(file).color" :prepend-icon="statusOf(file).icon" variant="tonal">
                {{ statusOf(file).label }}
              </v-chip>
              <div v-if="file.rejectionReason" class="text-caption text-error mt-1">{{ file.rejectionReason }}</div>
            </td>
            <td>
              <div>{{ personName(file.uploadedBy) }}</div>
              <div class="text-caption text-medium-emphasis">{{ formatDateTime(file.uploadedAt) }}</div>
            </td>
            <td>
              <div v-for="approval in file.approvals || []" :key="`${approval.decidedAt}-${approval.decision}`" class="text-caption">
                <v-icon size="x-small" :color="approval.decision === 'approved' ? 'success' : 'error'">
                  {{ approval.decision === 'approved' ? 'mdi-check' : 'mdi-close' }}
                </v-icon>
                {{ personName(approval.user) }} · {{ formatDateTime(approval.decidedAt) }}
                <span v-if="approval.comment" class="text-medium-emphasis">— “{{ approval.comment }}”</span>
              </div>
              <span v-if="!(file.approvals || []).length" class="text-medium-emphasis">—</span>
            </td>
            <td class="text-right text-no-wrap">
              <v-btn size="small" variant="text" prepend-icon="mdi-download" :loading="busy === `dl-${file._id}`" @click="download(file)">
                Download
              </v-btn>
              <template v-if="file.status === 'pending_approval'">
                <v-btn v-if="canDecide(file)" size="small" color="success" variant="tonal" class="ml-1" @click="openDecision(file, 'approve')">
                  Approve
                </v-btn>
                <v-btn v-if="canDecide(file)" size="small" color="error" variant="tonal" class="ml-1" @click="openDecision(file, 'reject')">
                  Reject
                </v-btn>
                <v-btn v-if="canWithdraw(file)" size="small" variant="text" class="ml-1" @click="openDecision(file, 'withdraw')">
                  Withdraw
                </v-btn>
              </template>
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-expand-transition>
        <v-form v-if="canEdit" ref="uploadForm" class="mt-6" @submit.prevent="upload">
          <div class="text-subtitle-1 mb-2">Upload a new version</div>
          <v-row dense>
            <v-col cols="12" md="5">
              <v-file-input v-model="newFile" label="File" show-size :disabled="hasPending" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="versionLabel" label="Version label (optional)" :disabled="hasPending" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="changelog" label="What changed?" :disabled="hasPending" :rules="[(v) => !!v?.trim() || 'Describe the change']" />
            </v-col>
          </v-row>
          <div class="d-flex align-center ga-3">
            <v-btn type="submit" color="primary" prepend-icon="mdi-upload" :loading="busy === 'upload'" :disabled="hasPending || !selectedFile">
              {{ policy?.required ? 'Submit for approval' : 'Upload and publish' }}
            </v-btn>
            <span v-if="hasPending" class="text-caption text-medium-emphasis">
              A version is awaiting approval. It must be approved, rejected, or withdrawn first.
            </span>
          </div>
        </v-form>
      </v-expand-transition>
    </v-card-text>

    <v-dialog v-model="decision.open" max-width="520">
      <v-card :title="decisionTitle">
        <v-card-text>
          <p v-if="decision.action === 'approve'" class="mb-3">
            Approving confirms you reviewed version {{ decision.file?.version }}. Your name, the time, and your comment are
            recorded permanently in the audit log.
          </p>
          <v-textarea
            v-model="decision.comment"
            :label="decision.action === 'reject' ? 'Reason (required)' : 'Comment (optional)'"
            rows="3"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="decision.open = false">Cancel</v-btn>
          <v-btn
            :color="decision.action === 'reject' ? 'error' : 'primary'"
            :loading="busy === 'decision'"
            :disabled="decision.action === 'reject' && !decision.comment.trim()"
            @click="submitDecision"
          >
            {{ decisionTitle }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api } from '@/services/api';
import { downloadProtectedFile } from '@/services/download';
import { personName } from '@/lib/people';
import { VERSION_STATUS, errorMessage, formatBytes, formatDateTime } from '@/lib/format';

const props = defineProps({
  document: { type: Object, required: true },
  currentUser: { type: Object, default: null },
});
const emit = defineEmits(['changed']);

const files = ref([]);
const policy = ref(null);
const loading = ref(false);
const busy = ref('');
const message = ref('');
const messageType = ref('success');
const newFile = ref(null);
const versionLabel = ref('');
const changelog = ref('');
const decision = reactive({ open: false, action: 'approve', file: null, comment: '' });

const userId = computed(() => String(props.currentUser?.id || props.currentUser?._id || ''));
const role = computed(() => props.currentUser?.role || 'viewer');
const isAdmin = computed(() => ['admin', 'superadmin'].includes(role.value));
const idOf = (value) => String(value?._id || value || '');

const canEdit = computed(() => {
  if (isAdmin.value) return true;
  if (!['editor'].includes(role.value)) return false;
  return idOf(props.document.author) === userId.value
    || (props.document.owners || []).some((owner) => idOf(owner) === userId.value);
});

const isApprover = computed(() => {
  if (isAdmin.value) return true;
  const list = props.document.approvers?.length ? props.document.approvers : props.document.owners || [];
  return list.some((person) => idOf(person) === userId.value);
});

const hasPending = computed(() => files.value.some((file) => file.status === 'pending_approval'));
const selectedFile = computed(() => (Array.isArray(newFile.value) ? newFile.value[0] : newFile.value));
const decisionTitle = computed(() => ({ approve: 'Approve version', reject: 'Reject version', withdraw: 'Withdraw version' }[decision.action]));

function statusOf(file) {
  return VERSION_STATUS[file.status] || VERSION_STATUS.approved;
}

function canDecide(file) {
  if (!isApprover.value) return false;
  if (idOf(file.uploadedBy) === userId.value) return false;
  return !(file.approvals || []).some((approval) => idOf(approval.user) === userId.value);
}

function canWithdraw(file) {
  return idOf(file.uploadedBy) === userId.value || isAdmin.value;
}

function notify(text, type = 'success') {
  message.value = text;
  messageType.value = type;
}

async function load() {
  loading.value = true;
  try {
    const [filesResponse, pendingResponse] = await Promise.all([
      api.get(`/docs/${props.document._id}/files`),
      api.get('/docs/approvals/pending').catch(() => ({ data: {} })),
    ]);
    files.value = filesResponse.data || [];
    policy.value = pendingResponse.data?.policy || null;
  } catch (error) {
    notify(errorMessage(error, 'Could not load versions.'), 'error');
  } finally {
    loading.value = false;
  }
}

async function download(file) {
  busy.value = `dl-${file._id}`;
  try {
    await downloadProtectedFile(`/docs/${props.document._id}/files/${file._id}/download`, file.originalname);
  } catch (error) {
    notify(error?.response?.status === 409
      ? 'Integrity check failed: the stored file does not match its recorded checksum. The download was blocked and logged.'
      : 'Download failed.', 'error');
  } finally {
    busy.value = '';
  }
}

async function upload() {
  if (!selectedFile.value || !changelog.value.trim()) {
    notify('Choose a file and describe what changed.', 'warning');
    return;
  }
  busy.value = 'upload';
  try {
    const payload = new FormData();
    payload.append('file', selectedFile.value);
    if (versionLabel.value.trim()) payload.append('versionLabel', versionLabel.value.trim());
    payload.append('changelog', changelog.value.trim());
    const response = await api.post(`/docs/${props.document._id}/upload`, payload);
    notify(response.data?.message || 'Version uploaded.');
    newFile.value = null;
    versionLabel.value = '';
    changelog.value = '';
    await load();
    emit('changed');
  } catch (error) {
    notify(errorMessage(error, 'Upload failed.'), 'error');
  } finally {
    busy.value = '';
  }
}

function openDecision(file, action) {
  Object.assign(decision, { open: true, action, file, comment: '' });
}

async function submitDecision() {
  busy.value = 'decision';
  try {
    const response = await api.post(
      `/docs/${props.document._id}/versions/${decision.file.version}/${decision.action}`,
      { comment: decision.comment },
    );
    notify(response.data?.message || 'Done.');
    decision.open = false;
    await load();
    emit('changed');
  } catch (error) {
    notify(errorMessage(error, 'Action failed.'), 'error');
  } finally {
    busy.value = '';
  }
}

watch(() => props.document?._id, load);
onMounted(load);
defineExpose({ load });
</script>
