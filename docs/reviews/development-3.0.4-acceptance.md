# development acceptance — November 24, 2026

> Anonymized historical development evidence. Hostnames, IP addresses and account names are illustrative placeholders, not real deployment settings. Results apply only to the tested environment.

## Scope and evidence

The operator completed the first browser-driven DocMan update in development/POC server. Evidence consists of the operator's screenshots, pasted terminal output, and explicit confirmation that the requested post-update checks passed. This was not an independently executed remote test or a production certification.

- Starting application: 3.0.3, feature commit `e0da7c3`.
- Target: published stable release `v3.0.4`, commit `c656a4a009dd18bfc2581deb1e1abd029ff13b86`.
- Backup selection: LOCAL encrypted restic repository. The operator created its password and confirmed initialization through the UI. No credentials are recorded here.
- The panel discovered v3.0.4 with the expected commit and accepted the interactive release and backup confirmations.
- The operator reported that the update worked, then confirmed all requested checks passed: service-check success, reload, installed version 3.0.4, no newer releases, and successful download of an existing document with expected contents.
- After the application update, the operator ran `sudo bash scripts/update/enable-web-updater.sh` from the updated checkout. Output showed `Syntax OK`, `active`, and `PASS: updater service installed...`. The global Apache ServerName warning was nonblocking.

The application update ran using the previously installed helper. The corrected 3.0.4 helper was installed afterward; this successful update therefore does not independently validate every correction in that new helper. LOCAL storage supports local recovery but does not protect against loss of the server disk. No backup snapshot ID or independently inspected restore evidence was supplied.

## Still pending

- Restore a matching encrypted backup on an isolated recovery environment and verify database, uploads, settings, access controls, and representative documents.
- Exercise failure recovery after mutation, interruption/restart handling, cancellation/timeouts, and refresh during backend downtime.
- Validate SAVED/off-server backup configuration and recovery.
- Exercise a future update using the corrected helper, including live Apache rollback failure scenarios.

## Repository closeout

[Release PR #57](https://github.com/resonance-designs/docman/pull/57) merged release/3.0.4 into master at `a5b028e`; dependency audit, installation/update safety, and GitGuardian checks passed. Dev was fast-forwarded to that merge. The published v3.0.4 tag remains at `c656a4a`; recording acceptance does not require a version bump or tag movement.
