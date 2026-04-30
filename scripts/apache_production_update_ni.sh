#!/bin/bash
set -euo pipefail

# ======================================================================
# === DocMan Production Update Script (Non-Interactive / Modernized) ===
# ======================================================================
#
# This script performs a non-interactive update of an existing Apache-hosted
# DocMan deployment using the current checked-out repository as the source
# of truth. It creates a full persistent backup and rolls back from that
# backup if any step fails.
#
# Usage:
#   sudo ./scripts/apache_production_update_ni.sh [--ssl] [--dry-run]
#
# Optional environment variables:
#   FRONTEND_FOLDER=docman
#   CERTBOT_EMAIL=info@example.com
#   SSL_DOMAINS="docman.example.com api.docman.example.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT_DEFAULT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_ROOT="${DOCMAN_SOURCE_ROOT:-$SOURCE_ROOT_DEFAULT}"

DEPLOY_ROOT=/var/www/docman
BACKEND_DIR="$DEPLOY_ROOT/backend"
VUE_FRONTEND_DIR="$DEPLOY_ROOT/frontend-vue"
APACHE_ROOT=/var/www/html
SERVICE_FILE=/etc/systemd/system/docman-backend.service
SERVICE_USER=docman
SERVICE_GROUP=www-data
MIN_NODE_VERSION=20.19.0
FRONTEND_FOLDER="${FRONTEND_FOLDER:-docman}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
SSL_DOMAINS="${SSL_DOMAINS:-}"
SSL_FLAG=0
DRY_RUN=0
OPERATOR_USER="${SUDO_USER:-${USER:-root}}"
OPERATOR_HOME="$(getent passwd "$OPERATOR_USER" | cut -d: -f6 2>/dev/null || true)"
OPERATOR_HOME="${OPERATOR_HOME:-$HOME}"
ENV_EXPORT_DIR="$OPERATOR_HOME/docman"
EXPORTED_ENV_SOURCE_FILE="$ENV_EXPORT_DIR/previous-backend.env.prod"
DRYRUN_LOG=/tmp/docman_dryrun.log
SOURCE_SNAPSHOT=""
BACKUP_DIR=""
BACKUP_ENV_FILE=""
BACKUP_PUBLISH_DIR=""
BACKUP_SERVICE_FILE=""

is_docman_repo_root() {
    local candidate="$1"
    [[ -d "$candidate/backend" && -d "$candidate/frontend-vue" && -f "$candidate/package.json" ]]
}

resolve_source_root() {
    if is_docman_repo_root "$SOURCE_ROOT"; then
        return
    fi

    if is_docman_repo_root "$PWD"; then
        SOURCE_ROOT="$PWD"
        return
    fi

    if [[ -n "${SUDO_USER:-}" ]]; then
        local sudo_home
        sudo_home="$(getent passwd "$SUDO_USER" | cut -d: -f6 2>/dev/null || true)"
        if [[ -n "$sudo_home" && -d "$sudo_home/git/docman" ]] && is_docman_repo_root "$sudo_home/git/docman"; then
            SOURCE_ROOT="$sudo_home/git/docman"
            return
        fi
    fi

    echo "⚠️ Could not resolve a valid DocMan source root."
    echo "   Set DOCMAN_SOURCE_ROOT=/path/to/docman when running this script."
    exit 1
}

for arg in "$@"; do
    case $arg in
        --ssl) SSL_FLAG=1 ;;
        --dry-run) DRY_RUN=1 ;;
        *) echo "⚠️ Unknown argument: $arg"; exit 1 ;;
    esac
done

run_cmd() {
    if [[ $DRY_RUN -eq 1 ]]; then
        echo "[DRY-RUN] $*" | tee -a "$DRYRUN_LOG"
    else
        eval "$@"
    fi
}

cleanup_temp() {
    if [[ -n "$SOURCE_SNAPSHOT" && -d "$SOURCE_SNAPSHOT" ]]; then
        rm -rf "$SOURCE_SNAPSHOT"
    fi
}

version_ge() {
    local current="$1"
    local minimum="$2"
    [[ "$(printf '%s\n%s\n' "$minimum" "$current" | sort -V | head -n1)" == "$minimum" ]]
}

