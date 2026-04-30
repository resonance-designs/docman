#!/bin/bash
set -euo pipefail

# ======================================================================
# === DocMan Production Update Script (Non-Interactive / Modernized) ===
# ======================================================================
#
# This script performs a non-interactive update of an existing Apache-hosted
# DocMan deployment and automatically rolls back if a command fails.
#
# Usage:
#   sudo ./apache_production_update_ni.sh [--ssl] [--dry-run]
#
# Optional environment variables:
#   FRONTEND_FOLDER=docman
#   CERTBOT_EMAIL=admin@example.com
#   SSL_DOMAINS="docman.example.com api.docman.example.com"

DEPLOY_ROOT=/var/www/docman
BACKEND_DIR="$DEPLOY_ROOT/backend"
VUE_FRONTEND_DIR="$DEPLOY_ROOT/frontend-vue"
APACHE_ROOT=/var/www/html
SERVICE_FILE=/etc/systemd/system/docman-backend.service
SERVICE_USER=docman
SERVICE_GROUP=www-data
MIN_NODE_VERSION=20.19.0
BACKUP_ROOT=/tmp/docman_env_backup
FRONTEND_FOLDER="${FRONTEND_FOLDER:-docman}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
SSL_DOMAINS="${SSL_DOMAINS:-}"
SSL_FLAG=0
DRY_RUN=0
DRYRUN_LOG=/tmp/docman_dryrun.log
OPERATOR_USER="${SUDO_USER:-${USER:-root}}"
OPERATOR_HOME="$(getent passwd "$OPERATOR_USER" | cut -d: -f6 2>/dev/null || true)"
OPERATOR_HOME="${OPERATOR_HOME:-$HOME}"
ENV_EXPORT_DIR="$OPERATOR_HOME/docman"
EXPORTED_ENV_SOURCE_FILE="$ENV_EXPORT_DIR/previous-backend.env.prod"

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
    local publish_root="$APACHE_ROOT/$FRONTEND_FOLDER"

    run_cmd "mkdir -p '$publish_root/public_html'"
    run_cmd "mkdir -p '$publish_root/public_html/remote'"
    run_cmd "mkdir -p '$publish_root/logs'"
    run_cmd "rsync -a --delete '$VUE_FRONTEND_DIR/dist/' '$publish_root/public_html/'"
    run_cmd "rsync -a --delete '$VUE_FRONTEND_DIR/dist-remote/remote/' '$publish_root/public_html/remote/'"
    run_cmd "chown -R www-data:www-data '$publish_root'"
}

rollback() {
    echo "⚠️ Rolling back update..."

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "[DRY-RUN] Would restore backend, env, frontend assets, and restart services." | tee -a "$DRYRUN_LOG"
        exit 1
    fi

    rm -rf "$DEPLOY_ROOT"
    git clone https://github.com/resonance-designs/docman.git "$DEPLOY_ROOT"

    if [[ -f "$BACKUP_ROOT/.env.prod" ]]; then
        cp "$BACKUP_ROOT/.env.prod" "$BACKEND_DIR/.env.prod"
        echo "✅ Backend .env.prod restored."
    fi

    if [[ -d "$BACKUP_ROOT/public_html_backup" ]]; then
        rsync -a --delete "$BACKUP_ROOT/public_html_backup/" "$APACHE_ROOT/$FRONTEND_FOLDER/public_html/"
    fi

    systemctl restart docman-backend.service
    systemctl reload apache2
    echo "✅ Update rolled back successfully."
    exit 1
}

trap 'echo "❌ Error detected. Rolling back..."; rollback' ERR

if [[ $EUID -ne 0 && $DRY_RUN -eq 0 ]]; then
    echo "⚠️ This script must be run as root unless you are using --dry-run."
    exit 1
fi

check_prerequisites

echo "=============================================================="
echo "=== Updating DocMan on Apache Production Server (No Prompts) ==="
[[ $SSL_FLAG -eq 1 ]] && echo "=== SSL update requested ==="
[[ $DRY_RUN -eq 1 ]] && echo "=== DRY-RUN MODE: no changes will be applied ==="
echo "=============================================================="

# --- 1️⃣ Backup ---
echo "1️⃣ Backing up current .env.prod and frontend..."
if [[ $DRY_RUN -eq 0 ]]; then
    mkdir -p "$BACKUP_ROOT"
    cp "$BACKEND_DIR/.env.prod" "$BACKUP_ROOT/.env.prod"
    mkdir -p "$BACKUP_ROOT/public_html_backup"
    rsync -a "$APACHE_ROOT/$FRONTEND_FOLDER/public_html/" "$BACKUP_ROOT/public_html_backup/"
    export_env_files_from_target "$DEPLOY_ROOT"
else
    echo "[DRY-RUN] Would back up $BACKEND_DIR/.env.prod and $APACHE_ROOT/$FRONTEND_FOLDER/public_html/" | tee -a "$DRYRUN_LOG"
fi
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Backup simulated." || echo "✅ Backup complete."

# --- 2️⃣ Fresh clone ---
echo ""
echo "2️⃣ Cloning fresh repository..."
run_cmd "rm -rf '$DEPLOY_ROOT'"
run_cmd "git clone https://github.com/resonance-designs/docman.git '$DEPLOY_ROOT'"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Repository clone simulated." || echo "✅ Repository cloned fresh."

# --- 3️⃣ Build Vue frontend and remote bundle ---
echo ""
echo "3️⃣ Building Vue frontend and remote bundle..."
run_cmd "cd '$DEPLOY_ROOT' && npm run build:vue"
run_cmd "cd '$DEPLOY_ROOT' && npm run build:remote --prefix frontend-vue"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Build simulated." || echo "✅ Build complete."

# --- 4️⃣ Restore environment ---
echo ""
echo "4️⃣ Restoring previous .env.prod..."
run_cmd "cd '$BACKEND_DIR'"
if [[ -f "$BACKUP_ROOT/.env.prod" ]]; then
    run_cmd "cp '$BACKUP_ROOT/.env.prod' '$BACKEND_DIR/.env.prod'"
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
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Environment update simulated." || echo "✅ Environment variables updated."

# --- 5️⃣ MongoDB ---
echo ""
echo "5️⃣ Restarting MongoDB if configured..."
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

# --- 6️⃣ Backend service ---
echo ""
echo "6️⃣ Restarting DocMan backend service..."
run_cmd "install -d -o www-data -g www-data -m 775 '$BACKEND_DIR/uploads'"
run_cmd "chown -R '$SERVICE_USER:$SERVICE_GROUP' '$BACKEND_DIR'"
run_cmd "systemctl daemon-reload"
run_cmd "systemctl restart docman-backend.service"
run_cmd "systemctl enable docman-backend.service"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Backend restart simulated." || echo "✅ Backend service restarted successfully."

# --- 7️⃣ Frontend assets ---
echo ""
echo "7️⃣ Publishing frontend and remote assets..."
publish_frontend_assets
run_cmd "systemctl reload apache2"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Frontend publish simulated." || echo "✅ Frontend updated successfully."

# --- 8️⃣ Optional SSL ---
if [[ $SSL_FLAG -eq 1 ]]; then
    echo ""
    echo "8️⃣ Updating SSL certificates..."
    if [[ -z "$SSL_DOMAINS" || -z "$CERTBOT_EMAIL" ]]; then
        echo "⚠️ When using --ssl, set SSL_DOMAINS and CERTBOT_EMAIL first."
        echo "   Example: SSL_DOMAINS=\"docman.example.com api.docman.example.com\" CERTBOT_EMAIL=info@example.com sudo ./apache_production_update_ni.sh --ssl"
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