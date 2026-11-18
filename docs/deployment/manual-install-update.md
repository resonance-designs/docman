# Manual Install / Update

The current procedure is the [complete Ubuntu installation and operations guide](ubuntu-server-installation.md).

- **New server:** follow the guide from the beginning.
- **Existing deployment:** start with [inventory and safe updates](ubuntu-server-installation.md#19-existing-installations-and-updates).
- **Recovery:** follow [backup restoration](ubuntu-server-installation.md#18-restore-and-test-a-backup).

The previous procedure deleted `/var/www/docman` after saving only environment files. That can delete uploaded documents stored inside the checkout. It has been removed. Back up the database and actual upload directory together before replacing code; keep uploaded files outside the checkout for new installations.

Existing Linode installations may have different service accounts, upload paths, Apache roots, or a separate API hostname. Record their actual configuration before adapting the new guide. Preserve backend secrets, frontend build settings, stored files, and database state; do not replace them with example values.

For optional Authentik integration and existing account-linking behavior, see [the installation guide](ubuntu-server-installation.md#20-optional-organization-sign-in) and [README](../../README.md).