check_prerequisites() {
    if ! command -v node >/dev/null 2>&1; then
        echo "⚠️ Node.js is not installed."
        exit 1
    fi

    local node_version
    node_version=$(node -v | sed 's/^v//')
    if ! version_ge "$node_version" "$MIN_NODE_VERSION"; then
        echo "⚠️ Node.js $node_version found, but DocMan requires >= $MIN_NODE_VERSION for the current Vue/Vite build."
        exit 1
    fi

    command -v git >/dev/null 2>&1 || { echo "⚠️ Git is required."; exit 1; }
    command -v rsync >/dev/null 2>&1 || { echo "⚠️ rsync is required."; exit 1; }
    command -v nc >/dev/null 2>&1 || { echo "⚠️ Netcat (nc) is required."; exit 1; }
}

export_env_files_from_target() {
    local target="$1"
    local snapshot_root="$ENV_EXPORT_DIR/env-backups/$(basename "$target")_$(date +%F_%H%M%S)"
    local found_env=false

    [[ -d "$target" ]] || return 0

    mkdir -p "$snapshot_root"
    mkdir -p "$ENV_EXPORT_DIR"

    while IFS= read -r -d '' env_file; do
        local rel_path="${env_file#$target/}"
        local dest_dir="$snapshot_root/$(dirname "$rel_path")"
        mkdir -p "$dest_dir"
        cp "$env_file" "$dest_dir/"
        found_env=true

        if [[ "$rel_path" == "backend/.env.prod" ]]; then
            cp "$env_file" "$EXPORTED_ENV_SOURCE_FILE"
        fi
    done < <(find "$target" -maxdepth 4 -type f -name '.env*' -print0 2>/dev/null)

    if [[ "$found_env" == true ]]; then
        echo "📦 Exported previous .env files to $snapshot_root"
        [[ -f "$EXPORTED_ENV_SOURCE_FILE" ]] && echo "🔍 Preserved backend env defaults at $EXPORTED_ENV_SOURCE_FILE"
    else
        rmdir "$snapshot_root" 2>/dev/null || true
    fi
}

merge_env() {
    while IFS= read -r key; do
        [[ -z "$key" ]] && continue
        if ! grep -q "^${key}=" .env.prod; then
            local value
            value=$(grep "^${key}=" .env.sample | cut -d= -f2-)
            echo "${key}=${value}" >> .env.prod
        fi
    done < <(grep -v '^#' .env.sample | cut -d= -f1)
}

create_source_snapshot() {
    if [[ $DRY_RUN -eq 1 ]]; then
        SOURCE_SNAPSHOT="$SOURCE_ROOT"
        echo "[DRY-RUN] Would snapshot source checkout from $SOURCE_ROOT" | tee -a "$DRYRUN_LOG"
        return
    fi

    SOURCE_SNAPSHOT=$(mktemp -d /tmp/docman_update_source_XXXXXX)
    rsync -a \
        --exclude '.git' \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude 'dist-remote' \
        "$SOURCE_ROOT/" "$SOURCE_SNAPSHOT/"
}

create_full_backup() {
    BACKUP_DIR="/var/www/docman_bak_$(date +%F_%H%M%S)"
    BACKUP_ENV_FILE="$BACKUP_DIR/backend/.env.prod"
    BACKUP_PUBLISH_DIR="$BACKUP_DIR/__apache_public_html"
    BACKUP_SERVICE_FILE="$BACKUP_DIR/__systemd/docman-backend.service"

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "[DRY-RUN] Would create full backup at $BACKUP_DIR" | tee -a "$DRYRUN_LOG"
        return
    fi

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_PUBLISH_DIR"
    mkdir -p "$(dirname "$BACKUP_SERVICE_FILE")"

    if [[ -d "$DEPLOY_ROOT" ]]; then
        rsync -a "$DEPLOY_ROOT/" "$BACKUP_DIR/"
    fi

    if [[ -d "$APACHE_ROOT/$FRONTEND_FOLDER/public_html" ]]; then
        rsync -a "$APACHE_ROOT/$FRONTEND_FOLDER/public_html/" "$BACKUP_PUBLISH_DIR/"
    fi

    if [[ -f "$SERVICE_FILE" ]]; then
        cp "$SERVICE_FILE" "$BACKUP_SERVICE_FILE"
    fi

    export_env_files_from_target "$DEPLOY_ROOT"
}

restore_backup() {
    [[ -n "$BACKUP_DIR" && -d "$BACKUP_DIR" ]] || {
        echo "⚠️ No persistent backup directory is available for rollback."
        exit 1
    }

    cd /
    rm -rf "$DEPLOY_ROOT"
    mkdir -p "$DEPLOY_ROOT"
    rsync -a --delete \
        --exclude '__apache_public_html' \
        --exclude '__systemd' \
        "$BACKUP_DIR/" "$DEPLOY_ROOT/"

    if [[ -d "$BACKUP_PUBLISH_DIR" ]]; then
        mkdir -p "$APACHE_ROOT/$FRONTEND_FOLDER/public_html"
        rsync -a --delete "$BACKUP_PUBLISH_DIR/" "$APACHE_ROOT/$FRONTEND_FOLDER/public_html/"
    fi

    if [[ -f "$BACKUP_SERVICE_FILE" ]]; then
        cp "$BACKUP_SERVICE_FILE" "$SERVICE_FILE"
        systemctl daemon-reload || true
    fi

    systemctl restart docman-backend.service || true
    systemctl reload apache2 || true
}

