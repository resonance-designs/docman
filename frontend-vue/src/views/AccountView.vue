<template>
  <v-container class="profile-page py-8">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">My Profile</h1>
      <p class="text-medium-emphasis mt-2">Your details, contact information, and account security.</p>
    </div>
    <div ref="feedback" tabindex="-1">
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">{{ error }}<v-btn v-if="!account && !changed" variant="text" :loading="loading" @click="load">Retry</v-btn></v-alert>
    <v-alert v-if="message" :type="messageType" variant="tonal" class="mb-4" role="status">{{ message }}</v-alert>
    </div>
    <v-progress-linear v-if="loading" indeterminate aria-label="Loading profile" />
    <template v-if="account">
      <v-alert v-if="account.externallyManaged" type="info" variant="tonal" class="mb-6">Your profile and password are managed by your identity provider. Make changes there rather than in DocMan.</v-alert>
      <v-form @submit.prevent="save">
        <v-row>
          <v-col cols="12" md="4">
            <v-card class="profile-identity" aria-label="Profile photo and identity">
              <v-card-text class="text-center pa-6">
                <v-avatar size="112" color="primary" variant="tonal" class="mb-4">
                  <img v-if="avatar && !avatarFailed" :src="avatar" :alt="`${displayName}'s profile photo`" @error="avatarFailed = true" />
                  <span v-else class="text-h4" aria-label="Profile initials">{{ initials }}</span>
                </v-avatar>
                <h2 class="text-h6 profile-break">{{ displayName }}</h2>
                <div class="text-medium-emphasis profile-break mt-1">{{ profile.title || 'Add your position' }}</div>
                <v-chip size="small" variant="tonal" class="mt-3">{{ account.role }}</v-chip>
                <div v-if="!account.externallyManaged" class="text-left mt-6">
                  <v-file-input v-model="photoFile" label="Profile photo" accept="image/png,image/jpeg,image/webp" prepend-icon="mdi-camera-outline" :disabled="locked" :loading="readingPhoto" hint="PNG, JPEG or WebP · up to 256 KiB" persistent-hint @update:model-value="readPhoto" />
                  <v-btn v-if="profile.avatarDataUrl" variant="text" size="small" class="mt-2" :disabled="locked" @click="removePhoto">Remove photo</v-btn>
                  <div class="text-caption text-medium-emphasis mt-3">Photo changes are a preview until you save your profile.</div>
                </div>
                <v-divider class="my-5" />
                <dl class="profile-account text-left">
                  <dt>Username</dt><dd>{{ account.username }}</dd>
                  <dt>Sign-in email</dt><dd>{{ account.email }}</dd>
                </dl>
                <p class="text-caption text-medium-emphasis text-left mt-4">Contact a superadmin to change your username or sign-in email.</p>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="8">
            <v-card class="mb-5" title="About you">
              <v-card-text>
                <v-row><v-col v-for="field in identityFields" :key="field.key" cols="12" sm="6"><v-text-field v-model="profile[field.key]" :label="field.label" :autocomplete="field.autocomplete" :disabled="readOnly" maxlength="254" :required="field.required" hide-details="auto" /></v-col></v-row>
                <v-textarea v-model="profile.bio" label="Short bio" maxlength="500" counter="500" rows="4" auto-grow class="mt-5" :disabled="readOnly" hint="A little about your role, interests, or expertise." persistent-hint />
              </v-card-text>
            </v-card>
            <v-card title="Contact information">
              <v-card-text>
                <v-text-field v-model="profile.telephone" label="Phone number" type="tel" autocomplete="tel" maxlength="254" :disabled="readOnly" />
                <v-text-field v-model="profile.contactEmail" label="Contact email (optional)" type="email" maxlength="254" :disabled="readOnly" hint="A profile contact detail only. This does not change sign-in or notification delivery." persistent-hint class="mb-4" />
                <v-text-field v-model="profile.location" label="Location (optional)" maxlength="254" :disabled="readOnly" placeholder="City, office, or region" />
                <v-text-field v-model="profile.website" label="Website (optional)" maxlength="2048" :disabled="readOnly" placeholder="https://example.org" hint="Use a complete HTTPS address." persistent-hint />
              </v-card-text>
            </v-card>
            <div v-if="!account.externallyManaged" class="d-flex flex-wrap ga-3 mt-5">
              <v-btn type="submit" color="primary" variant="flat" :loading="busy" :disabled="!dirty || locked">Save profile</v-btn>
              <v-btn variant="text" :disabled="!dirty || locked" @click="discard">Discard changes</v-btn>
              <span class="text-caption text-medium-emphasis align-self-center">{{ dirty ? 'Unsaved changes' : 'Profile saved' }}</span>
            </div>
          </v-col>
        </v-row>
      </v-form>
      <v-card v-if="!account.externallyManaged" class="mt-8" title="Change password" prepend-icon="mdi-lock-outline">
        <v-card-text>
          <p class="mb-5">Use at least {{ minimum }} characters, up to 72 UTF-8 bytes. Changing your password signs out all existing DocMan sessions.</p>
          <v-form @submit.prevent="change">
            <v-row>
              <v-col cols="12" md="4"><v-text-field v-model="currentPassword" label="Current password" type="password" autocomplete="current-password" required :disabled="locked" hide-details="auto" /></v-col>
              <v-col cols="12" md="4"><v-text-field v-model="password" label="New password" type="password" autocomplete="new-password" required :disabled="locked" hide-details="auto" /></v-col>
              <v-col cols="12" md="4"><v-text-field v-model="confirmation" label="Repeat new password" type="password" autocomplete="new-password" required :disabled="locked" hide-details="auto" /></v-col>
            </v-row>
            <v-btn type="submit" color="primary" variant="outlined" class="mt-5" :loading="busy" :disabled="locked">Change password and sign out</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </template>
    <v-btn v-if="changed" to="/login" color="primary">Sign in with your new password</v-btn>
  </v-container>
