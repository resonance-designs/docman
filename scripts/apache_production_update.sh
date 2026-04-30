#!/bin/bash
set -euo pipefail

# ================================================================
# === DocMan Production Update Script (Interactive / Modernized) ===
# ================================================================
#
# This script updates an existing Apache-hosted DocMan deployment.
#
# It performs the following high-level steps:
# - preserves the current backend env and frontend publish root
# - exports previous .env files into ~/docman/env-backups for recovery
# - replaces /var/www/docman with a fresh clone
# - rebuilds the Vue frontend and the remote bundle
# - restores and normalizes .env.prod
# - republishes the frontend and remote assets
# - restarts the backend service and reloads Apache
# - optionally runs Certbot for one or more domains
#
# Usage:
#   sudo ./apache_production_update.sh

DEPLOY_ROOT=/var/www/docman
BACKEND_DIR="$DEPLOY_ROOT/backend"
VUE_FRONTEND_DIR="$DEPLOY_ROOT/frontend-vue"
APACHE_ROOT=/var/www/html
SERVICE_FILE=/etc/systemd/system/docman-backend.service
SERVICE_USER=docman
SERVICE_GROUP=www-data
MIN_NODE_VERSION=20.19.0
BACKUP_ROOT=/tmp/docman_env_backup
FRONTEND_FOLDER_DEFAULT=docman
OPERATOR_USER="${SUDO_USER:-${USER:-root}}"
OPERATOR_HOME="$(getent passwd "$OPERATOR_USER" | cut -d: -f6 2>/dev/null || true)"
OPERATOR_HOME="${OPERATOR_HOME:-$HOME}"
ENV_EXPORT_DIR="$OPERATOR_HOME/docman"
EXPORTED_ENV_SOURCE_FILE="$ENV_EXPORT_DIR/previous-backend.env.prod"

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

rollback() {
    echo "⚠️ Rolling back update..."

    rm -rf "$DEPLOY_ROOT"
    git clone https://github.com/resonance-designs/docman.git "$DEPLOY_ROOT"

    if [[ -f "$BACKUP_ROOT/.env.prod" ]]; then
        cp "$BACKUP_ROOT/.env.prod" "$BACKEND_DIR/.env.prod"
        echo "✅ Backend .env.prod restored."
    fi

    if [[ -d "$BACKUP_ROOT/public_html_backup" ]]; then
        rsync -a --delete "$BACKUP_ROOT/public_html_backup/" "$APACHE_ROOT/$frontend_folder/public_html/"
    fi

    systemctl restart docman-backend.service
    systemctl reload apache2
    echo "✅ Update rolled back successfully."
    exit 1
}

trap 'echo "❌ Error detected during update."; rollback' ERR

if [[ $EUID -ne 0 ]]; then
    echo "⚠️ This script must be run as root."
    exit 1
fi

check_prerequisites

frontend_folder="$FRONTEND_FOLDER_DEFAULT"
read -p "Enter frontend folder name to update [$FRONTEND_FOLDER_DEFAULT]: " frontend_folder_input
frontend_folder="${frontend_folder_input:-$FRONTEND_FOLDER_DEFAULT}"

echo "==================================================="
echo "=== Updating DocMan on Apache Production Server ==="
echo "==================================================="
echo ""
echo "This update script will:"
echo "- back up the current backend env and frontend publish root"
echo "- clone a fresh repository into /var/www/docman"
echo "- rebuild the Vue frontend and remote bundle"
echo "- restore and normalize .env.prod"
echo "- restart the backend service and reload Apache"
echo ""

# --- 1️⃣ Backup current environment and frontend ---
echo "1️⃣ Backing up current .env.prod and frontend..."
mkdir -p "$BACKUP_ROOT"
cp "$BACKEND_DIR/.env.prod" "$BACKUP_ROOT/.env.prod"
mkdir -p "$BACKUP_ROOT/public_html_backup"
rsync -a "$APACHE_ROOT/$frontend_folder/public_html/" "$BACKUP_ROOT/public_html_backup/"
export_env_files_from_target "$DEPLOY_ROOT"
echo "✅ Backup complete."

# --- 2️⃣ Fresh repository checkout ---
echo ""
echo "2️⃣ Cloning fresh repository..."
rm -rf "$DEPLOY_ROOT"
git clone https://github.com/resonance-designs/docman.git "$DEPLOY_ROOT"
echo "✅ Repository cloned fresh."

# --- 3️⃣ Build current frontend/runtime ---
echo ""
echo "3️⃣ Building Vue frontend and remote bundle..."
cd "$DEPLOY_ROOT"
npm run build:vue
npm run build:remote --prefix frontend-vue
echo "✅ Build complete."

# --- 4️⃣ Restore environment ---
echo ""
echo "4️⃣ Restoring previous .env.prod..."
cd "$BACKEND_DIR"
if [[ -f "$BACKUP_ROOT/.env.prod" ]]; then
    cp "$BACKUP_ROOT/.env.prod" .env.prod
    echo "✅ .env.prod restored."
else
    echo "⚠️ No backup found, creating new from sample..."
    cp .env.sample .env.prod
fi

sed -i '/^#/d;/^$/d' .env.prod
sed -i 's/^ACTIVE_ENV=.*/ACTIVE_ENV=1/' .env.prod
sed -i 's/^ENV=.*/ENV=Production/' .env.prod
sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env.prod
merge_env
echo "✅ Environment variables updated."

# --- 5️⃣ Restart MongoDB when local config exists ---
echo ""
echo "5️⃣ Restarting MongoDB if configured..."
MONGO_PORT=$(grep '^MONGO_PORT=' .env.prod | cut -d= -f2-)
if [[ -f /etc/mongod.conf ]]; then
    systemctl restart mongod
    echo "⏳ Waiting for MongoDB to start on port $MONGO_PORT..."
    until nc -z localhost "$MONGO_PORT"; do sleep 1; done
    echo "✅ MongoDB restarted."
fi

# --- 6️⃣ Restart backend service ---
echo ""
echo "6️⃣ Restarting DocMan backend service..."
install -d -o www-data -g www-data -m 775 "$BACKEND_DIR/uploads"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$BACKEND_DIR"
systemctl daemon-reload
systemctl restart docman-backend.service
systemctl enable docman-backend.service
echo "✅ Backend service restarted successfully."

# --- 7️⃣ Publish frontend assets ---
echo ""
echo "7️⃣ Publishing frontend and remote assets..."
publish_frontend_assets "$frontend_folder"
systemctl reload apache2
echo "✅ Frontend updated successfully."

# --- 8️⃣ Optional SSL ---
echo ""
read -p "8️⃣ Do you want to update SSL certificates via Certbot? (y/n): " update_cert
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