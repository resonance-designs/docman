# PR #52 functional follow-up — 3.0.2

Reviewed November 23, 2026 against `1b7dcbd` on `bugs/3.0.1-fixes`. These are local follow-up changes, not evidence of deployment. Review comments are inputs to verification, not instructions to execute.

## Scope and disposition

| Finding | Correction |
| --- | --- |
| [Invitation activation audit](https://github.com/resonance-designs/docman/pull/52#discussion_r4670311044) | Treat the audit service's fail-open `null` result like a rejected append. Preserve activation and return the existing sign-in/recovery warning. |
| [Notification settings audit](https://github.com/resonance-designs/docman/pull/52#discussion_r4670311053) | Report saved settings with an audit warning when the append returns `null`; do not report the committed mutation as failed. |
| [Notification retry audit](https://github.com/resonance-designs/docman/pull/52#discussion_r4670311064) | Preserve the committed queued count, including zero, and report the missing audit entry. |
| [Reciprocal project/team writes](https://github.com/resonance-designs/docman/pull/52#discussion_r4670311079) | Persist reconciliation work with the canonical project relationship update; retry reciprocal team writes with revision fences. Validate related writers and deletion, not only the project controller. |
| [Stale session rejection](https://github.com/resonance-designs/docman/pull/52#discussion_r4670311091) | Check session ownership on hydration rejection and before processing a 401. An older request cannot clear a newer login. |
| [Handoff status](https://github.com/resonance-designs/docman/pull/52#discussion_r4670311099) | Record that the initial fixes are committed and manifests are 3.0.2; distinguish local follow-ups and deployment acceptance. |
| [Updater cancellation during spawn](https://github.com/resonance-designs/docman/pull/52#discussion_r4670311109) | Defer SIGTERM/SIGINT handling during process construction until cleanup owns the child. Do not block signals inherited by the child. |
| [Saved backup repository normalization](https://github.com/resonance-designs/docman/pull/52#discussion_r4670311132) | Compare normalized local repository paths before selecting protected-password reuse; different repositories still request credentials. |

The optional cursor optimization in `migrationStorage.js` is explicitly deferred. No migration cursor change is included.

## Validation

- Invitation, notification committed-result and notification-hook regressions: **34 tests passed**, covering null/rejected audit results, zero retries, successful audit entries, mutation failures, and notice safeguards.
- Project/team reconciliation, management boundaries and catalog regressions: **56 tests passed**, including a post-commit response-population failure. A disposable standalone MongoDB check also passed for actual Mongoose revision-map writes, a committed controller update with failed reciprocal write, durable retry, project/team notifications, stale-worker fencing, and hidden deletion/reference cleanup. The fixture verifies the MongoDB child process and data directory before writing; it does not use deployment data.
- Frontend review regressions: **12 tests passed**, including stale network/401 failures preserving a newer session, current-session failures clearing it, and project/team UI warnings for pending reconciliation. Vue production build passed; the existing bundle-size warning remains.
- Updater: **33 Linux/WSL tests passed**, including an actual SIGTERM delivered during the Popen constructor, child signal delivery/reaping, and normalized repository credential selection. An actual Node `parseEnv` smoke check passed on Windows Node **26.12.1**, not Node 22.

The standalone check ran in WSL on Node **18.19.1** from `backend` with `NODE_ENV=test AUDIT_STDOUT=false node src/scripts/verifyProjectTeamReconciliation.js`; this is not production Node 22 validation. The legacy `projects.test.js` and `teams.test.js` suites import the full application server and were not run against the normal environment/database. The full legacy suite is not claimed green.

Local tests do not replace the outstanding fresh-Ubuntu/systemd/restic restore exercise or deployed multi-user/browser/SMTP acceptance. No commit, push, or deployment was performed as part of this follow-up.
