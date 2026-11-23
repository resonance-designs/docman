#!/usr/bin/env bash
# @author Richard Bakos
# @version 3.0.2
# @license UNLICENSED
# See docs/deployment/automated-updates.md. This wrapper never pulls over itself.
set -Eeuo pipefail
umask 077
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
if [[ "${1:-}" == --help || "${1:-}" == -h ]]; then
  cat <<'HELP'
Usage: sudo bash update.sh [--check] [--ref origin/dev]
Update an existing standard /var/www/docman deployment on Ubuntu 26.04 LTS.
--check  Read-only local checks; no fetch, backup, build or service changes.
--ref    Approved branch/tag/commit; otherwise prompted after fetching origin.
Requires a maintenance window and a verified encrypted pre-update backup.
Existing environment files and keys are preserved; missing new keys are handled safely.
Does not upgrade the OS, Node/MongoDB major versions, or overwrite Apache/systemd files.
HELP
  exit 0
fi
[[ $EUID -eq 0 ]] || { echo 'STOP: run sudo bash update.sh.' >&2; exit 1; }
command -v python3 >/dev/null || { echo 'STOP: install python3 with sudo apt install python3.' >&2; exit 1; }
[[ -f "$ROOT/scripts/update/runner.py" ]] || { echo 'STOP: use the complete reviewed updater checkout.' >&2; exit 1; }
# Python loads this whole module before modifying the installed checkout. The running
# updater is therefore independent of files replaced by a later git switch.
exec python3 -B "$ROOT/scripts/update/runner.py" "$@"
