<template>
  <section class="appearance-settings mt-6" aria-label="UI Customization">
    <div class="d-flex flex-wrap justify-space-between align-start ga-3 mb-5">
      <div>
        <h2 class="text-h5 font-weight-bold">Make DocMan your own</h2>
        <p class="text-medium-emphasis mt-2">Set the look for everyone, including the sign-in and public document pages.</p>
      </div>
      <v-chip variant="tonal" prepend-icon="mdi-account-group-outline">Admins &amp; superadmins</v-chip>
    </div>
    <v-alert v-if="message" :type="messageType" variant="tonal" class="mb-4" role="status">{{ message }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate aria-label="Loading customization settings" />
    <v-btn v-if="!loading && !draft" prepend-icon="mdi-refresh" @click="load">Retry loading</v-btn>
    <template v-if="draft">
      <v-form @submit.prevent="save">
        <v-row>
          <v-col cols="12" lg="8">
            <v-card class="mb-5" title="Colors & typography" subtitle="Style text links, headings and paragraphs. Navigation and action buttons retain their accessible control styles.">
              <v-card-text>
                <div class="typography-labels text-caption text-medium-emphasis" aria-hidden="true"><span>Element</span><span>Color</span><span>Size (px)</span></div>
                <div v-for="(label, key) in typographyLabels" :key="key" class="typography-row">
                  <div class="font-weight-medium">{{ label }}</div>
                  <div class="d-flex align-center ga-2">
                    <input class="color-picker" type="color" :value="preview.typography[key].color" :aria-label="`${label} color picker`" :disabled="saving" @input="draft.typography[key].color = $event.target.value" />
                    <v-text-field v-model="draft.typography[key].color" :aria-label="`${label} hex color`" :label="`${label} color`" density="compact" hide-details maxlength="7" :disabled="saving" />
                  </div>
                  <v-text-field v-model.number="draft.typography[key].fontSize" :label="`${label} size`" type="number" min="10" max="72" step="1" suffix="px" density="compact" hide-details :disabled="saving || key === 'linkVisited'" />
                </div>
                <p class="text-caption text-medium-emphasis mt-4">Use 10–72 pixels. Check your choices for readability and contrast; a 16px or larger paragraph size is a good starting point. Visited links use the normal link size; their size control is disabled because browsers restrict visited styling for privacy. You can still change their color.</p>
              </v-card-text>
            </v-card>
            <v-card class="mb-5" title="Logo & navigation">
              <v-card-text>
                <v-file-input v-model="logoFile" label="Upload logo" accept="image/png,image/jpeg,image/webp" prepend-icon="mdi-image-outline" hint="PNG, JPEG or WebP • maximum 256 KiB. Your logo is displayed on public pages too." persistent-hint :disabled="saving || readingLogo" @update:model-value="readLogo" />
                <div v-if="draft.logo.dataUrl" class="d-flex align-center ga-4 my-4"><img v-if="!logoFailed" :src="preview.logo.dataUrl" :alt="preview.logo.alt" class="logo-thumbnail" @error="logoFailed = true" /><span v-else>Logo unavailable</span><v-btn size="small" variant="text" :disabled="saving || readingLogo" @click="removeLogo">Remove logo</v-btn></div>
                <v-text-field v-model="draft.logo.alt" label="Logo alternative text" maxlength="120" counter="120" class="mt-4" :disabled="saving" />
                <v-select v-model="draft.menuPosition" :items="menuOptions" label="Menu placement" :disabled="saving" hint="Top navigation becomes a collapsible menu on small screens." persistent-hint />
              </v-card-text>
            </v-card>
            <v-card title="Footer" subtitle="A simple, shared footer. Text is displayed as plain text, not HTML.">
              <v-card-text>
                <v-switch v-model="draft.footer.enabled" label="Show footer" color="primary" :disabled="saving" hide-details class="mb-4" />
                <v-text-field v-model="draft.footer.text" label="Footer text" maxlength="500" counter="500" :disabled="saving" />
                <v-row><v-col cols="12" sm="5"><v-text-field v-model="draft.footer.linkLabel" label="Link label (optional)" maxlength="100" :disabled="saving" /></v-col><v-col cols="12" sm="7"><v-text-field v-model="draft.footer.linkUrl" label="Link URL (optional)" maxlength="2048" placeholder="https://example.org" :disabled="saving" /></v-col></v-row>
                <v-row><v-col v-for="(label, key) in { backgroundColor: 'Background', textColor: 'Text' }" :key="key" cols="12" sm="6"><div class="d-flex ga-2 align-center"><input class="color-picker" type="color" :aria-label="`Footer ${label.toLowerCase()} color picker`" :value="preview.footer[key]" :disabled="saving" @input="draft.footer[key] = $event.target.value" /><v-text-field v-model="draft.footer[key]" :label="`Footer ${label.toLowerCase()} color`" maxlength="7" hide-details :disabled="saving" /></div></v-col></v-row>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" lg="4">
            <aside class="appearance-preview-wrap">
              <div class="d-flex align-center justify-space-between mb-3"><span class="text-overline">Preview</span><v-chip size="small" variant="outlined">{{ dirty ? 'Unsaved changes' : 'Saved appearance' }}</v-chip></div>
              <div class="appearance-preview docman-appearance" :style="previewVariables">
                <div class="preview-brand"><img v-if="preview.logo.dataUrl && !logoFailed" :src="preview.logo.dataUrl" @error="logoFailed = true" :alt="preview.logo.alt" class="logo-thumbnail" /><strong v-else>RDocMan</strong></div>
                <div class="preview-layout" :class="`preview-layout--${preview.menuPosition}`">
                  <nav aria-label="Preview navigation" class="preview-menu"><v-icon size="18">mdi-menu</v-icon><span>{{ preview.menuPosition === 'top' ? 'Top menu' : `${preview.menuPosition === 'left' ? 'Left' : 'Right'} menu` }}</span></nav>
                  <div class="preview-copy">
                    <component v-for="level in 6" :is="`h${level}`" :key="level" class="mb-2">Heading {{ level }}</component>
                    <p class="my-4">Clear information helps your team find and share the right documents.</p>
                    <div class="d-flex flex-column ga-2"><a href="#appearance-preview" @click.prevent>Regular link</a><a href="#appearance-preview" class="preview-link-hover" @click.prevent>Hover / focus link</a><a href="#appearance-preview" class="preview-link-active" @click.prevent>Active link</a><a href="#appearance-preview" class="preview-link-visited" @click.prevent>Visited link</a></div>
                  </div>
                </div>
                <div v-if="preview.footer.enabled" class="preview-footer" :style="{ backgroundColor: preview.footer.backgroundColor, color: preview.footer.textColor }"><span>{{ preview.footer.text || 'Your footer text' }}</span><a v-if="preview.footer.linkUrl && preview.footer.linkLabel" :href="preview.footer.linkUrl" :style="{ color: preview.footer.textColor }" target="_blank" rel="noopener noreferrer">{{ preview.footer.linkLabel }}</a></div>
              </div>
              <p class="text-caption text-medium-emphasis mt-3">Preview is limited to this panel. Save to update the application for everyone. Open sessions receive changes when they reload.</p>
            </aside>
          </v-col>
        </v-row>
        <v-alert v-if="validationError" type="warning" variant="tonal" class="mt-5">{{ validationError }}</v-alert>
        <div class="appearance-actions d-flex flex-wrap align-center ga-3 mt-5">
          <v-btn type="submit" color="primary" variant="flat" :loading="saving" :disabled="!dirty || Boolean(validationError) || readingLogo">Save customization</v-btn>
          <v-btn variant="text" :disabled="!dirty || saving || readingLogo" @click="discard">Discard changes</v-btn>
          <v-spacer />
          <v-btn variant="outlined" :disabled="saving || readingLogo" @click="restoreDefaults">Restore defaults</v-btn>
        </div>
      </v-form>
    </template>
  </section>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api } from '@/services/api';