rollback() {
    trap - ERR
    echo "⚠️ Rolling back update..."

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "[DRY-RUN] Would restore $DEPLOY_ROOT, frontend publish root, and the backend service from backup." | tee -a "$DRYRUN_LOG"
        exit 1
    fi

    restore_backup
    echo "✅ Update rolled back from $BACKUP_DIR"
    exit 1
}

sync_frontend_env_from_backend() {
    local source_frontend_env="$SOURCE_SNAPSHOT/frontend-vue/.env.production"
    local backend_env="$BACKEND_DIR/.env.prod"
    local target_env="$VUE_FRONTEND_DIR/.env.production"
    local example_env="$VUE_FRONTEND_DIR/.env.production.example"

    if [[ -f "$source_frontend_env" ]]; then
        cp "$source_frontend_env" "$target_env"
        echo "✅ Restored frontend build env from source checkout."
        return
    fi

    if grep -q '^VITE_' "$backend_env" 2>/dev/null; then
        grep '^VITE_' "$backend_env" > "$target_env"
        echo "✅ Materialized frontend-vue/.env.production from backend .env.prod VITE_* values."
        return
    fi

    if [[ -f "$example_env" ]]; then
        cp "$example_env" "$target_env"
        echo "⚠️ No real VITE_* values were found; copied frontend-vue/.env.production.example as a placeholder."
        return
    fi

    echo "⚠️ No frontend-vue/.env.production source was available."
}

publish_frontend_assets() {
    local publish_root="$APACHE_ROOT/$FRONTEND_FOLDER"

    run_cmd "mkdir -p '$publish_root/public_html'"
    run_cmd "mkdir -p '$publish_root/public_html/remote'"
    run_cmd "mkdir -p '$publish_root/logs'"
    run_cmd "rsync -a --delete '$VUE_FRONTEND_DIR/dist/' '$publish_root/public_html/'"
    run_cmd "rsync -a --delete '$VUE_FRONTEND_DIR/dist-remote/remote/' '$publish_root/public_html/remote/'"
    run_cmd "chown -R www-data:www-data '$publish_root'"
}

trap cleanup_temp EXIT
trap 'echo "❌ Error detected. Rolling back..."; rollback' ERR

if [[ $EUID -ne 0 && $DRY_RUN -eq 0 ]]; then
    echo "⚠️ This script must be run as root unless you are using --dry-run."
    exit 1
fi

check_prerequisites
resolve_source_root

echo "=============================================================="
echo "=== Updating DocMan on Apache Production Server (No Prompts) ==="
[[ $SSL_FLAG -eq 1 ]] && echo "=== SSL update requested ==="
[[ $DRY_RUN -eq 1 ]] && echo "=== DRY-RUN MODE: no changes will be applied ==="
echo "=============================================================="

echo "1️⃣ Creating full backup of the current deployment..."
create_full_backup
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Backup simulated." || echo "✅ Backup complete."

echo ""
echo "2️⃣ Snapshotting the current source checkout..."
create_source_snapshot
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Source snapshot simulated." || echo "✅ Source snapshot ready at $SOURCE_SNAPSHOT"

echo ""
echo "3️⃣ Replacing the deployed application tree..."
run_cmd "cd / && rm -rf '$DEPLOY_ROOT'"
run_cmd "mkdir -p '$DEPLOY_ROOT'"
run_cmd "rsync -a '$SOURCE_SNAPSHOT/' '$DEPLOY_ROOT/'"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Deployment tree replacement simulated." || echo "✅ Deployment tree replaced from the current source checkout."

echo ""
echo "4️⃣ Restoring and normalizing backend environment..."
if [[ -f "$BACKUP_ENV_FILE" ]]; then
    run_cmd "cp '$BACKUP_ENV_FILE' '$BACKEND_DIR/.env.prod'"
else
    run_cmd "cp '$BACKEND_DIR/.env.sample' '$BACKEND_DIR/.env.prod'"
