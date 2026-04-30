#!/bin/bash
set -euo pipefail

# =====================================================================
# ===  DocMan Production Update Script (Interactive / Modernized)   ===
# =====================================================================
#
# This script updates an existing Apache-hosted DocMan deployment using the
# current checked-out repository as the source of truth.
#
# High-level flow:
# - creates a persistent full backup of the current deploy root
# - backs up the published Apache frontend assets and current service file
# - exports previous .env files into ~/docman/env-backups for recovery
# - snapshots the current source checkout into /tmp for safe rebuilds
# - replaces /var/www/docman with the updated source
# - restores backend .env.prod
# - materializes frontend-vue/.env.production for the Vite build
# - reinstalls backend/frontend dependencies
# - rebuilds the Vue frontend and remote bundle
# - restarts the backend and republishes the frontend assets
# - rolls back from the full persistent backup if anything fails
#
# Usage:
#   sudo ./scripts/apache_production_update.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT_DEFAULT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_ROOT="${DOCMAN_SOURCE_ROOT:-$SOURCE_ROOT_DEFAULT}"
SOURCE_SNAPSHOT=""

DEPLOY_ROOT=/var/www/docman
BACKEND_DIR="$DEPLOY_ROOT/backend"
VUE_FRONTEND_DIR="$DEPLOY_ROOT/frontend-vue"
APACHE_ROOT=/var/www/html
SERVICE_FILE=/etc/systemd/system/docman-backend.service
SERVICE_USER=docman
SERVICE_GROUP=www-data
MIN_NODE_VERSION=20.19.0
FRONTEND_FOLDER_DEFAULT=docman
OPERATOR_USER="${SUDO_USER:-${USER:-root}}"
OPERATOR_HOME="$(getent passwd "$OPERATOR_USER" | cut -d: -f6 2>/dev/null || true)"
OPERATOR_HOME="${OPERATOR_HOME:-$HOME}"
ENV_EXPORT_DIR="$OPERATOR_HOME/docman"
EXPORTED_ENV_SOURCE_FILE="$ENV_EXPORT_DIR/previous-backend.env.prod"
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
    SOURCE_SNAPSHOT=$(mktemp -d /tmp/docman_update_source_XXXXXX)
    rsync -a \
        --exclude '.git' \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude 'dist-remote' \
        "$SOURCE_ROOT/" "$SOURCE_SNAPSHOT/"
}

create_full_backup() {
    local frontend_folder="$1"

    BACKUP_DIR="/var/www/docman_bak_$(date +%F_%H%M%S)"
    BACKUP_ENV_FILE="$BACKUP_DIR/backend/.env.prod"
    BACKUP_PUBLISH_DIR="$BACKUP_DIR/__apache_public_html"
    BACKUP_SERVICE_FILE="$BACKUP_DIR/__systemd/docman-backend.service"

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_PUBLISH_DIR"
    mkdir -p "$(dirname "$BACKUP_SERVICE_FILE")"

    if [[ -d "$DEPLOY_ROOT" ]]; then
        rsync -a "$DEPLOY_ROOT/" "$BACKUP_DIR/"
    fi

    if [[ -d "$APACHE_ROOT/$frontend_folder/public_html" ]]; then
        rsync -a "$APACHE_ROOT/$frontend_folder/public_html/" "$BACKUP_PUBLISH_DIR/"
    fi

    if [[ -f "$SERVICE_FILE" ]]; then
        cp "$SERVICE_FILE" "$BACKUP_SERVICE_FILE"
    fi

    export_env_files_from_target "$DEPLOY_ROOT"

    echo "📦 Full deployment backup created at $BACKUP_DIR"
}

restore_backup() {
    local frontend_folder="$1"

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
        mkdir -p "$APACHE_ROOT/$frontend_folder/public_html"
        rsync -a --delete "$BACKUP_PUBLISH_DIR/" "$APACHE_ROOT/$frontend_folder/public_html/"
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
    echo "⚠️ Rolling back update from persistent backup..."
    restore_backup "$frontend_folder"
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
    local frontend_folder="$1"
    local publish_root="$APACHE_ROOT/$frontend_folder"

    mkdir -p "$publish_root/public_html"
    mkdir -p "$publish_root/public_html/remote"
    mkdir -p "$publish_root/logs"

    rsync -a --delete "$VUE_FRONTEND_DIR/dist/" "$publish_root/public_html/"
    rsync -a --delete "$VUE_FRONTEND_DIR/dist-remote/remote/" "$publish_root/public_html/remote/"
    chown -R www-data:www-data "$publish_root"
}

trap cleanup_temp EXIT
trap 'echo "❌ Error detected during update."; rollback' ERR

if [[ $EUID -ne 0 ]]; then
    echo "⚠️ This script must be run as root."
    exit 1
