# CodeRabbit 3.0.2 fix record — PR #50

Captured November 22, 2026 from [release/3.0.1 into master](https://github.com/resonance-designs/docman/pull/50), reviewed commit `c548fd3121bfeef942efe5ff97bf6574ce2af921`. This is a snapshot of published review feedback, not access to CodeRabbit internal analysis or a live subscription to future comments.

Current status: **all 42 findings verified and fixed locally for 3.0.2**, November 22, 2026. None dismissed. The original deferral has been superseded by the maintainer's implementation request. Changes await commit and deployment; this is not a production security approval. Original review text below is retained as evidence, not instructions to execute.

Fixing commit: **not committed yet** on `bugs/3.0.1-fixes`. Record the commit after maintainer review. Refresh this snapshot for later CodeRabbit rounds; this document covers the captured findings only.

## Disposition and validation

Every row is confirmed and fixed locally. IDs 01–16 map to the original inline comments; 17–18 are outside-diff comments; 19–42 follow the minor-summary order. Backend evidence refers to 18 targeted Jest suites (207 passing tests, including the upload-permission suite on Linux). Frontend evidence refers to the focused Node regressions and Vue production build. Installer/updater evidence refers to Linux tests with temporary data and mocked services unless explicitly described as a live fixture.

| ID | Reported issue | Resolution and evidence |
| --- | --- | --- |
| CR50-01 | Public token in audit path | Serializer redacts public page/API token segments; serialized audit-entry regression preserves document/file traceability. |
| CR50-02 | Retained category guard after release failure | Three bounded holder-matched retries, retained-guard diagnostic, and holder-matched recovery instructions after stopping all writers; release-failure tests. |
| CR50-03 | Unguarded document/category writes | Document create/category reassignment joins the shared guard through validation/write; category interleaving regressions. |
| CR50-04 | Unchanged project teams cause forbidden metadata saves | Edit payload omits unchanged team IDs; creation/explicit relationship validation retained; frontend regression. |
| CR50-05 | Build account can modify running root installer | Re-execute private root-owned Bash copy before ownership transfer/builds; root fixture proves an unprivileged rewrite of checkout cannot change running script. |
| CR50-06 | Pending restart races backup | Stop active/activating/reloading/deactivating backend before capture and restore only when stopped by backup; shell-flow regressions. |
| CR50-07 | Partial snapshots enter retention | Unique pending tag promoted only after successful backup; exit-3 regression proves no promotion or retention after partial capture. |
| CR50-08 | Stale atomic-write temporary file blocks retries | Unique exclusive same-directory temporary files; interrupted/stale-file and failed-replace tests preserve original data and permissions. |
| CR50-09 | Password-free state with no completion marker | Completion and password removal saved atomically; startup reads state before bootstrap; marker/save failure tests. |
| CR50-10 | Public tokens in Apache logs | Safe format omits request URLs and Referer on both vhosts; real isolated Apache requests verify no token in output. Existing servers require configuration application. |
| CR50-11 | Backup fixture may write to another MongoDB | Private Unix socket plus spawned PID proof before writes; mismatch/exit tests and live disposable listener check. |
| CR50-12 | Environment bytes/hash mismatch | Single read supplies baseline bytes/hash and Node dotenv parsing; concurrent-change snapshot regression and actual parser smoke check. |
| CR50-13 | Backup repo inside replaced tree | Resolve paths and reject either-direction overlap with live/build/state/upload trees; nested/ancestor/symlink tests. |
| CR50-14 | Ignored files overwritten by Git switch | `--no-overwrite-ignore`; real temporary Git collision and successful retry tests. |
| CR50-15 | Missing checksummed uploads overlooked | Inspect all retained file records independently of checksum backfill; dry-run/apply tests include missing known-checksum files. |
| CR50-16 | SIGTERM skips updater recovery | Controlled cancellation terminates/reaps child process group before recovery; actual signal test and pre/post-mutation recovery tests. |
| CR50-17 | README pulls before backup | Both legacy interactive/unattended procedures replaced by separate-tools-clone guided updater and backup-before-checkout order; documentation reviewed. |
| CR50-18 | Stale project emits false membership notice | Save snapshots overlay only modified fields on persisted-before state; stale collaborator regression. |
| CR50-19 | Root-device test depends on TMPDIR | Device IDs explicitly matched; both subprocess paths mocked and asserted unused. |
| CR50-20 | Bootstrap fixture reaches wrong MongoDB | Child PID/serverStatus and child-alive checks precede fixture writes; real disposable bootstrap passes. |
| CR50-21 | Bootstrap child survives timeout | Abort signal settles wait, terminates and force-kills stalled child, with bounded MongoDB teardown; cancellation regression. |
| CR50-22 | Unicode digit crashes upload prompt | Conversion-safe validator rejects invalid answers and reprompts; Unicode/bounds/retry tests. |
| CR50-23 | Read-only check refreshes Git index | Git calls disable `diff.autoRefreshIndex`; updater regression. |
| CR50-24 | curlrc can bypass TLS verification | `--disable` first in health-check curl arguments; updater health regression. |
| CR50-25 | Interrupt leaves ACTIVE before paused flag | Set recovery flag before marker write; injected-interrupt test confirms marker cleanup. |
| CR50-26 | Recovery cross-reference starts service too early | Explicitly skip startup/health commands until valid audit verification; documentation reviewed. |
| CR50-27 | Second-account test precedes email setup | Email configuration/test receipt now precedes invitation/activation; resend recovery described. |
| CR50-28 | Existing short restic password undocumented | Document restriction and protected-password-file path without rotating the repository password. |
| CR50-29 | Manuals identify wrong release/source | Read root package version, Git SHA/dirty state and UTC build date; metadata tests and temporary PDF generation check. |
| CR50-30 | QA prose references satisfy missing cases | Require normalized complete 12-point case headings; missing-heading tests and all 219 existing PDF headings verified. |
| CR50-31 | Activation audit failure falsely reports inactive account | Return activated/audit-failed result and sign-in recovery; backend and UI response tests. |
| CR50-32 | Smoke registration prerequisite is obsolete | Check database-backed public account policy; registration stays disabled by default; syntax/prerequisite review (live smoke not run). |
| CR50-33 | Biography rejects line breaks | Allow LF/CRLF only for bio while preserving limits/control checks; profile regressions. |
| CR50-34 | Legacy current password rejected before bcrypt | Verify current password without new-password byte cap; retain cap on replacement; profile regression. |
| CR50-35 | Stale auth/me overwrites new session | Capture token, reject superseded hydration, preserve logout/new login; asynchronous frontend tests. |
| CR50-36 | Stale User save emits role/status notices | Only persisted modified fields participate in save comparison; stale account notification regressions. |
| CR50-37 | Notification setting/retry audit failure hides committed change | Explicit HTTP 200 committed/audit-failed result with saved state/count; backend tests and UI warning tests. |
| CR50-38 | Team acceptance cleanup failure reports failure | Separate cleanup failure from committed acceptance, log warning; management regression. |
| CR50-39 | Uppercase project ID breaks reciprocal team link | Normalize validated ID before fetched-project match; management regression. |
| CR50-40 | Public link ignores router base | Use runtime routerBase with normalized separators; root/subpath frontend tests. |
| CR50-41 | Concurrent partial dates create invalid range | Conditional date write with reload/revalidation before reciprocal team changes; concurrent invalid/valid and combined team-request tests. |
| CR50-42 | Old team request corrupts reopened editor | Generation token guards success/error/finally and close invalidates requests; asynchronous frontend tests. |

### Validation limits

Local validation: 207 tests in 18 targeted backend suites; 9 focused frontend tests plus Vue production build; 26 installer/configuration/backup/Apache tests plus the separately executed root-ownership regression; 2 bootstrap/cancellation integration tests; 30 updater safety tests; 2 manual-support tests and all 219 existing PDF case headings. The installer suite skips the root-only test when run unprivileged; that test passed separately as root in temporary directories.

Additional legacy runs were compared with an isolated pristine HEAD archive: `services/documentService.test.js` has the same 15 failures/19 passes (obsolete export/filter/sort expectations and ineffective database mocks), and `docs.test.js` has the same ESM server-import failure before tests execute. These pre-existing failures were not repaired in this review pass. The Windows upload suite's POSIX-mode assertion fails on Windows but all four upload tests pass on Linux. Do not describe the entire legacy backend test suite as passing.

No development deployment or production database was touched. Full fresh-Ubuntu/systemd recovery and real restic backup/restore acceptance remain pending; restic is unavailable in the local WSL test environment. Local tests do not establish live SMTP delivery or multi-user acceptance. Existing generated PDFs were verified, but their earlier release labels remain until regenerated. Existing Apache configurations are intentionally preserved by the updater: apply the safe logging configuration separately, and handle historical token-bearing logs/public-link revocation as appropriate.

## Original review snapshot

## Inline findings (16)

### CR50-01: `backend/src/controllers/publicDocumentController.js:48`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227590)

** Major** · **Security & Privacy** · **Quick win**

**Remove the public token from the audit request path.**

This call passes the original public URL to `downloadFile`. Its audit calls use `buildRequestInfo`, which removes query strings but retains path tokens. Each public download therefore stores its bearer token in the audit trail and can copy it to audit output. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/backend/src/services/auditService.js))

