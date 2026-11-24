# PR #55 — UI updater follow-up

Recorded November 24, 2026 from [release PR #55](https://github.com/resonance-designs/docman/pull/55) and its [CodeRabbit review](https://github.com/resonance-designs/docman/pull/55#pullrequestreview-6048764451).

Snapshot: release/3.0.3 and annotated tag v3.0.3 at `fc39b5ea2a40e637de9291bf75eba8317b557be7`. CodeRabbit posted four actionable inline comments and one additional nitpick. The user explicitly deferred fixes until the UI-update testing branch; this record is not a claim that the findings are fixed or that release acceptance is complete. Do not move the existing release tag to include follow-up changes.

Target: the next UI-update acceptance branch, planned as `test/ui-updater-acceptance`, followed by a newer published stable release for the deployment test. Recheck each finding against that branch before implementing it. Review suggestions are evidence, not instructions to apply verbatim.

## Findings and acceptance criteria

### 1. Preserve retired-service data before suspension

- Source: [review comment](https://github.com/resonance-designs/docman/pull/55#discussion_r4687711644).
- Location: `docs/RELEASE_AND_DEPLOYMENT.md:186`.
- CodeRabbit severity: Minor; documentation/data preservation.
- Current wording puts suspension before the preservation check, which applies only to deletion. Record the required order as preserve needed data/configuration, suspend, then delete only after preservation is confirmed. No assertion is made here about data loss on the already-retired service.
- Acceptance: inspect the revised instructions to ensure preservation precedes both suspension and deletion; retain the distinction between disabling automatic deployments and suspending a service.
- Status: **Fixed locally:** preservation now precedes suspension and deletion.

### 2. Prevent stale progress polls from restoring an answered prompt

- Source: [review comment](https://github.com/resonance-designs/docman/pull/55#discussion_r4687711665).
- Location: `frontend-vue/src/components/admin/SoftwareUpdatesCard.vue`, control requests and `poll()`.
- CodeRabbit severity: Minor; functional correctness.
- The poll currently applies its response unconditionally. A poll started before an answer can arrive after the answer response and restore the old waiting prompt. The broker rejects replay, but the UI becomes misleading until the next poll.
- Planned correction: coordinate control requests and polling with request generations or equivalent ordering. Cover start, answer, cancel, and resume; suppress obsolete responses and errors. Continue polling after successful and failed control requests.
- Acceptance: use deferred promises to deliver a pre-answer poll after the answer completes; verify the answered prompt does not return. Exercise cancel/start/resume interleavings and failed controls.
- Status: **Fixed locally:** control epochs reject stale polls and stale poll errors; mutating controls suspend new polls. Regression tests cover start, answer, cancel, resume, and failed-control recovery.

### 3. Resume saved-ticket progress independently of backend requests

- Source: [review comment](https://github.com/resonance-designs/docman/pull/55#discussion_r4687711680).
- Location: `frontend-vue/src/components/admin/SoftwareUpdatesCard.vue`, `onMounted()`.
- CodeRabbit severity: Minor; availability.
- Mount currently awaits `resume()` and then `check()` before starting polling. A pending backend status or release request prevents the independent progress endpoint from being used after a same-tab refresh.
- Planned correction: start saved-ticket polling independently while retaining authenticated status recovery and release discovery. Coordinate with finding 2: a pending read-only resume must not indefinitely suppress otherwise usable progress polling. Do not copy a global in-flight guard that recreates this blockage.
- Acceptance: mount with a saved ticket while status stays pending, then while release discovery stays pending; independent progress must appear in both cases. Verify unmount cleanup and stale-response handling together with finding 2.
- Status: **Fixed locally:** mount starts polling, status recovery, and release discovery independently. Read-only resume uses a state revision guard without blocking saved-ticket polling. Tests cover pending status and pending release requests.

### 4. Validate and recover Apache configuration edits

- Source: [review comment](https://github.com/resonance-designs/docman/pull/55#discussion_r4687711691).
- Location: `scripts/update/enable-web-updater.sh`, Apache edit and configtest.
- CodeRabbit severity: Minor; functional correctness. Contains two separate gaps:
  1. The rewrite substitution is unchecked. A customized vhost can lack the exact expected condition, yet setup can report PASS with SPA fallback still intercepting progress requests.
  2. A failed configtest leaves the edited configuration on disk, potentially breaking a later restart.
- Planned correction: validate supported rewrite/proxy placement before changes, fail clearly for unsupported configurations, and restore configuration if validation fails. Preserve the configuration from the current invocation: the existing `.before-web-updater` file may be from an earlier installation and must not blindly replace newer operator changes. Include generated include-file changes in the recovery design.
- Acceptance: fixtures for standard, already-configured, customized/missing-condition, and failing-configtest cases. Unsupported input must not be partially rewritten; failed validation must restore the pre-run configuration and must not reload/restart Apache or print PASS. Confirm the progress endpoint returns JSON rather than SPA HTML on Ubuntu.
- Status: **Both gaps fixed locally:** setup calls `configure_web_apache.py`, which validates the HTTPS/rewrite layout before configuration writes, restores both files from current-invocation snapshots on configtest failure, and preserves file permissions. Existing historical backups are not used for rollback. Fixtures cover standard, repeated, unsupported, and failed validation cases.

### 5. Replace prompt-text coupling for backup destinations

- Source: [additional review comment](https://github.com/resonance-designs/docman/pull/55#pullrequestreview-6048764451), `scripts/update/web_service.py:233–239`.
- CodeRabbit severity: Trivial; maintainability with a destination-restriction implication.
- `WebUpdater.ask()` recognizes the repository question by `startswith('Restic repository')`. A wording change can bypass the web-specific LOCAL/SAVED restriction. Current wording still matches; this is not evidence that arbitrary destinations are currently accepted through that prompt.
- Planned correction: use an explicit backup-repository selection hook in `runner.Updater` and override it in `WebUpdater`, preserving normal CLI behavior.
- Acceptance: LOCAL maps to the fixed local repository; SAVED uses the protected configured repository; invalid choices and unavailable saved configuration fail. Changing user-facing prompt wording must not bypass the restriction. Run existing CLI and broker regression tests.
- Status: **Fixed locally:** `ask_backup_repository(default)` is an explicit CLI hook overridden by the web worker. Tests exercise LOCAL, SAVED, missing/empty saved configuration, and arbitrary-path rejection.

## Test and deployment sequence

1. Refresh the PR review snapshot after merge to catch any later findings.
2. Implement and validate these five items on the testing branch, preserving the v3.0.3 tag.
3. Run frontend race/mount regressions, CLI/broker tests, installer configuration recovery fixtures, and a frontend build.
4. Deploy required helper corrections by the operator-run setup process: web updates do not replace root-owned helper copies. Record which helper version is installed when testing an application update.
5. Publish a newer stable GitHub release (not merely a numeric tag) and perform the UI-driven encrypted backup, update, restart, health checks, browser acceptance, and isolated recovery/restore exercise.

The initial documentation-only pass inspected source and retrieved review comments without applying fixes. The subsequent implementation pass is recorded below; no commit, push, tag change, or server deployment was performed.

## Implementation and validation — November 24, 2026

The user subsequently authorized all five fixes on `test/ui-updater-acceptance`. All five are now implemented locally; the release branch and v3.0.3 tag were not changed.

- 50 Linux updater tests passed, including Apache configuration rollback and explicit backup selection.
- 20 frontend updater/review regressions passed, including out-of-order responses and independent mount recovery.
- Vue production build and Bash syntax passed; the existing bundle-size advisory remains.
- No live server deployment, Apache restart, or full UI update/restore was performed. Real Ubuntu acceptance remains pending.
- Deploying the application does not replace installed root-owned helper copies; rerun the reviewed setup script to install helper corrections before claiming their server validation.