fi

check_prerequisites
resolve_source_root

frontend_folder="$FRONTEND_FOLDER_DEFAULT"
read -p "Enter frontend folder name to update [$FRONTEND_FOLDER_DEFAULT]: " frontend_folder_input
frontend_folder="${frontend_folder_input:-$FRONTEND_FOLDER_DEFAULT}"

echo "==================================================="
echo "=== Updating DocMan on Apache Production Server ==="
echo "==================================================="
echo ""
echo "This update script will:"
echo "- create a full persistent backup of /var/www/docman"
echo "- back up the current Apache publish root and service unit"
echo "- snapshot the current source checkout"
echo "- rebuild the Vue frontend and remote bundle from the current checkout"
echo "- restore and normalize backend .env.prod"
echo "- generate frontend-vue/.env.production for the Vite build"
echo "- restart the backend service and reload Apache"
echo ""

echo "1️⃣ Creating full backup of the current deployment..."
create_full_backup "$frontend_folder"
echo "✅ Backup complete."

echo ""
echo "2️⃣ Snapshotting the current source checkout..."
create_source_snapshot
echo "✅ Source snapshot ready at $SOURCE_SNAPSHOT"

echo ""
echo "3️⃣ Replacing the deployed application tree..."
cd /
rm -rf "$DEPLOY_ROOT"
mkdir -p "$DEPLOY_ROOT"
rsync -a "$SOURCE_SNAPSHOT/" "$DEPLOY_ROOT/"
echo "✅ Deployment tree replaced from the current source checkout."

echo ""
echo "4️⃣ Restoring and normalizing backend environment..."
cd "$BACKEND_DIR"
if [[ -f "$BACKUP_ENV_FILE" ]]; then
    cp "$BACKUP_ENV_FILE" .env.prod
    echo "✅ .env.prod restored from the full deployment backup."
else
    echo "⚠️ No previous backend env backup found. Creating a new one from .env.sample."
    cp .env.sample .env.prod
fi

sed -i '/^#/d;/^$/d' .env.prod
sed -i 's/^ACTIVE_ENV=.*/ACTIVE_ENV=1/' .env.prod
sed -i 's/^ENV=.*/ENV=Production/' .env.prod
sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env.prod
merge_env
echo "✅ Backend environment updated."

echo ""
echo "5️⃣ Preparing frontend build environment..."
sync_frontend_env_from_backend

echo ""
echo "6️⃣ Installing dependencies and rebuilding frontend assets..."
cd "$DEPLOY_ROOT"
npm ci --prefix backend
npm ci --include=dev --prefix frontend-vue
npm run build:vue
npm run build:remote --prefix frontend-vue
echo "✅ Vue frontend and remote bundle build complete."

echo ""
echo "7️⃣ Restarting MongoDB if configured..."
MONGO_PORT=$(grep '^MONGO_PORT=' "$BACKEND_DIR/.env.prod" | cut -d= -f2-)
if [[ -f /etc/mongod.conf ]]; then
    systemctl restart mongod
    echo "⏳ Waiting for MongoDB to start on port $MONGO_PORT..."
    until nc -z localhost "$MONGO_PORT"; do sleep 1; done
    echo "✅ MongoDB restarted."
fi

echo ""
echo "8️⃣ Restarting DocMan backend service..."
install -d -o "$SERVICE_USER" -g "$SERVICE_GROUP" -m 775 "$BACKEND_DIR/uploads"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$BACKEND_DIR"
systemctl daemon-reload
systemctl restart docman-backend.service
systemctl enable docman-backend.service
echo "✅ Backend service restarted successfully."

echo ""
echo "9️⃣ Publishing frontend and remote assets..."
publish_frontend_assets "$frontend_folder"
systemctl reload apache2
echo "✅ Frontend updated successfully."

echo ""
read -p "🔟 Do you want to update SSL certificates via Certbot? (y/n): " update_cert
if [[ "$update_cert" =~ ^[Yy]$ ]]; then
    read -p "Enter domains for Certbot (space-separated, e.g. docman.resonancedesigns.dev api.docman.resonancedesigns.dev): " certbot_domains
    read -p "Enter email for SSL registration (Let's Encrypt): " certbot_email

    if [[ -z "$certbot_domains" || -z "$certbot_email" ]]; then
        echo "⚠️ Domains and registration email are required for SSL updates."
        exit 1
    fi

    certbot_args=()
    for domain in $certbot_domains; do
        certbot_args+=("-d" "$domain")
    done

    certbot --apache --non-interactive --agree-tos -m "$certbot_email" "${certbot_args[@]}"
    systemctl reload apache2
    echo "✅ SSL certificates updated."
fi

echo ""
echo "🎉 Update finished successfully."