Redact the token segment in the shared audit request serializer. Keep the document and file identifiers for traceability. Add a test that checks the serialized audit entry, not only the arguments passed to a mocked `record`.

### CR50-02: `backend/src/lib/categoryWriteLock.js:7`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227593)

** Major** · **Stability & Availability** · **Quick win**

**Recover from failed release of the non-expiring guard.**

If `SystemSetting.updateOne` fails during release, `withSettingLock` suppresses the error and leaves the holder stored. With `ttlMs: null`, the guard never expires. All later book creates/updates and category updates/deletes return 409, even after the database recovers.

Retry the holder-matched release after transient failures. If release still fails, report the retained guard and provide a safe recovery path. Keep the no-takeover protection for active slow writers.

### CR50-03: `docs/resource-management.md:7`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227595)

** Major** · **Data Integrity & Integration** · **Heavy lift**

**Document create and update do not coordinate with category delete and type change.**

Category deletion and type change run under `withCategoryWriteLock`. Document create and update with a `category` value do not. A document write that starts after the reference check, and commits before the category is deleted or its type changes, leaves a document that references a missing or wrong-type category. The rule in this guide states that this cannot happen. Document writes that set or change `category` need the same coordination as the category and book writers.

Also correct the limitation at Line 24. Document writes that set or change a category are related to the guard, so they must not be listed as unrelated writers.