fi
run_cmd "cd '$BACKEND_DIR' && sed -i '/^#/d;/^$/d' .env.prod"
run_cmd "cd '$BACKEND_DIR' && sed -i 's/^ACTIVE_ENV=.*/ACTIVE_ENV=1/' .env.prod"
run_cmd "cd '$BACKEND_DIR' && sed -i 's/^ENV=.*/ENV=Production/' .env.prod"
run_cmd "cd '$BACKEND_DIR' && sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env.prod"
if [[ $DRY_RUN -eq 0 ]]; then
    cd "$BACKEND_DIR"
    merge_env
else
    echo "[DRY-RUN] Would merge missing env keys from .env.sample" | tee -a "$DRYRUN_LOG"
fi
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Environment update simulated." || echo "✅ Backend environment updated."

echo ""
echo "5️⃣ Preparing frontend build environment..."
if [[ $DRY_RUN -eq 0 ]]; then
    sync_frontend_env_from_backend
else
    echo "[DRY-RUN] Would generate frontend-vue/.env.production from source or backend VITE_* values" | tee -a "$DRYRUN_LOG"
fi

echo ""
echo "6️⃣ Installing dependencies and rebuilding frontend assets..."
run_cmd "cd '$DEPLOY_ROOT' && npm ci --prefix backend"
run_cmd "cd '$DEPLOY_ROOT' && npm ci --include=dev --prefix frontend-vue"
run_cmd "cd '$DEPLOY_ROOT' && npm run build:vue"
run_cmd "cd '$DEPLOY_ROOT' && npm run build:remote --prefix frontend-vue"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Build simulated." || echo "✅ Build complete."

echo ""
echo "7️⃣ Restarting MongoDB if configured..."
if [[ $DRY_RUN -eq 0 ]]; then
    MONGO_PORT=$(grep '^MONGO_PORT=' "$BACKEND_DIR/.env.prod" | cut -d= -f2-)
else
    MONGO_PORT=27017
fi
if [[ -f /etc/mongod.conf ]]; then
    run_cmd "systemctl restart mongod"
    if [[ $DRY_RUN -eq 0 ]]; then
        echo "⏳ Waiting for MongoDB on port $MONGO_PORT..."
        until nc -z localhost "$MONGO_PORT"; do sleep 1; done
    else
        echo "[DRY-RUN] Would wait for MongoDB on port $MONGO_PORT" | tee -a "$DRYRUN_LOG"
    fi
    [[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] MongoDB restart simulated." || echo "✅ MongoDB restarted."
fi

echo ""
echo "8️⃣ Restarting DocMan backend service..."
run_cmd "install -d -o '$SERVICE_USER' -g '$SERVICE_GROUP' -m 775 '$BACKEND_DIR/uploads'"
run_cmd "chown -R '$SERVICE_USER:$SERVICE_GROUP' '$BACKEND_DIR'"
run_cmd "systemctl daemon-reload"
run_cmd "systemctl restart docman-backend.service"
run_cmd "systemctl enable docman-backend.service"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Backend restart simulated." || echo "✅ Backend service restarted successfully."

echo ""
echo "9️⃣ Publishing frontend and remote assets..."
publish_frontend_assets
run_cmd "systemctl reload apache2"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Frontend publish simulated." || echo "✅ Frontend updated successfully."

if [[ $SSL_FLAG -eq 1 ]]; then
    echo ""
    echo "🔟 Updating SSL certificates..."
    if [[ -z "$SSL_DOMAINS" || -z "$CERTBOT_EMAIL" ]]; then
        echo "⚠️ When using --ssl, set SSL_DOMAINS and CERTBOT_EMAIL first."
        echo "   Example: SSL_DOMAINS=\"docman.example.com api.docman.example.com\" CERTBOT_EMAIL=info@example.com sudo ./scripts/apache_production_update_ni.sh --ssl"
        exit 1
    fi

    certbot_args=()
    for domain in $SSL_DOMAINS; do
        certbot_args+=("-d" "$domain")
    done

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "[DRY-RUN] certbot --apache --non-interactive --agree-tos -m '$CERTBOT_EMAIL' ${certbot_args[*]}" | tee -a "$DRYRUN_LOG"
    else
        certbot --apache --non-interactive --agree-tos -m "$CERTBOT_EMAIL" "${certbot_args[@]}"
        systemctl reload apache2
    fi
    [[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] SSL update simulated." || echo "✅ SSL updated."
fi

echo ""
if [[ $DRY_RUN -eq 1 ]]; then
    echo "✅ DRY-RUN complete. Commands were logged to $DRYRUN_LOG"
else
    echo "🎉 DocMan update complete."
fi
