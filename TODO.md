# DocMan

## Web updater acceptance

- [x] Complete development UI update from 3.0.3 to 3.0.4, confirm post-update version and existing-document download, and install the corrected helper. See [operator-reported acceptance and remaining drills](docs/reviews/development-3.0.4-acceptance.md). This does not complete restore/failure-recovery acceptance or test a future update using the corrected helper.
- [x] Fix the [five PR #55 CodeRabbit findings](docs/reviews/pr-55-coderabbit-ui-updater.md) on the UI-update testing branch: retired-service preservation order, stale progress/control races, saved-ticket polling during backend delays, Apache rewrite validation/configuration rollback, and explicit backup-selection hooks. Local validation: 50 Linux tests, 20 frontend regressions, Vue build, and Bash syntax passed. The v3.0.3 tag is unchanged; live newer-release update/restore acceptance remains pending.
- [x] Implement superadmin stable-release discovery, interactive update/backup prompts, restricted privileged broker and independent read-only progress. See [setup and testing boundaries](docs/deployment/web-updates.md).
- [ ] Validate on disposable Ubuntu with real systemd/Apache: helper setup, authorization, GitHub access, LOCAL/SAVED backups, cancellation and timeout, page refresh during downtime, successful update, post-mutation failure/recovery, helper restart interruption, and matching backup restore. Then record development acceptance separately.

## 3.0.2 — CodeRabbit fixes from PR #50

- [x] Verify and implement fixes for the [42 published PR #50 findings](docs/reviews/pr-50-coderabbit-3.0.2.md): 16 inline, 2 outside-diff, and 24 minor findings. Committed in the history through `1b7dcbd`; deployment acceptance remains pending.
- [x] Address the [eight functional PR #52 follow-ups](docs/reviews/pr-52-coderabbit-3.0.2.md), including durable project/team recovery, fail-open audit warnings, stale-session rejection, updater interruption and backup-path handling, and handoff status. Local changes and validation do not establish deployment acceptance.
- [ ] Optional PR #52 migration optimization: use a cursor in `migrationStorage.js` rather than loading all file records at once. Deliberately excluded from the eight functional follow-up fixes.
- [x] Address the five November 24 PR #52 follow-ups: no-op relationship repair, pending metadata status, bounded scan fairness, predicate-sensitive concurrency tests, and tokenless 401 cleanup. Local validation is recorded in the PR #52 review record; deployment remains pending.
- [ ] Complete isolated fresh-Ubuntu/systemd/restic restore acceptance, apply the safe Apache log format on existing deployments, and run the deployed multi-user/browser/SMTP checks. Record the final fixing commit and refresh the review snapshot for any new CodeRabbit rounds before release.
- [ ] Repair the pre-existing legacy `services/documentService.test.js` expectations/mocks and `docs.test.js` ESM harness. Their failures reproduce on pristine HEAD; 207 targeted backend tests pass for the PR #50 fixes, but the full legacy suite is not green.

- [x] Fix shared mobile header at 375px: compact labeled account actions, verified with a browser fixture.
- [ ] Run live multi-user acceptance for Categories, Books, Teams and Projects using `docs/resource-management.md`; local fixture review does not verify database writes or mail delivery.


DocMan hopes to be the most comprehensive piece of software to manage all of your documentation. You can schedule your documentation for review between stakeholders, the original authors, contributors, relevant tech leads, etc... Categorize, analyze, version repositories, and basically everything you would need to keep your documentation well organized, maintained, analyzed, and backed up.

## Current priorities — reviewed November 18, 2026

- [ ] **Updater acceptance:** validate [`update.sh`](docs/deployment/automated-updates.md) on a disposable Ubuntu 26.04 VM from both manual and installer-created deployments. Exercise real service/timer locking, failed backup/build/migration/health checks, power-loss recovery, off-server restore, reboot and browser workflows. Local safety tests do not establish development deployment success.

- [ ] **Interactive installer acceptance:** `install.sh` and its [beginner walkthrough](docs/deployment/automated-installation.md) are implemented. Local configuration safety and disposable-MongoDB bootstrap tests pass; run the complete latest-LTS fresh-VM install/reboot/interruption/certificate/backup-restore checklist before claiming deployment validation. Keep installer and manual walkthrough synchronized when the latest Ubuntu LTS changes. Never run the fresh installer over the organization's existing app; that update is tracked [separately](docs/deployment/poc-validation.md).

This backlog separates implementation from deployment verification. An unchecked item is outstanding; historical strikethroughs below record earlier work and are not evidence of current security, complete test coverage, or Vue feature parity. Record the tested commit, environment, result, and responsible owner before closing security or operational items.

Immediate development scope: authenticated document sharing, downloading, and uploading replacement versions. Live co-editing, mandatory projects/invitations, and public self-registration are outside the current scope. The internal POC is not a production security or compliance approval.

## Security, encryption, and production readiness

Work through dependency triage and storage-encryption verification first, then identity, recovery, security testing, and operational acceptance. Application work belongs to maintainers; the network/security team owns infrastructure and agency acceptance. Documentation alone does not complete a deployment task.

- [ ] **Dependency vulnerabilities:** capture fresh backend and Vue audit reports for the deployed lockfiles. The November 17 installation reported 37 backend findings (including 3 critical and 14 high) and 10 high frontend findings; these are historical counts, not proof of exploitability. Separate runtime, build, and test dependencies; assess affected paths, upgrade safely, run relevant regression tests/builds, and document any accepted residual risk with owner and review date. Add recurring dependency scanning and patch ownership.
  - November 18 remediation: refreshed all five lockfiles; backend runtime now audits clean, and no critical findings remain. Unpatched Picomatch findings and deployment acceptance remain open. See [review, test evidence, and follow-up](docs/dependency-security-review.md); recheck by November 25 or upon upstream release. Recurring audit workflow added, with no advisory suppression.
- [ ] **Encryption at rest:** obtain IT confirmation/evidence for the database, uploaded documents, logs, snapshots, and backup storage. DocMan currently stores uploaded file bytes without application-level encryption; SHA-256 provides integrity checking, not confidentiality. Document storage coverage, key ownership, recovery, rotation, and reboot/unlock behavior. If agency requirements call for application-level encryption, design authenticated encryption with managed keys, migration, rotation, and recovery before implementation; do not store an encryption key beside the data it protects.
- [ ] **HTTPS and certificate lifecycle:** verify supported TLS settings, HTTP-to-HTTPS redirection, certificate hostname/trust on demonstration clients, and proxy behavior. Record renewal ownership, expiry alerts, and replacement steps. The IT-approved self-signed POC certificate encrypts traffic but requires explicit client trust; agree on the production certificate process.
- [ ] **Development secrets:** before production, replace credentials exposed during setup, use separate MongoDB and Redis passwords, and review JWT/service secrets. Keep secrets out of source control and logs; document protected storage, rotation, recovery, and resulting session invalidation. Preserve the authorized temporary development exception. Human passwords are user-chosen with at least 18 characters; machine signing keys are separate.
- [ ] **Agency authentication and MFA:** agree on agency-approved authentication and privileged-user MFA; validate the existing optional Authentik integration if selected. Verify account provisioning, disablement, logout, refresh-token invalidation, session lifetime, recovery, and emergency access. Keep self-registration off and account creation restricted to superadmins.
- [ ] **Authorization and document workflows:** test the deployed role/resource permission matrix, direct API calls and guessed IDs, search/list/export visibility, unauthorized downloads, uploads, replacement versions, approvals, history, deletion/restoration, and disabled accounts. Include attempts to bypass the UI and access documents assigned to someone else. Preserve authentication for document access even when a document has a classification label such as “Public.”
- [ ] **Upload safety:** review allowed file types, content validation, size limits, filenames/path traversal, download headers, and execution prevention. Agree on malware-scanning/quarantine requirements with security and implement/test the chosen handling before sensitive uploads.
- [ ] **Audit integrity and monitoring:** verify fail-closed behavior, concurrent publication/recovery, and hash-chain verification on the deployed system. Hash chaining is not protection against a privileged database administrator rewriting the chain. Agree on restricted external log retention, tamper detection, alert delivery, and review ownership; ensure secrets and document contents are not unnecessarily logged.
- [ ] **Encrypted backups and recovery:** configure and verify off-server encrypted backups covering a consistent database/uploads pair and required configuration. Keep recovery keys independently recoverable; document retention and recovery objectives. Perform a separate-machine restore drill, verify permissions, file hashes and audit chain, and record the outcome. Local development restore tests do not prove development recovery readiness.
- [ ] **Independent security review:** assess the application against OWASP risks, including authentication/authorization bypass, injection, XSS, CSRF where applicable, session handling, and file handling. Retest remediations and record scope and residual findings; existing unit tests are not a penetration test.
- [ ] **Infrastructure boundary:** confirm with the network/security team which clients may reach HTTPS and whether the backend port is reachable directly. Earlier output showed Node listening on all interfaces at port 5001; MongoDB and Redis were loopback-only. Validate the intended reverse-proxy boundary and least-privilege service/filesystem settings. Firewall administration remains with the security team; do not independently enable host filtering during this POC.
- [ ] **Operations and incident response:** name owners for OS/runtime/application patching, access reviews, account offboarding, monitoring, security incidents, certificate renewal, backup failures, and restore exercises. Validate alerts and retention instead of assuming documented settings are active.
- [ ] **Agency acceptance:** establish permitted document classifications and intended external-agency access. Obtain the agency's assessment of applicable requirements; if ePHI is in scope, include the required risk analysis and administrative, physical, and technical safeguards. Do not claim HIPAA compliance or production readiness solely from HTTPS or this checklist. Reference: [HHS Security Rule summary](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html).
- [ ] **Complete deployment documentation:** incorporate every resulting installation/configuration/recovery step into the [Ubuntu walkthrough](docs/deployment/ubuntu-server-installation.md) and keep [HANDOFF](HANDOFF.md) current. Follow the standing requirement: one latest-stable-LTS path, all prerequisites, exact steps, expected results, and failure recovery understandable to a beginner without this chat.

## Approval policies — deferred beyond core POC validation

Current accepted POC behavior: one eligible approval publishes a version; self-approval is blocked by default. Multiple assigned approvers define who may decide, not a requirement for every assignee to approve. Keep this behavior unchanged while validating core document functionality.

- [ ] Add approval policies per Team and per Document, with explicit inheritance/override rules and clear handling of documents associated with multiple teams.
- [ ] Support any-one, minimum-count, majority, and all-eligible-approver policies. Clearly display the effective policy and remaining approvals on the document and approval screens.
- [ ] Define eligible voters and validate that the policy can be satisfied without uploader self-approval; handle disabled/removed approvers and assignment changes during pending approval.
- [ ] Define how policy changes affect already-pending versions, preserve an auditable policy snapshot, and test concurrent decisions, rejection, withdrawal, and publication.

## Email configuration

- [x] Implement persistent activity email delivery, assignment/change detection, role/team/project notices, review reminders, and superadmin queue controls. See [coverage and operating limits](docs/activity-notifications.md).
- [ ] Verify activity emails end to end in development for assignments, roles, teams, versions, review tasks, pause/resume and failed-delivery retry. Invitation/test-email success does not validate these new event flows.
- [ ] Harden notification durability: transactional event capture/reconciliation, real-database concurrent-worker/crash tests, retention and optional per-user preferences/digests.


- [x] Implement superadmin-only outgoing email UI/API: SMTP password login or IP-authorized relay, TLS modes, AWS SES credentials/roles, sender/reply-to, disabled mode, encrypted saved credentials, audited changes, and a rate-limited test email.
- [x] Document key setup, private CA trust, provider prerequisites, UI steps, expected results, backup/recovery, and failures in Ubuntu guide section 16.
- [ ] Deploy the email feature to development. Candidate endpoint reported from another application on November 18: `smtp.example.org:25`; DocMan connectivity/delivery is not yet tested.
- [ ] Confirm with the network/security team that `docman-server` can reach that SMTP endpoint; separately confirm mail-server source-IP allowlisting versus SMTP login, TLS/STARTTLS and CA requirements, approved sender addresses, and permitted recipient domains (including outside agencies). Arbitrary sender acceptance is only an unverified assumption.
- [ ] Enter confirmed settings in the superadmin UI, verify provider acceptance and actual inbox delivery, and test review notifications. Record results in HANDOFF and Ubuntu guide section 16.1. Local fixtures and another application's working configuration do not close these tasks.
- [ ] Complete Vue self-service password recovery screens; configurable transport alone does not complete that workflow.

## UI theming and customization — Vue application

The current Vue shell has a fixed navigation drawer, wordmark, and configured Vuetify palette. Earlier theme-switcher completion notes do not establish that these customization features exist in Vue. Implement the following as a coherent appearance-settings feature.

- [ ] **Settings and permissions:** provide a superadmin-only Appearance page and server-enforced settings API for organization-wide branding. Persist validated settings across sessions, restarts, and upgrades. Define which preferences users may override (for example light/dark mode), with organization defaults for new users and the sign-in page.
- [ ] **Color scheme:** offer presets and custom color pickers/hex input for primary/secondary accents, page and surface backgrounds, headings, body/muted text, links (normal/hover/focus/visited), buttons, borders, navigation, and footer. Include readable error/warning/success states and light/dark variants. Apply shared design tokens throughout components instead of scattered hard-coded colors.
- [ ] **Logo and branding:** allow selecting/uploading, replacing, and removing a logo; configure organization/application display name, logo size, accessible alternative text, and light/dark variants. Include favicon selection and a sensible default when no asset is set. Validate actual image content, dimensions and size; reject active content or safely sanitize it, and prevent arbitrary script/HTML injection through branding assets.
- [ ] **Menu placement:** support left sidebar, right sidebar, and top navigation, with collapse/expand behavior and usable overflow. Preserve route access restrictions and visible active-page state. On small screens, provide an accessible drawer/menu regardless of desktop placement; verify keyboard focus and reading order in all layouts.
- [ ] **Footer:** configure visibility, text/copyright, approved links (support/privacy/accessibility), alignment, and background/text/link colors. Validate link destinations and render safe content; no unrestricted HTML, JavaScript, or arbitrary CSS. Ensure the footer does not obscure page content.
- [ ] **Preview and recovery:** preview unsaved changes across representative screens, save/cancel explicitly, and offer confirmed reset to defaults. Provide recovery from an unreadable/broken configuration and fallback for missing assets or invalid saved values. Audit organization-wide appearance changes.
- [ ] **Accessibility and verification:** validate text/background contrast, distinguish links beyond color, preserve visible focus and semantic status cues, and test keyboard use, zoom, screen-reader labels, light/dark mode, and desktop/mobile layouts. Verify persistence, permissions, unsafe-input rejection, and coverage on sign-in, forms, tables, dialogs, and document pages.
- [ ] **Documentation:** explain organization defaults versus personal preferences, supported color/logo/menu/footer options, preview/reset behavior, asset restrictions, and configuration backup/restore. Include beginner-friendly instructions and expected results.

## Historical feature backlog

Retain earlier completion notes as history; validate remaining work against the current Vue application before implementation. The current priorities above supersede conflicting historical behavior.

- [ ] Authentication implementation history — security verification remains open in the current checklist above.
  - [x] JWT authentication system
    - [x] Check that there is email format, username length, password complexity, regex validation, etc...
    - [x] Check that there are no issues with the inactivity/auto-logout functionality
    - [x] Check that nothing is interfering with the token expiry
  - [x] Email notifications
    - [x] User can chose to be notified on certain things. Some things are mandatory based on their association with the documentation, like if they are a stakeholder, owner, author, etc...
  - [x] Restrict rate-limiting per IP/User and apply rate-limiting where relevant
- [ ] Enhance CreateDocPage by adding a field for the documents review to be marked as complete -- NEED TO TEST
  - [ ] This field should only be visible to the owners and authors of the document -- NEED TO TEST
  - [ ] This field should only be visible when the document is open for review -- NEED TO TEST
  - [ ] Should include a hidden field that tracks the date the review was completed -- NEED TO TEST
  - [ ] Should include a hidden field that tracks who marked the review as complete -- NEED TO TEST
  - [ ] In fact, there should be a field in all forms to track who last updated anything
- [ ] Scheduling -- NEED TO TEST
  - [ ] Authors, contributors, and stake-holders can be scheduled to review documentation based on when the document becomes open for review. -- NEED TO TEST
    - [ ] They should get notice 1 week prior to it opening for review with a calendar reminder file attached -- NEED TO TEST
    - [ ] Setup a weekly alert until the review is marked as complete. -- NEED TO TEST
  - [ ] Can set review deadlines -- NEED TO TEST
  - [ ] If review determines updates are needed, can assign to authors and contributors. -- NEED TO TEST
- [x] Versioning System~~
  - [x] Users should be able to upload new versions of the document
  - [x] Users should be able to view previous versions of the document
  - [x] Users should be able to download previous versions of the document
  - [ ] Users should be able to compare previous versions of the document -- NEED TO TEST
  - [ ] Users should be able to view the change log for the document -- NEED TO TEST
- [x] On the ViewDocPage, add a download button to download a calendar event for the date that a document is up for review
- [x] External Contacts in CreateDocPage
  - [x] Ability to add as many external contacts as needed. Each external contact should have a name, email, phone number, and type (which should be a dropdown).
  - [x] The types should be stored in a collection
  - [x] There should be an admin page to manage the types of external contacts.
- [x] Historical theme switcher — see the current Vue customization backlog above.
  - [x] One theme is the current theme
  - [x] One is a clean business theme
  - [x] And the third is a retro gaming theme
  - [x] Users should be able to select their preferred theme in their profile
- [x] Internal notification and messaging system
  - [x] Be able to invite members already in the system to teams through it's internal messaging and notification system.
  - [x] User will get a notification inside the system if a document is assigned to them in any way or if a document that are attached to is coming up for review.
- [x] Universal helper and debugging functions for the frontend and backend~~
  - [x] Should be named globalUtils.js
  - [x] Can be used anywhere
  - [x] Are made available across the entire project
  - [x] Can be used for debugging, logging, handling simple yet redundant tasks, etc...
  - [x] Can turn on or off the debugging with a debug flag
  - [x] Should be able to log to the console, a file, or a database
  - [x] Should be able to log errors, warnings, info, debug, etc...
- [ ] Reconcile endpoint test coverage with current routes; earlier test additions do not demonstrate complete coverage.
- [x] Add informational and usage comments throughout the frontend code
- [x] Add informational and usage comments throughout the backend code
- [x] Make certain comments dynamic somehow
- [x] Add the functionality to add "Books" to the site that contain multiple chapters/documents
- [x] Modify the CreateBooksPage so that the only things collected are title, description, category, documents, owners, lastUpdatedBy, and the timestamps.
- [x] Add a PaginatedBookTable component that uses the same design patterns and styling as used in the PaginatedDocTable component and use it in the ViewBooksPage.
- [x] Add the FilterBar component to the ViewBooksPage that allows the user to search and filter the books by category, and owners.
- [x] In Teams and Projects, add the functionality to add Books and Documents:
  - [x] Add a tab to the tab menu of the Teams details page and the Projects details page called "Books".
    - [x] In this tab, there should be a header that says "Team Books" and then present a table of all the books that are currently assigned to the team.
      - [x] This table should have the same design patterns and styling as used in the PaginatedDocTable component but instead of view/delete actions, it should have a checkbox to select books and ungroup them from the current team. There should be a button to ungroup all the selected books from the current team under the table.
      - [x] Below that there should be another header that says "Add Books" and then present a table of all the books that are not currently assigned to the team.
      - [x] This table should have the same design patterns and styling as used in the PaginatedDocTable component but instead of view/delete actions, it should have a checkbox to select books and group them to the current team. There should be a button to group all the selected books to the current team under the table.
  - [x] Add a tab to the tab menu of the Teams details page and the Projects details page called "Documents".
    - [x] In this tab, there should be a header that says "Team Documents" and then present a table of all the documents that are currently assigned to the team.
      - [x] This table should have the same design patterns and styling as used in the PaginatedDocTable component but instead of view/delete actions, it should have a checkbox to select documents and ungroup them from the current team. There should be a button to ungroup all the selected documents from the current team under the table.
      - [x] Below that there should be another header that says "Add Documents" and then present a table of all the documents that are not currently assigned to the team.
      - [x] This table should have the same design patterns and styling as used in the PaginatedDocTable component but instead of view/delete actions, it should have a checkbox to select documents and group them to the current team. There should be a button to group all the selected documents to the current team under the table.
- [x] The Members tab in the tab menu of the Teams details page does not currently function. Create a view for it to display all users in the Team.
- [x] The Projects details page does not have a Collaborators tab in the tab menu. Create one and create a view for it to display all collaborators of the Project.
- [x] In the SystemInfoPage, add a "Danger Zone" section at the bottom that has buttons to clear the following collections:
  - [x] Clear Books
    - [x] Copy all books to a collection called "archives_books". Then delete the books from the main collection.
  - [x] Clear Documents
    - [x] Copy all documents to a collection called "archives_documents". Then delete the documents from the main collection.
  - [x] Clear Charts
    - [x] Copy all charts to a collection called "archives_charts". Then delete the charts from the main collection.
    - [x] Clear External Contacts
      - [x] Copy all external contacts to a collection called "archives_external_contacts". Then delete the external contacts from the main collection.
    - [x] Clear External Contact Types
      - [x] Copy all external contact types to a collection called "archives_external_contact_types". Then delete the external contact types from the main collection.
    - [x] Clear Files
      - [x] Copy all files to a collection called "archives_files". Then delete the files from the main collection.
    - [x] Clear Notifications
      - [x] Copy all notifications to a collection called "archives_notifications". Then delete the notifications from the main collection.
    - [x] Clear Projects
      - [x] Copy all projects to a collection called "archives_projects". Then delete the projects from the main collection.
    - [x] Clear Reviews
      - [x] Copy all reviews to a collection called "archives_reviews". Then delete the reviews from the main collection.
    - [x] Clear Review Assignments
    - [x] Copy all review assignments to a collection called "archives_review_assignments". Then delete the review assignments from the main collection.
    - [x] Clear Reviews
    - [x] Copy all reviews to a collection called "archives_reviews". Then delete the reviews from the main collection.
    - [x] Clear Teams
    - [x] Copy all teams to a collection called "archives_teams". Then delete the teams from the main collection.
    - [x] Clear Users
    - [x] Copy all users to a collection called "archives_users". Then delete the users from the main collection.
    - [x] Add a button to Delete all the files in the uploads directory.
      - [x] Instead of actually deleting the files, move them to an archive directory.
    - [x] Have a confirmation modal before each action.
    - [x] Have a button to restore all the collections from the archive collections back to the main collections.
    - [x] Have a button to restore all the files from the archive directory back to the uploads directory.
    - [x] Have buttons to generate dummy data
- [ ] Review idle and absolute session lifetimes with agency requirements; the historical five-day inactivity request is not an approved production policy.
- [ ] Use modal confirmations instead of the browser's native alerts, !window.confirm like confirmation of deletions, etc
- [ ] A script to rewrite test scripts when to make sure the tests still work correctly with any updates since the tests were written.
- [ ] Make it so that the "Manage All Teams", "Team Settings", "Manage All Projects", and "Project Settings" in the Projects and Teams pages actually do something.
- [ ] Update user-levels/roles logic. -- NEED TO TEST
  - [ ] We are going to introduce a new role, "Super Admin" (represented as "superadmin" in the Model/DB).
  - [ ] Access/Restrictions to resources in the app, among the currently established roles remains the same, except we are going to take away the following for regular "Admins":
    - [ ] The "Danger Zone" section in the SystemInfoPage.
    - [ ] The ability to edit other users profiles at all.
    - [ ] The ability to delete other users.
    - [ ] The ability to manage all teams and projects.
    - [ ] The ability to mange specific teams and projects, unless they are an owner of the team or project.
    - [ ] Superseded: only superadmins may create/manage accounts; regular admins must be denied by the API as well as the UI.
  - [ ] Verify the current role/resource permission matrix; do not assume association with a resource grants unrestricted editing or bypasses approval rules.
  - [ ] Stakeholders and review assignees can only view/download the documents they are assigned to unless they are also marked as an author or owner of the document as well.
  - [ ] Verify superadmin administration permissions and account protections; privileged roles must still obey validation, audit, and applicable approval safeguards.
  - [x] Make sure to update the role of the user with resonance.designs.com@gmail.com to superadmin.
- [x] Clean up the whole "review date" thing. Right now there are multiple review date fields and it's confusing.
  - [x] Ditch the "Review Date" field.
  - [x] Change the "Opens For Review" field so that the date-picker can not go to the past.
  - [x] Under the "Opens For Review" field, add a new field called "Review Interval" that is a dropdown of options in periods of time (monthly, quarterly, semiannually, and annually) and also a custom interval option that exposes a number input field. This field should be in days and excepts a number of days. This field should take the value of the "Opens For Review" field and then add the interval to it. So if someone sets the "Opens For Review" field to today and selects monthly, the "Review Interval" field will automatically calculate what the next review date should be.
  - [x] When creating a new document, the default value for the "Review Interval" field should be quarterly.
  - [x] When editing a document, the default value for the "Review Interval" field should be whatever is currently set in the DB.
  - [x] When viewing a document, the "Review Interval" field should be disabled and read-only.
  - [x] Under the "Review Interval" field, add a new field called "Review Period" that sets the time-frame (one week, two weeks, three weeks, and a month) that review assignees have to review the document. When the review date comes around, the review assignee will receive a notification and an email with a link to the document, a calendar event attachment with the review date and the due-date (calculated by the "Review Period" field) for completing the review.
  - [x] Under the "Review Period" field, add a new field called "Last Reviewed On" that is disabled and read-only. This field should be populated with the date the review was completed.
  - [x] Under the "Last Reviewed" field, add a new field called "Next Review Due On" that is disabled and read-only. This field should be populated with the calculated date from the "Review Interval" field.
  - [x] When creating a new document, the default value for the "Last Reviewed On" field should be null.
  - [x] When viewing a document, the "Last Reviewed On" and "Next Review Due On" fields should be disabled and read-only.
  - [x] When editing a document, the "Last Reviewed On" and "Next Review Due On" fields should be disabled and read-only.
  - [x] When creating a new document, the default value for the "Next Review Due On" field should be null.
  - [x] When a review is marked as completed, the next review date should be calculated by the "Review Interval" field against the date the review was completed.
- [ ] Public self-registration is deferred and must remain disabled. Superadmin account-management UI/API is implemented; verify the latest build is published and functional on the development server.
- [ ] Add a "Create Document" button on the home page visible to those with roles that allow them to create documents that takes them directly to the CreateDocPage.
- [ ] Review/adapt the existing `.github/workflows/deploy.yml` and `scripts/apache_production_deploy.sh` for the intended deployment target; do not assume the Linode workflow can reach the internal development server.
  - [ ] Use a controlled release trigger, preserve environment files and uploaded data, install locked dependencies when needed, and build `frontend-vue`.
  - [ ] Publish the verified `frontend-vue/dist/` output to the configured Apache document root, restart the backend when needed, and perform health/login checks. Follow the canonical Ubuntu guide rather than the removed legacy React paths.
  - [ ] Include backups, migration ordering, rollback, deployment permissions, and a recoverable failure path; a full server reboot is not a normal application update step.
- [ ] Define agency-approved document classifications and enforce their corresponding access, sharing, retention, and handling rules. Labels alone do not enforce security; do not introduce unsupported government classification claims or anonymous access.
- [ ] Check that the app works using MongoDB Atlas
- [ ] Develop a short-code system to embed custom charts built with CustomChartsPage.
- [ ] Add search/filters to ViewCatsPage.
  - [ ] ViewCatsPage should be searchable by name and type.
  - [ ] ViewCatsPage should be filterable by type.
  - [ ] ViewCatsPage should have be able to sort by name, type, and created in the PaginatedCatTable component.
- [ ] Theme work is tracked in the current Vue theming/customization checklist above.
- [ ] Make sure header comments and JSDoc comments are added to all files.
- [ ] Cleanup and compartmentalize the code as much as possible.
- [ ] Security review is tracked in the current security/production-readiness checklist above.
- [ ] Soft deletion/restoration already exists. Verify deployed access restrictions, related file/history retention, restoration, and eventual purge policy rather than introducing a competing temporary-collection design.
- [x] Create a branch with local storage for data and bundle into an Electron app for desktop use
- [ ] Deferred exploratory fork: Docker/Kubernetes hosting. The current deployment remains native Ubuntu; do not introduce containers into this POC.
- [ ] Create another fork with a mobile app for iOS and Android
- [ ] Create another fork for the purpose of refactoring into a Recipes MERN app

## Remaining authentication UX follow-up

- [ ] Verify the configured password-reset email service and complete/reset-test the Vue recovery experience, including expired and single-use tokens. Keep operator recovery documented until this works end to end.
- [ ] Verify clear sign-in/recovery error feedback without account enumeration, loading states, accessible labels, and keyboard focus.
- [ ] Verify account/API responses and logs expose only necessary fields and never password hashes, reset tokens, or service secrets.

Authentication security, session lifetime, MFA, and operational checks are consolidated in the current security checklist above. Previously listed demonstration credentials have been removed; do not use or document shared default accounts/passwords.

## Document storage follow-up

- [x] Transparent encryption at rest with streaming upload encryption (no plaintext on disk) and streaming, chunk-authenticated decryption; superadmin encryption and max-upload-size settings.
- [ ] Run the Jest suites, both frontend builds, and an encrypted upload/download end-to-end check in WSL; then in development dev server. Verify `fileprotections` + uploads + key in a restore drill.
- [ ] Encrypt existing plaintext files (one-off migration script) if the agency requires all stored files encrypted, not only new uploads.
- [ ] Design and test master-key rotation (key versioning, rewrap of per-file keys only; never replace the key in place).
- [ ] Keep infrastructure disk/swap/backup encryption; application encryption does not replace it.

- [ ] Add verified self-service email changes (confirmation to the new address, security notice to the old address, expiry and single-use tokens).
- [ ] Validate My account in development: profile persistence, password policy/current-password checks, session revocation, and SSO restrictions.