### CR50-04: `frontend-vue/src/views/projects/ProjectsView.vue:174`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227596)

** Major** · **Functional Correctness** · **Quick win**

**Omit unchanged team relationships from metadata updates.**

If an editor manages a project linked to teams A and B but belongs only to A, changing the description fails. `projectPayload` sends both team IDs even when the selection is unchanged. `updateProject` then requires access to every supplied team and returns 403. Metadata-only requests without `teamIds` pass this check. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/backend/src/controllers/projectsController.js))

Send `teamIds` only when the selection changes. Retain team validation for creation and explicit relationship changes.

### CR50-05: `install.sh:124`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227601)

** Critical** · **Security & Privacy** · **Quick win**

**Keep the installer read-only to the build account when it runs from the checkout.**

When `ROOT` equals `APP`, the `chown` at line 124 transfers `install.sh` to `docman-build`. Line 140 then runs `npm ci` as that account without `--ignore-scripts`, so dependency lifecycle scripts can modify `install.sh`. Bash continues the root-run script from the modified bytes, so the lifecycle script can run commands as root in later stages.

Exclude the running installer from the ownership transfer, or run from a root-owned copy outside `APP` before the transfer.

### CR50-06: `scripts/install/backup.sh:39`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227604)

** Major** · **Data Integrity & Integration** · **Quick win**

**Stop the backend when an automatic restart is pending, not only when it is active.**

A backend in its `Restart=on-failure` wait is not active. `systemctl is-active` can return non-zero for that state. The gate at `scripts/install/backup.sh:39` then skips the stop, and `restart_backend` stays `false`. systemd can start the backend during `mongodump` or the `restic backup` capture. The script's own note at line 43 requires that no application process write the database or uploads during capture. A snapshot taken this way can mix database and upload states that never existed together, and the run can still report success.

Before capture, the backup must stop the backend when it is active or waiting for an automatic restart. It must also cancel that pending restart. It must restart the backend afterward only when the backup stopped it.

### CR50-07: `scripts/install/backup.sh:47`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227611)

** Major** · **Data Integrity & Integration** · **Heavy lift**

**Keep incomplete snapshots out of retention.**

If restic cannot read an upload, it can create an incomplete snapshot and exit with status 3. The script reports failure, but the snapshot already has the `docman` tag. On a later successful run, `forget` can keep that newer incomplete snapshot for its day and remove an earlier complete snapshot from the same day. ([restic.readthedocs.io](https://restic.readthedocs.io/en/stable/040_backup.html?utm_source=openai))

Write each snapshot with a unique pending tag. Assign the retention tag to that snapshot only after `restic backup` exits successfully. Keep failed snapshots out of the retention selection.

### CR50-08: `scripts/install/configure.py:30`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227614)

** Major** · **Stability & Availability** · **Quick win**

**Make an interrupted atomic write retryable.**

If the installer stops after creating `state.json.docman-new` but before `os.replace()`, the next save fails at `O_EXCL`. That call is outside the cleanup block, so each retry fails even if `state.json` is intact. Use a unique temporary file in the target directory for each attempt. Keep exclusive creation, the requested permissions, and atomic replacement.

### CR50-09: `scripts/install/configure.py:360`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227618)

** Major** · **Stability & Availability** · **Heavy lift**

**Commit completion and password removal together.**

If saving the password-free state succeeds but creating `complete` fails, the next run treats the install as incomplete. It reaches `bootstrap.mjs`, which rejects the missing password before checking the existing superadmin. The documented rerun cannot finish the install after the operator fixes the write failure. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/install.sh))

Store completion and password removal in the same atomic state update. Make `install.sh` read that completion state before repeating bootstrap. A failure before the update must leave the original bootstrap input available.

### CR50-10: `scripts/install/docman.conf.template:48`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227624)

** Major** · **Security & Privacy** · **Quick win**

**Keep public share tokens out of Apache access logs.**

The public details and download routes use the URL token as the credential. Apache's `combined` format records the request line and the `Referer` header. A normal share visit therefore stores the token in `docman-access.log`, where a log reader can access the published file while the link remains valid. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/backend/src/routes/docsRoutes.js))

