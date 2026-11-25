# UI customization

Admins and superadmins can open **System Settings → UI Customization**. These are application-wide settings, not personal preferences. They apply to the Vue application, including its sign-in and public-sharing pages. They do not change the legacy React frontend, exported documents, email templates, or the documentation website.

## Change appearance

1. Open the customization tab using an admin or superadmin account.
2. Set the color and font size for ordinary links, hovered/active/visited links, headings H1–H6, and paragraphs. Colors use six-digit hex values (for example, `#1F2937`); sizes are whole pixels from 10 to 72. Visited links use the normal link size; the visited-size control is disabled because browsers restrict visited styling for privacy. Their color remains configurable.
3. Upload an optional PNG, JPEG, or WebP logo, at most **256 KiB**. Include useful alternative text. SVG and remote image URLs are not supported. Removing the custom logo restores the application wordmark after saving.
4. Choose **Left**, **Right**, or **Top** navigation. Small screens retain accessible collapsible navigation.
5. Enable an optional footer and set its plain text, background/text colors, and optional link. Supply both link label and absolute HTTPS URL, or leave both empty. HTML is displayed as text, not interpreted.
6. Check the preview, then save. Draft changes and restoring defaults require saving before other users see them. Discard unwanted draft edits instead of saving.

Saved settings apply immediately in the saving browser. Other browsers receive the settings when they next load the application. Check text contrast and legibility, keyboard navigation, and small screens before considering a theme ready. Semantic content styles do not replace status colors or button/control styles.

## Storage and operations

Settings and the small logo are stored in MongoDB under the `SystemSetting` key `ui.appearance`; existing database backups include them. No filesystem upload directory, external font service, new environment variable, or separate migration is needed. Branding is publicly readable so it can appear before sign-in; never place private information in a logo or footer. Only authenticated admins/superadmins can save changes. The API accepts known fields and validated values, not arbitrary CSS or HTML.

Successful saves are recorded as system-setting changes without embedding the logo bytes in the audit log. If audit recording fails after the settings are saved, the response reports that the save committed and includes a warning; investigate audit availability rather than repeatedly saving. Concurrent edits use last-save-wins; coordinate administrator changes.

If appearance loading fails, the application uses its built-in defaults. A settings editor must successfully load the saved configuration before allowing changes. Invalid stored appearance data also falls back to defaults. Use **Restore defaults**, inspect the preview, and save to recover from a difficult-to-read theme.

## Acceptance checks

- Admin and superadmin: open the tab directly and through navigation; save, reload, and confirm persistence.
- Viewer/editor and signed-out users: verify saving is denied by the API, while public branding remains readable.
- Change each typography group and inspect representative semantic text; verify links on hover, keyboard focus, and activation without altering button/status contrast.
- Upload a valid logo, reload, and remove it. Reject SVG, disguised non-image data, oversized files, and missing alternative text.
- Check left/right/top menus on desktop and a narrow screen. Navigate to documents, account, and settings; toggle the menu and switch tabs without losing drafts.
- Enable the footer with plain text and an HTTPS link. Confirm HTML is not executed and unsafe URLs are rejected. Disable it and verify removal after saving.
- Restore defaults, save, and reload. Check login/public pages as well as signed-in views.
- Confirm audit entries exclude logo bytes and private settings. Verify backups include the setting through the normal database backup workflow.

Automated coverage does not replace these browser and deployment acceptance checks.