</template>
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { api } from '@/services/api';
import { useAuth } from '@/composables/useAuth';
import { profileDraft, profileError, passwordChangeError, safeAvatar, saveAndRefreshProfile } from '@/lib/profile';
const { refreshProfile, clearLocalSession } = useAuth();
const account = ref(null), profile = ref(profileDraft()), saved = ref(profileDraft());
const loading = ref(true), busy = ref(false), readingPhoto = ref(false), error = ref(''), message = ref(''), messageType = ref('success'), minimum = ref(18), changed = ref(false);
const photoFile = ref(null), avatarFailed = ref(false), feedback = ref(null);
watch([error, message], async ([problem, notice]) => {
  if (!problem && !notice) return;
  await nextTick();
  feedback.value?.scrollIntoView({ block: 'nearest' });
  feedback.value?.focus({ preventScroll: true });
});
const currentPassword = ref(''), password = ref(''), confirmation = ref('');
const locked = computed(() => busy.value || readingPhoto.value || loading.value);
const readOnly = computed(() => account.value?.externallyManaged || locked.value);
const dirty = computed(() => JSON.stringify(profile.value) !== JSON.stringify(saved.value));
const displayName = computed(() => `${profile.value.firstname} ${profile.value.lastname}`.trim() || account.value?.username || 'Your profile');
const initials = computed(() => [profile.value.firstname, profile.value.lastname].map(value => [...value.trim()][0] || '').join('').toUpperCase() || '?');
const avatar = computed(() => safeAvatar(profile.value.avatarDataUrl));
watch(avatar, () => { avatarFailed.value = false; });
const identityFields = [{ key: 'firstname', label: 'First name', required: true, autocomplete: 'given-name' }, { key: 'lastname', label: 'Last name', required: true, autocomplete: 'family-name' }, { key: 'title', label: 'Position / job title', autocomplete: 'organization-title' }, { key: 'department', label: 'Department' }];
async function load() {
  loading.value = true; error.value = '';
  try {
    const { data } = await api.get('/users/me/account'); account.value = data.user; minimum.value = data.policy.minLength;
    saved.value = profileDraft(data.user); profile.value = profileDraft(data.user);
  } catch (e) { error.value = e.response?.data?.message || 'Unable to load your profile.'; }
  finally { loading.value = false; }
}
onMounted(load);
async function save() {
  if (locked.value || account.value?.externallyManaged) return;
  error.value = profileError(profile.value); message.value = '';
  if (error.value) return;
  busy.value = true;
  try {
    const result = await saveAndRefreshProfile(api, profile.value, refreshProfile);
    account.value = result.user; saved.value = profileDraft(result.user); profile.value = profileDraft(result.user); photoFile.value = null;
    messageType.value = result.refreshFailed ? 'warning' : 'success';
    message.value = result.refreshFailed ? 'Profile saved. Your session display could not refresh; reload the page to refresh it.' : 'Profile saved.';
  } catch (e) { error.value = e.response?.data?.message || 'Unable to save profile. Your changes have been kept.'; }
  finally { busy.value = false; }
}
function discard() { profile.value = profileDraft(saved.value); photoFile.value = null; error.value = ''; message.value = ''; }
function removePhoto() { profile.value.avatarDataUrl = ''; photoFile.value = null; }
async function readPhoto(selection) {
  const file = Array.isArray(selection) ? selection[0] : selection;
  if (!file) return;
  error.value = ''; message.value = '';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 256 * 1024) { error.value = 'Choose a PNG, JPEG or WebP photo no larger than 256 KiB.'; photoFile.value = null; return; }
  readingPhoto.value = true;
  try {
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = dataUrl; });
    profile.value.avatarDataUrl = dataUrl;
  } catch { error.value = 'This photo could not be read. Choose a valid PNG, JPEG or WebP image.'; photoFile.value = null; }
  finally { readingPhoto.value = false; }
}
async function change() {
  if (locked.value || account.value?.externallyManaged) return;
  error.value = passwordChangeError(currentPassword.value, password.value, confirmation.value, minimum.value); message.value = '';
  if (error.value) return;
  busy.value = true;
  try {
    const { data } = await api.post('/users/me/password', { currentPassword: currentPassword.value, password: password.value });
    currentPassword.value = ''; password.value = ''; confirmation.value = '';
    clearLocalSession(); account.value = null; changed.value = true; messageType.value = 'success'; message.value = data.message;
  } catch (e) { error.value = e.response?.data?.message || 'Unable to change password.'; }
  finally { busy.value = false; }
}
</script>
<style scoped>
.profile-page { max-width: 1120px; }
.profile-identity { position: sticky; top: 88px; }
.profile-identity img { width: 100%; height: 100%; object-fit: cover; }
.profile-break, .profile-account dd { overflow-wrap: anywhere; }
.profile-account dt { font-size: .8rem; color: #606873; margin-top: 14px; }
.profile-account dd { margin: 3px 0 0; }
@media (max-width: 959px) { .profile-identity { position: static; } }
</style>