Redact token-bearing URL paths and referrers before writing access records. Keep the status and other non-sensitive fields needed for diagnostics. Apply the rule to both the public page and the public API.

### CR50-11: `scripts/update/integration_backup.py:45`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227628)

** Major** · **Data Integrity & Integration** · **Heavy lift**

**Verify that the test owns the MongoDB listener before writing fixtures.**

The probe socket releases the port before `mongod` binds it. If another MongoDB takes the port first, this test's child can fail to start while the readiness ping succeeds against the other server. The fixture insert, dump and restore can then use that server's `docman` and `restored` databases.

Use an endpoint isolated to this run. Before the first write, verify that the spawned child has started and owns the endpoint. Treat a bind failure as a startup failure, not a successful ping.

<details>
<summary> Tools</summary>
<dl>
<dd>
<br>

<details>
<summary>ast-grep (0.51.3)</summary>
<dl>
<dd>
<br>

[error] 44-44: Command coming from incoming request
Context: subprocess.run(['mongosh','--quiet',uri,'--eval','db.runCommand({ping:1})'],capture_output=True)
Note: [CWE-78] Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection').

(subprocess-from-request)

</dd>
</dl>
</details>
<details>
<summary>Ruff (0.17.4)</summary>
<dl>
<dd>
<br>

[error] 44-44: `subprocess` call: check for execution of untrusted input

(S603)

---

[error] 44-44: Starting a process with a partial executable path

(S607)

---

[error] 45-45: Multiple statements on one line (colon)

(E701)

</dd>
</dl>
</details>

</dd>
</dl>
</details>

### CR50-12: `scripts/update/runner.py:189`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227630)

** Major** · **Data Integrity & Integration** · **Quick win**

**Hash the same environment bytes that the updater can write back.**

If an operator edits `.env.prod` between Line 188 and Line 189, `original_env` contains the old configuration but `env_hash` describes the edited file. Both later hash checks pass. If the updater adds a missing machine key, `deploy()` then writes the old configuration plus the key and loses the operator's edit.

Read the original bytes once and calculate the baseline hash from those bytes. Derive the settings used for key checks from that same snapshot. A later edit should fail the hash check; an unchanged file should still allow the key append.

### CR50-13: `scripts/update/runner.py:272`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227634)

** Major** · **Data Integrity & Integration** · **Quick win**

**Reject backup repositories inside trees that the update replaces.**

