# Dependency security review — November 18, 2026

Status: fixes prepared locally; NMDOH has not received these dependency updates. No release/version bump or production security approval is implied.

## Changes

Refreshed all five lockfiles (root tools, backend, Vue UI, legacy React UI, documentation site). Raised minimum direct versions for the principal affected packages, including Express 4.22.3, Mongoose 8.24.10, Multer 2.5.0, AWS SES SDK 3.1171.0, Axios 1.21.1, Vue 3.5.45, and Vue Vite 8.3.8. Removed the obsolete npm `crypto` package; application cryptography uses Node's built-in module. The initial dependency pass removed unused Nodemailer 7.x; the subsequent email-configuration feature intentionally adds patched Nodemailer 10.6.0 for SMTP alongside AWS SES. The backend production audit remains clean.

Aligned Jest and babel-jest on 30.5.2 and upgraded Supertest. Backend overrides select patched Glob 14 and Minimatch 11 for Swagger/test tooling; this crosses transitive major versions and needs retained regression coverage until upstream ranges catch up. Swagger generation is included in deployment verification.

Updated Docusaurus to 3.10.2, removed its stale Webpack pin, and selected patched Tinypool 2, serialize-javascript 7, KaTeX 0.18, and SockJS's UUID 11 through overrides. Retain documentation build verification when changing/removing these overrides. UUID 11 preserves CommonJS support needed by SockJS. Upgraded legacy React Zod and its React Hook Form resolver together; adapted required-field messages and added schema/resolver regression checks.

## Audit results and remaining finding

These are npm affected-package counts, including ancestors affected by a shared dependency. They are not counts of independently exploitable vulnerabilities. Registry advisories can change after this dated review.

| Lockfile | Full tree | `--omit=dev` | Critical |
| --- | ---: | ---: | ---: |
| Root tools | 0 | 0 | 0 |
| Backend | 37 high | 0 | 0 |
| Vue frontend | 10 high | 9 high | 0 |
| Legacy React frontend | 11 high | 0 | 0 |
| Documentation site | 34 high | 34 high | 0 |

Every remaining root advisory is [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), Picomatch ReDoS through attacker-controlled repeated extglob patterns. At review time, all published versions through 4.0.7 are affected and the advisory lists **no patched version**. Do not apply npm's suggested framework downgrades or suppress the advisory to obtain a green report.

Exposure assessment:

- Backend occurrences are development/test file matching and watching; the production-only dependency tree audits clean.
- Vue Router includes file-routing/build tooling in its npm production dependency tree, so `--omit=dev` still reports Picomatch. The application uses explicit client routes. Inspection of the generated Vue remote bundle source maps found no Picomatch sources; this is evidence for that artifact, not a blanket claim about every possible import or build configuration.
- React occurrences are build tooling; its production-only dependency tree audits clean.
- Docusaurus declares build/server tools as regular dependencies. Its deployment artifact is static HTML/CSS/JS; do not expose its development server as the production website.

Mitigation pending upstream repair: build trusted source/configuration in controlled environments, do not feed user-controlled glob expressions into these tools, and do not expose watch/development servers to users. Existing production serves prebuilt files through Apache. This assessment does not accept residual risk on the agency's behalf.

Follow-up owner: application maintainers for patch tracking and regression tests; agency security for deployment-risk acceptance. Recheck by November 25, 2026, or immediately when a patch is published. Replace affected versions, remove unnecessary overrides only after verifying their replacement trees, and rerun audits/builds/tests. Keep the TODO item open until remaining findings are resolved or formally accepted.

## Repeatable checks

From the repository root:

```bash
npm run security:audit
npm run security:audit:prod
node --test scripts/security-audit.test.js
node --test frontend/src/lib/documentFormSchema.test.js
```

The first two commands audit all five lockfiles. **Expected today:** exit 1 with the remaining Picomatch findings above. A registry/network/JSON/process failure prints `AUDIT FAILED` and also exits nonzero; it must never be interpreted as a clean audit. The test commands require installed dependencies for the frontend schema test and should pass. A clean backend-only runtime check is:

```bash
cd backend
npm audit --omit=dev
```

**Expected at this checkpoint:** `found 0 vulnerabilities` and exit 0. New findings require investigation, not an automatic force upgrade. `--omit=dev` reflects npm dependency classification and does not establish browser/runtime reachability.

The GitHub dependency-audit workflow runs on relevant changes, manual dispatch, and weekly. It intentionally remains failing while advisories are outstanding; it has no advisory allowlist or severity suppression. Scheduled execution begins only after the workflow reaches the repository's default branch. The audit command now works on Windows and Linux and includes Vue and the docs site; the old implementation skipped them and had an unreliable Windows entry-point comparison.

## Verification

- Windows Node 26.12.1: clean installs; 99 targeted backend compliance/identity/user-management tests pass; Vue production and remote builds, React build, and Docusaurus production build pass.
- Three audit-tool tests cover findings, malformed responses, registry errors, and process failures; two legacy schema/resolver tests cover required fields, file validation, and custom review intervals.
- A broad legacy backend test run did not complete and was stopped; no claim that the entire historical suite passes. The targeted suites above are the completed regression evidence.
- Isolated Ubuntu/WSL with Node 22.23.4: clean installs; 99 targeted backend tests pass after fixing the global filesystem mock's false Alpine detection; five audit/schema tests pass; Vue production/remote, React, and documentation builds pass; Swagger generation returns two documented paths.
- Disposable localhost-only MongoDB: all 24 smoke checks pass, including authenticated upload/download, replacement approval/rejection, access denial, revisions, deletion/restoration, audit integrity, and logout. Independent-process concurrent publication recovery passes. This run used the memory rate-limit store, not Redis, and did not contact live SES/Authentik services.
- The smoke fixture seeds a metadata-only `deployment-checklist.md` record; migration reported that one missing fixture file. The smoke-uploaded file was downloaded and byte-compared successfully. This is not evidence that production file-integrity checks or a real migration passed.
- The Linux wrapper's final log-print command had a CRLF path error after the tests/build completed; individual test/build logs show the successes above. No claim is made that the wrapper itself exited successfully.

## Deploying this update

Use the backup/update/rollback procedure in [the Ubuntu walkthrough](deployment/ubuntu-server-installation.md#19-existing-installations-and-updates). Both backend and Vue lockfiles changed: run `npm ci` in **both** directories after selecting the reviewed commit, rebuild/publish Vue, and restart `docman-backend`. A git pull or frontend build alone does not update the backend dependencies. Keep `.env.prod`, upload storage, and service-account permissions intact. No database migration was introduced by this dependency update; follow any migration requirements for other changes included in the selected release.

Verify login, account management, document upload/replacement/approval/download, and unauthorized access after deployment. Record the deployed commit and audit results. Do not run `npm audit fix --force` on the server. Documentation and React builds are verified here but are not required software installs on the NMDOH Vue application server.