import { useAppearance } from '@/composables/useAppearance';
import { appearanceError, appearanceVariables, cloneAppearance, defaultAppearance, safeAppearance, typographyLabels } from '@/lib/appearance';
const { loadAppearance, applyAppearance } = useAppearance();
const draft = ref(null), saved = ref(null), defaults = ref(cloneAppearance(defaultAppearance));
const loading = ref(true), saving = ref(false), readingLogo = ref(false), logoFile = ref(null);
const logoFailed = ref(false);
watch(() => draft.value?.logo?.dataUrl, () => { logoFailed.value = false; });
const message = ref(''), messageType = ref('success');
const menuOptions = [{ title: 'Left sidebar', value: 'left' }, { title: 'Right sidebar', value: 'right' }, { title: 'Top navigation', value: 'top' }];
const preview = computed(() => safeAppearance(draft.value));
const previewVariables = computed(() => appearanceVariables(draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
const validationError = computed(() => draft.value ? appearanceError(draft.value) : '');
async function load() {
  loading.value = true; message.value = '';
  try { const data = await loadAppearance(); saved.value = safeAppearance(data.settings); defaults.value = safeAppearance(data.defaults); draft.value = cloneAppearance(saved.value); }
  catch { messageType.value = 'error'; message.value = 'Could not load customization settings. Retry before making changes.'; }
  finally { loading.value = false; }
}
async function save() {
  if (saving.value || readingLogo.value || validationError.value || !dirty.value) return;
  saving.value = true; message.value = '';
  try { const { data } = await api.put('/system/appearance', draft.value); saved.value = safeAppearance(data.settings); draft.value = cloneAppearance(saved.value); applyAppearance(saved.value); messageType.value = data.auditRecorded === false ? 'warning' : 'success'; message.value = data.warning || 'Customization saved. Your changes are now applied to DocMan.'; }
  catch (error) { messageType.value = 'error'; message.value = error.response?.data?.message || 'Could not save customization. Your draft has been kept; try again.'; }
  finally { saving.value = false; }
}
function discard() { draft.value = cloneAppearance(saved.value); logoFile.value = null; message.value = ''; }
function restoreDefaults() { draft.value = cloneAppearance(defaults.value); logoFile.value = null; messageType.value = 'info'; message.value = 'Defaults are in the preview. Save customization to apply them, or discard to keep your current settings.'; }
function removeLogo() { draft.value.logo.dataUrl = ''; logoFile.value = null; }
async function readLogo(selection) {
  const file = Array.isArray(selection) ? selection[0] : selection;
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 256 * 1024) { messageType.value = 'error'; message.value = 'Choose a PNG, JPEG or WebP logo no larger than 256 KiB.'; logoFile.value = null; return; }
  readingLogo.value = true;
  try {
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = dataUrl; });
    draft.value.logo.dataUrl = dataUrl; message.value = '';
  } catch { messageType.value = 'error'; message.value = 'This image could not be read. Choose a valid PNG, JPEG or WebP file.'; logoFile.value = null; }
  finally { readingLogo.value = false; }
}
onMounted(load);
</script>
<style scoped>
.appearance-settings :deep(.v-card-subtitle) { white-space: normal; overflow: visible; line-height: 1.5; }
.typography-row, .typography-labels { display: grid; grid-template-columns: minmax(115px, 1fr) minmax(160px, 1.5fr) 100px; gap: 12px; align-items: center; }
.typography-row { padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,.08); }
.color-picker { flex: 0 0 38px; width: 38px; height: 38px; border: 1px solid #b8bec6; border-radius: 4px; padding: 2px; cursor: pointer; background: white; }
.appearance-preview-wrap { position: sticky; top: 88px; }
.appearance-preview { border: 1px solid #cbd1d8; background: white; border-radius: 4px; overflow: hidden; }
.preview-brand { padding: 16px; border-bottom: 1px solid #e0e3e7; }
.logo-thumbnail { max-width: 180px; max-height: 56px; object-fit: contain; }
.preview-layout { display: flex; }
.preview-layout--right { flex-direction: row-reverse; }
.preview-layout--top { flex-direction: column; }
.preview-menu { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 7px; width: 65px; flex-shrink: 0; background: #f2f4f6; font-size: 12px; text-align: center; }
.preview-layout--top .preview-menu { flex-direction: row; width: 100%; padding: 12px; }
.preview-copy { min-width: 0; padding: 20px 16px; overflow-wrap: anywhere; }
.preview-footer { padding: 16px; display: flex; flex-wrap: wrap; gap: 12px; overflow-wrap: anywhere; }
.appearance-actions { padding: 20px 0; border-top: 1px solid #dce0e6; }
@media (max-width: 599px) { .typography-row { grid-template-columns: minmax(0, 1fr) 100px; } .typography-row > :first-child { grid-column: 1 / -1; } .typography-labels { display: none; } .appearance-preview-wrap { position: static; } }
</style>