The updater accepts `/var/www/html/docman/public_html/recovery` as a local POC repository. It can create and verify the snapshot there. If the staged build has no `recovery` directory, Line 369 deletes the repository with `rsync --delete`. The updater can then report a successful update and a snapshot ID that cannot be restored. ([rsync.samba.org](https://rsync.samba.org/ftp/rsync/rsync.1.html?utm_source=openai))

Before opening a local repository, resolve its path and reject any overlap with live trees the updater replaces. Keep separate mounts and local POC repositories outside those trees valid.

### CR50-14: `scripts/update/runner.py:347`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227636)

** Major** · **Data Integrity & Integration** · **Quick win**

**Prevent Git from overwriting ignored local files.**

If the checkout has a locally ignored file outside the protected paths and the approved release starts tracking that path, preflight does not list the file. `git switch` overwrites ignored files by default, and the source bundle contains committed history, not the ignored file. Use `git switch --no-overwrite-ignore --detach` so Git refuses a conflicting update and still permits a switch when no ignored files conflict. ([raw.githubusercontent.com](https://raw.githubusercontent.com/git/git/v2.53.0/builtin/checkout.c))

### CR50-15: `scripts/update/runner.py:363`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227638)

** Major** · **Data Integrity & Integration** · **Quick win**

**Check for missing uploads even when they already have checksums.**

The update guide says missing stored files stop the update. The migration only checks files whose `sha256` is null or absent. If a previously checksummed upload is missing from disk, both runs can return `missingFiles: 0`. The updater then publishes the release and starts the backend with the download still broken. Check the existence of all uploads that should still be stored, independently of the checksum backfill. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/docs/deployment/automated-updates.md))

### CR50-16: `scripts/update/runner.py:459`

Disposition: fixed locally; see the numbered table above.

[Original comment](https://github.com/resonance-designs/docman/pull/50#discussion_r4660227646)

** Major** · **Stability & Availability** · **Heavy lift**

**Route SIGTERM through update recovery.**

If the updater receives SIGTERM while taking the backup, the backend and timers may already be stopped. The default termination exits Python without entering `transaction()`'s exception handler. The old release remains offline and `ACTIVE` blocks retry, even though deployment mutation has not started. ([docs.python.org](https://docs.python.org/3.11/library/signal.html?utm_source=openai))

Handle SIGTERM as a controlled cancellation. Ensure the interrupted child command has stopped before recovery proceeds. Before mutation, restore the original service; after mutation, quarantine the deployment and retain `ACTIVE`.

## Review-summary findings (2 outside the diff and 24 minor)

The following summary is the original review evidence; current dispositions are in the table above. The outside-diff project membership notice and the minor account-state notice concern different model changes and are retained separately.

[Original review summary](https://github.com/resonance-designs/docman/pull/50#pullrequestreview-6014750867)

**Actionable comments posted: 16**
> [!NOTE]
> Due to the large number of review comments, Critical, Major severity comments were prioritized as inline comments.

> [!CAUTION]
> Some comments are outside the diff and can’t be posted inline due to GitHub limitations.
> 
> **⚠️ Outside diff range comments (2)**
> 
> <details>
> <summary><strong> Major</strong> · Remove the pull-before-backup update instruction. · <code>README.md:306</code></summary><blockquote>
> <dl>
> <dd>
> <br>
> 
> `README.md:306`
> ** Major** · **Data Integrity & Integration** · **Heavy lift**
> 
> **Remove the pull-before-backup update instruction.**
> 
> If an operator follows this procedure, they pull the live checkout before the script creates its backup. The backup then contains the updated checkout, not the old source baseline. This conflicts with the new separate-clone guidance above. The non-interactive procedure repeats the same order.
> 
> Direct both procedures to the guided updater, or preserve the old checkout before any pull. The release requires updates to preserve the existing deployment.
> 
> 
> 
> 
> 
> </dd>
> </dl>
> </blockquote></details>
> <details>
> <summary><strong> Minor</strong> · Project saves can send membership notices for changes they did not… · <code>notificationHooks.js:35</code></summary><blockquote>
> <dl>
> <dd>
> <br>
> 
> `backend/src/lib/notificationHooks.js:35`
> ** Minor** · **Functional Correctness** · **Quick win**
> 
> **Project saves can send membership notices for changes they did not make.**
> 
> The Project post-save hook passes the saving instance's in-memory `collaborators` as the after-state. Mongoose updates only modified paths on existing documents. An instance loaded before a collaborator was removed can therefore still contain that collaborator when it saves an unrelated field. The pre-save read sees the current database state without that collaborator. `changeEvents` then reports a membership change, and that removed user receives a "membership is now …" notice.
> 
> The membership comparison must reflect only the membership change that the save persisted. The required behavior is a notice only for an actual membership change; the choice of mechanism is open.
> 
> 
> 
> 
> 
> </dd>
> </dl>
> </blockquote></details>

<details>
<summary> Minor comments: 24</summary><blockquote>
<dl>
<dd>
<br>

<details>
<summary>scripts/install/test_configure.py: 1</summary><blockquote>
<dl>
<dd>
<br>

`167-168`: ** Minor** · **Functional Correctness** · **Quick win**

**Make the root-filesystem test independent of `TMPDIR`.**
`self.root` comes from `TemporaryDirectory()`. If it is on a separate mount, the root-device guard passes and `restic_init()` runs a real `restic snapshots` command. Patching `installer.run` does not intercept that call. The safety test can then fail for a missing executable or pass without testing the intended guard. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/.github/workflows/installer-checks.yml))

Supply matching device IDs for the fixture and `/`. Mock `installer.subprocess.run` as well, and assert that neither subprocess path is called.





</dd>
</dl>
</blockquote></details>
<details>
<summary>scripts/install/test-bootstrap.mjs: 2</summary><blockquote>
<dl>
<dd>
<br>

`33-33`: ** Minor** · **Data Integrity & Integration** · **Quick win**

**Verify that readiness reached the MongoDB process the test started.**
The test releases the port before spawning `mongod`. If another writable MongoDB acquires that port first, `mongoose.connect()` can succeed against it. The fixture then runs bootstrap writes on the other server, and teardown does not remove those writes.

Use an endpoint owned by the fixture, or verify the connected server's identity against the spawned process before running bootstrap. Also fail readiness promptly if that process exits before it is ready.





---

`45-47`: ** Minor** · **Stability & Availability** · **Quick win**

**Cancel child processes when the integration test times out.**
If the bootstrap child never closes, `run()` remains pending. The test timeout can report failure without settling that wait, so the outer `finally` does not stop `mongod` or remove its data directory. The live children can keep the test process running. ([nodejs.org](https://nodejs.org/download/release/v22.12.0/docs/api/test.html?utm_source=openai))

Use the test context's abort signal to terminate the bootstrap child and settle the wait. Ensure teardown still stops `mongod` and bounds the wait for it to exit.





</dd>
</dl>
</blockquote></details>
<details>
<summary>scripts/install/configure.py: 1</summary><blockquote>
<dl>
<dd>
<br>

`127-127`: ** Minor** · **Functional Correctness** · **Quick win**

**Reject invalid upload sizes without ending the questionnaire.**
`²` passes `isdigit()`, but `int('²')` raises `ValueError`. This exits the installer before it saves the answers. Catch conversion errors in the validator and return `False` so `ask()` repeats the upload question. Keep accepting integers from 1 through 250.





</dd>
</dl>
</blockquote></details>
<details>
<summary>scripts/update/runner.py: 3</summary><blockquote>
<dl>
<dd>
<br>

`166-166`: ** Minor** · **Functional Correctness** · **Quick win**

**Prevent `--check` from writing to the Git index.**
If a tracked file's mtime changes but its contents do not, `git diff` can refresh and write the index. The wrapper advertises a read-only check, but `main()` returns for `--check` only after this command runs. Use `git -c diff.autoRefreshIndex=false diff` for the working-tree check. It still detects content changes. ([git-scm.com](https://git-scm.com/docs/git-config/2.56.0.html?utm_source=openai))





---

`387-389`: ** Minor** · **Security & Privacy** · **Quick win**

**Disable the default curl configuration in HTTPS health checks.**
If root's curl configuration contains `insecure`, these commands can accept an untrusted certificate. The status and index digest can still match, so the updater reports trusted HTTPS without verifying the certificate. Put `--disable` first in each health-check curl invocation. Valid certificates and the existing response checks still work. ([curl.se](https://curl.se/docs/manpage.html?utm_source=openai))





---

`306-307`: ** Minor** · **Stability & Availability** · **Quick win**

**A handled interrupt between writing `ACTIVE` and setting `paused` leaves the marker in place.**
In `pause()`, `ACTIVE` is written at line 306 and `self.paused = True` is set at line 307. If a `KeyboardInterrupt` arrives in that narrow interval, `transaction()` catches it while `mutated` is still false and calls `restore_original()`. That method returns immediately because `paused` is false, so it never removes `ACTIVE`. No service has been stopped at that point, and the deployment is unchanged, but the next run then refuses at the `ACTIVE` checks in preflight and `pause()`. An operator must remove the marker by hand.

Require that an interrupt in this interval leaves no `ACTIVE` marker. Either set `paused` before the marker is written, or make pre-mutation recovery remove a marker that was written. The fix must keep the existing post-pause recovery behavior.





</dd>
</dl>
</blockquote></details>
<details>
<summary>docs/deployment/automated-installation.md: 2</summary><blockquote>
<dl>
<dd>
<br>

`288-288`: ** Minor** · **Functional Correctness** · **Quick win**

**Exclude service startup from the recovery cross-reference.**
Manual section 13 runs `sudo systemctl enable --now docman-backend`. Following sections 12–14 therefore starts the recovered backend before section 18.4 verifies the audit chain. This bypasses the stated recovery gate. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/docs/deployment/ubuntu-server-installation.md))

Explicitly skip startup and backend health commands during unit installation. Start the backend only after verification returns `"valid":true`. If verification fails, keep the backend stopped.





---

`156-156`: ** Minor** · **Functional Correctness** · **Quick win**

**Configure email before requesting a second-account login.**
The installer leaves email disabled. `createAccount` creates an inactive account and sends an invitation; activation requires the emailed token. The second account therefore cannot sign in at this step. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/backend/src/controllers/userAdminController.js))

Move the email configuration and delivery check before this instruction. If the account already exists, instruct the administrator to resend its invitation afterward.





</dd>
</dl>
</blockquote></details>
<details>
<summary>docs/deployment/automated-updates.md: 1</summary><blockquote>
<dl>
<dd>
<br>

`94-94`: ** Minor** · **Functional Correctness** · **Quick win**

**Document the restriction on existing repository passwords.**
If an existing repository has a password shorter than 18 characters and no reusable protected password file, the documented path fails. `runner.py` applies the 18-character minimum to every manually entered password, not only new passwords.

State this restriction and document a supported path for existing repositories with shorter passwords. Do not instruct operators to change an existing repository password merely to pass this prompt.





</dd>
</dl>
</blockquote></details>
<details>
<summary>scripts/documentation/build_manuals.py: 1</summary><blockquote>
<dl>
<dd>
<br>

`222-222`: ** Minor** · **Functional Correctness** · **Quick win**

**Generate accurate release and source identifiers.**
Every build prints `DocMan 3.0.0` and `6d864ef plus working-tree changes`. This release targets 3.0.1, and the reviewed revision is `c548fd3121bfeef942efe5ff97bf6574ce2af921`. The generated manuals therefore identify a different release and source snapshot.

Read the version and revision from build metadata, or require explicit build inputs. Keep deployment confirmation separate from source identification.





</dd>
</dl>
</blockquote></details>
<details>
<summary>scripts/documentation/verify_manuals.py: 1</summary><blockquote>
<dl>
<dd>
<br>

`42-42`: ** Minor** · **Functional Correctness** · **Quick win**

**Check case headings instead of bare ID substrings.**
The generated appendix always mentions `ENV-01` and `SEC-02` in prose. If either case entry is missing from the PDF, this assertion can still pass because the appendix contains its ID.

Compare each complete case heading, including its title, after applying the builder's text normalization and normalizing whitespace. A reference to a case must not count as the case entry.





</dd>
</dl>
</blockquote></details>
<details>
<summary>backend/src/controllers/invitationController.js: 1</summary><blockquote>
<dl>
<dd>
<br>

`47-47`: ** Minor** · **Functional Correctness** · **Quick win**

**Distinguish audit failure from activation failure.**
If `AUDIT_FAIL_CLOSED=true` and `record()` rejects after the update commits, this response says activation failed. The account is already active and its token is removed. Retrying returns 400, and requesting another invitation cannot recover this state. Track whether activation committed. For a later audit failure, provide recovery instructions that direct the recipient to sign in instead of retrying activation. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/backend/src/services/auditService.js))





</dd>
</dl>
</blockquote></details>
<details>
<summary>backend/src/controllers/authController.js: 1</summary><blockquote>
<dl>
<dd>
<br>

`58-58`: ** Minor** · **Functional Correctness** · **Quick win**

**Update the smoke-test setup for the database policy.**
With no `accounts.policy` row, this gate returns 403. However, `backend/src/scripts/smokeTest.js` still documents `LOCAL_SELF_REGISTRATION_ENABLED` as its prerequisite and requires registration to return 201. Its account setup fails, which prevents the dependent document checks from completing. Update the smoke-test prerequisite or setup to use the database policy. Keep registration disabled by default. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/backend/src/scripts/smokeTest.js))





</dd>
</dl>
</blockquote></details>
<details>
<summary>backend/src/controllers/accountController.js: 2</summary><blockquote>
<dl>
<dd>
<br>

`14-14`: ** Minor** · **Functional Correctness** · **Quick win**

**Allow line breaks in `bio`.**
The About me field is a textarea. If a user enters `First line\nSecond line`, this check rejects the newline. The profile request then returns 400 and saves none of the changes. Allow ordinary line breaks for `bio`, while retaining its length limit and control-character checks for single-line fie([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/frontend-vue/src/views/AccountView.vue))





---

`41-41`: ** Minor** · **Functional Correctness** · **Quick win**

**Apply the 72-byte limit only to the new password.**
An existing password such as `'Aa1!' + 'x'.repeat(69)` passes the supplied legacy validator but exceeds 72 bytes. This guard rejects it before verification. Bcrypt 6 can verify such existing passwords because comparison uses the first 72 by([raw.githubusercontent.com](https://raw.githubusercontent.com/kelektiv/node.bcrypt.js/v6.0.0/README.md))

Allow the existing password through `bcrypt.compare`. Keep the 72-byte limit in `passwordError` for the new password. Otherwise, these users cannot change their password through My account.





</dd>
</dl>
</blockquote></details>
<details>
<summary>frontend-vue/src/composables/useAuth.js: 1</summary><blockquote>
<dl>
<dd>
<br>

`156-156`: ** Minor** · **Functional Correctness** · **Quick win**

**Ignore `/auth/me` responses after the session token changes.**
`hydrateCurrentSession()` writes the response with `state.token`, read after the request completes. If logout or a new login happens while the request is pending, the write uses the new session state:

- After logout, `state.token` is `null`. `localStorage.setItem` stores that value as the string `"null"`. A later page load restores it as a token, so the user appears signed in until a request returns 401.
- After logout and a login as another user, the earlier response for user A can be stored with user B's token.

Nothing prevents this. The response interceptor in `api.js` handles only 401s, and `handleLogout` does not cancel pending requests.

Capture the session token before the request starts. When the response arrives, do not persist it if the current session token differs. Choose how the caller learns that the refresh was superseded.





</dd>
</dl>
</blockquote></details>
<details>
<summary>backend/src/lib/notificationHooks.js: 1</summary><blockquote>
<dl>
<dd>
<br>

`35-35`: ** Minor** · **Functional Correctness** · **Quick win**

**Compare persisted account state in the post-save notice.**
The post-save hook passes `doc.toObject()` to `emit`. That value is the in-memory document. The pre-save hook reads persisted fields. If a retained `User` document is stale, the two snapshots can differ in `role` or `isActive`. A later save can then notify a role or status change that did not occur.

For example, a caller loads a user with role `viewer`. An administrator changes the persisted role to `editor`. The caller then saves a session field, such as `refreshTokenHash` at `backend/src/controllers/authController.js:344`. Only that field is persisted, so the stored role remains `editor`. The pre-save read returns `editor`, while the post-save snapshot still contains `viewer`. The hook can then emit a role change to `viewer`.

The post-save notification must compare the account state that was persisted at save time. Unrelated saves on a stale document must not emit `role` or `isActive` events. Choose the mechanism that meets this requirement without losing or duplicating legitimate events.





</dd>
</dl>
</blockquote></details>
<details>
<summary>backend/src/controllers/notificationSettingsController.js: 1</summary><blockquote>
<dl>
<dd>
<br>

`14-15`: ** Minor** · **Functional Correctness** · **Quick win**

**Report committed changes when the audit write fails.**
With `AUDIT_FAIL_CLOSED=true`, a failed audit append makes `record()` reject after the setting or notification update has committed. Both handlers then return 503, so a client can treat a saved change as failed. A retry after that response can also report zero queued emails.

The update and the audit entry are not written in one transaction. The response must state that the change committed and that the audit entry failed. The inspected code does not establish the required status code or response shape, so choose that contract explicitly.





</dd>
</dl>
</blockquote></details>
<details>
<summary>backend/src/controllers/teamsController.js: 2</summary><blockquote>
<dl>
<dd>
<br>

`502-502`: ** Minor** · **Functional Correctness** · **Quick win**

**Do not report acceptance as failed when notification cleanup fails.**
If `Notification.updateMany` rejects, membership and invitation acceptance have already committed. The handler returns 500. A retry then returns “Invitation expired or invalid,” and Activity retains the acceptance action.

Handle notification cleanup separately. Return the committed acceptance result and log or retry cleanup. Keep the normal cleanup path unchanged.





---

`1098-1098`: ** Minor** · **Data Integrity & Integration** · **Quick win**

**Normalize the project ID before matching the reciprocal update.**
`addProjectsToTeam` checks each input ID with `mongoose.isValidObjectId`, which accepts uppercase hexadecimal. The lookup at line 1109 then compares the document's lowercase `_id.toString()` with the raw input. For an uppercase ID, the team-side link is saved, but `project.addTeam(teamId)` is skipped. The team and project records then disagree.

Compare against the normalized hexadecimal form:

<details>
<summary>Suggested fix</summary>
<dl>
<dd>
<br>

```diff
-                const project = projects.find(p => p._id.toString() === projectId);
+                const project = projects.find(p => p._id.toString() === projectId.toLowerCase());
```

</dd>
</dl>
</details>





</dd>
</dl>
</blockquote></details>
<details>
<summary>frontend-vue/src/components/PublicSharingCard.vue: 1</summary><blockquote>
<dl>
<dd>
<br>

`25-25`: ** Minor** · **Functional Correctness** · **Quick win**

**Include the configured router base in public links.**
When `routerBase` is `/docman/`, the application uses `/docman/public/documents/:token`. This expression instead copies `/public/documents/:token`, outside the application path. The runtime configuration and router support a non-root base. ([raw.githubusercontent.com](https://raw.githubusercontent.com/resonance-designs/docman/c548fd3121bfeef942efe5ff97bf6574ce2af921/frontend-vue/src/runtime/config.js))

Include the configured base when constructing the link. Preserve the current URL when the base is `/`.





</dd>
</dl>
</blockquote></details>
<details>
<summary>backend/src/controllers/projectsController.js: 1</summary><blockquote>
<dl>
<dd>
<br>

`375-375`: ** Minor** · **Functional Correctness** · **Quick win**

**Make the date-order check and the partial date update atomic.**
`updateProject` validates dates against the project loaded at line 365, then writes the date fields at lines 456–459. Between those steps, team updates at lines 378–436 await database writes. The update filter matches only `projectId`, so it does not confirm that the stored dates still match the values that were validated.

For example, the stored range is November 10–20. One request sets `startDate` to November 18. Another request sets `endDate` to November 15. Both validate against the stored range and both updates succeed. The stored range becomes November 18–15.

Make the date write conditional on the dates that were validated. Alternatively, serialize the operations. If the condition fails, reload the project and validate again. A valid update must still succeed.





</dd>
</dl>
</blockquote></details>
<details>
<summary>frontend-vue/src/views/projects/ProjectsView.vue: 1</summary><blockquote>
<dl>
<dd>
<br>

`166-166`: ** Minor** · **Functional Correctness** · **Quick win**

**Ignore team-option results from a closed editor request.**
Cancel does not stop a pending team request. If that request fails after the editor is reopened, its catch sets `choicesFailed` in the new editor. Save then stays disabled after the new request succeeds. A stale request can also clear `choicesLoading` early, and it can leave the old error text visible. The user must close and reopen the dialog to recover. Give each `openEditor` call a generation token. Apply the token to the success path, the catch, and the finally, so only the newest request writes shared state.

<details>
<summary>Suggested fix</summary>
<dl>
<dd>
<br>

```diff
+let editorGeneration = 0;
 async function openEditor(project=null) {
+ const generation=++editorGeneration;
...
   choicesLoading.value=true;
   try {
    const response=await api.get(['admin','superadmin'].includes(state.user?.role)?'/teams':'/teams/my-teams');
+   if(generation!==editorGeneration)return;
   const options=arrayOf(response.data,'teams');
   teamOptions.value=[...new Map([...options,...(project?.teams || []).filter(team=>team?._id)].map(team=>[entityId(team),team])).values()];
-  }catch(e){choicesFailed.value=true;formError.value=describeError(e,'Could not load teams. Close this dialog and retry.');}
-  finally{choicesLoading.value=false;}
+  }catch(e){
+   if(generation!==editorGeneration)return;
+   choicesFailed.value=true;formError.value=describeError(e,'Could not load teams. Close this dialog and retry.');
+  }
+  finally{
+   if(generation===editorGeneration)choicesLoading.value=false;
+  }
 }
```

</dd>
</dl>
</details>





</dd>
</dl>
</blockquote></details>

</dd>
</dl>
</blockquote></details>
