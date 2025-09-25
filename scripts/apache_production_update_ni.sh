#!/bin/bash
set -e

# ======================================================================
# === DocMan Production Non-Interactive Update Script (Optional SSL) ===
# ======================================================================
#
# This script updates the production version of DocMan running on an Apache server.
#
# Features:
# - Performs a non-interactive update to ensure minimal downtime.
# - Automatically rolls back changes if any error occurs during the update process.
# - Supports optional SSL certificate renewal using Certbot.
#
# Prerequisites:
# - Requires root access or sudo privileges.
#
# Usage:
#   ./apache_production_update_ni.sh [--ssl] [--dry-run]
#
# Options:
#   --ssl      Enable SSL certificate renewal using Certbot.
#   --dry-run  Perform a dry run without making actual changes. Useful for testing purposes
#
# Notes:
# - The script assumes you have already set up your environment variables (.env.prod).
# - If no backup is found, it creates a new one based on .env.sample
#
# Author: Richard Bakos <resonance.designs.com@gmail.com>
# Organization: Resonance Designs
# Website: https://resonancedesigns.dev
# GitHub: https://github.com/resonance-designs
# Date: 2025-09-24

# --- Configuration (Modify these values according to your setup) ---
FRONTEND_FOLDER="docman"
DOMAIN_NAME="example.com"
CERTBOT_EMAIL="admin@$DOMAIN_NAME"
SSL_FLAG=0
DRY_RUN=0
DRYRUN_LOG="/tmp/docman_dryrun.log"

# --- Parse arguments ---
for arg in "$@"; do
    case $arg in
        --ssl) SSL_FLAG=1 ;;
        --dry-run) DRY_RUN=1 ;;
        *) echo "⚠️ Unknown argument: $arg"; exit 1 ;;
    esac
done

# --- Wrapper for commands ---
run_cmd() {
    if [[ $DRY_RUN -eq 1 ]]; then
        echo "[DRY-RUN] $*" | tee -a "$DRYRUN_LOG"
    else
        eval "$@"
    fi
}

# --- Functions ---
rollback() {
    echo "⚠️ Rolling back update..."
    if [[ $DRY_RUN -eq 1 ]]; then
        echo "[DRY-RUN] Would restore backend, frontend, and restart services." | tee -a "$DRYRUN_LOG"
        exit 0
    fi
    # Restore backend
    rm -rf /var/www/docman
    mkdir -p /var/www/docman
    chown -R www-data:www-data /var/www/docman
    git clone https://github.com/resonance-designs/docman.git /var/www/docman
    cd /var/www/docman/backend
    if [[ -f /tmp/docman_env_backup/.env.prod ]]; then
        cp /tmp/docman_env_backup/.env.prod .env.prod
        echo "✅ Backend .env.prod restored."
    fi
    # Restore frontend
    rsync -a --delete /tmp/docman_env_backup/public_html_backup/ /var/www/html/$FRONTEND_FOLDER/public_html/
    chown -R www-data:www-data /var/www/html/$FRONTEND_FOLDER/public_html
    # Restart services
    systemctl restart docman-backend.service
    systemctl reload apache2
    echo "✅ Update rolled back successfully."
    exit 1
}

merge_env() {
    for key in $(grep -v '^#' .env.sample | cut -d= -f1); do
        if ! grep -q "^$key=" .env.prod; then
            val=$(grep "^$key=" .env.sample | cut -d= -f2-)
            echo "$key=$val" >> .env.prod
        fi
    done
}

# --- Trap errors for rollback ---
trap 'echo "❌ Error detected. Rolling back..."; rollback' ERR

# --- Root check ---
if [[ $EUID -ne 0 && $DRY_RUN -eq 0 ]]; then
    echo "⚠️ This script must be run as root."
    exit 1
fi

# --- Begin Update ---
echo "========================================================="
echo "===    Updating DocMan on Apache Production Server    ==="
echo "=== Non-Interactive Script with Auto-Rollback Enabled ==="
[[ $SSL_FLAG -eq 1 ]] && echo "===                Running SSL Updates                ===" || echo "===              Not Running SSL Updates              ==="
[[ $DRY_RUN -eq 1 ]] && echo "===       DRY-RUN MODE: No changes will be made       ==="
echo "========================================================="
echo ""
echo "This script updates the production version of DocMan running on an Apache server."
echo ""
echo "Features:"
echo "- Performs a non-interactive update to ensure minimal downtime."
echo "- Automatically rolls back changes if any error occurs during the update process."
echo "- Supports optional SSL certificate renewal using Certbot."
echo ""

# --- 1️⃣ Backup ---
echo "1️⃣ Backing up current .env.prod and frontend..."
if [[ $DRY_RUN -eq 0 && -f /tmp/docman_env_backup/.env.prod ]]; then
    echo "⚠️ Backup already exists at /tmp/docman_env_backup/.env.prod, skipping overwrite."
else
    run_cmd "mkdir -p /tmp/docman_env_backup"
    run_cmd "cp /var/www/docman/backend/.env.prod /tmp/docman_env_backup/.env.prod"
    run_cmd "mkdir -p /tmp/docman_env_backup/public_html_backup"
    run_cmd "rsync -a /var/www/html/$FRONTEND_FOLDER/public_html/ /tmp/docman_env_backup/public_html_backup/"
fi
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Backup simulated." || echo "✅ Backup complete."

# --- 2️⃣ Clone fresh repository ---
echo ""
echo "2️⃣ Cloning fresh repository..."
run_cmd "rm -rf /var/www/docman"
run_cmd "mkdir -p /var/www/docman"
run_cmd "chown -R www-data:www-data /var/www/docman"
run_cmd "git clone https://github.com/resonance-designs/docman.git /var/www/docman"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Repository clone simulated." || echo "✅ Repository cloned fresh."

# --- 3️⃣ Build ---
echo ""
echo "3️⃣ Building application..."
run_cmd "cd /var/www/docman && npm run build"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Build simulated." || echo "✅ Build complete."

# --- 4️⃣ Restore environment ---
echo ""
echo "4️⃣ Restoring previous .env.prod..."
run_cmd "cd /var/www/docman/backend"
if [[ -f /tmp/docman_env_backup/.env.prod ]]; then
    run_cmd "cp /tmp/docman_env_backup/.env.prod .env.prod"
    [[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] .env.prod restore simulated." || echo "✅ .env.prod restored."
else
    run_cmd "cp .env.sample .env.prod"
    [[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Created .env.prod from sample." || echo "✅ .env.prod created from sample."
fi
run_cmd "sed -i '/^#/d;/^$/d' .env.prod"
run_cmd "sed -i 's/^ACTIVE_ENV=.*/ACTIVE_ENV=1/' .env.prod"
run_cmd "sed -i 's/^ENV=.*/ENV=Production/' .env.prod"
run_cmd "sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env.prod"
merge_env
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Environment variables updated." || echo "✅ Environment variables updated."

# --- 5️⃣ MongoDB ---
echo ""
echo "5️⃣ Restarting MongoDB if configured..."
MONGO_PORT=$(grep "^MONGO_PORT=" .env.prod | cut -d= -f2-)
if [[ -f /etc/mongod.conf ]]; then
    run_cmd "systemctl restart mongod"
    if [[ $DRY_RUN -eq 0 ]]; then
        echo "⏳ Waiting for MongoDB on port $MONGO_PORT..."
        until nc -z localhost $MONGO_PORT; do sleep 1; done
    else
        echo "[DRY-RUN] Would wait for MongoDB on port $MONGO_PORT"
    fi
    [[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] MongoDB restart simulated." || echo "✅ MongoDB restarted."
fi

# --- 6️⃣ Backend service ---
echo ""
echo "6️⃣ Restarting DocMan backend service..."
run_cmd "systemctl daemon-reload"
run_cmd "systemctl restart docman-backend.service"
run_cmd "systemctl enable docman-backend.service"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Backend service restart simulated." || echo "✅ Backend service restarted successfully."

# --- 7️⃣ Frontend ---
echo ""
echo "7️⃣ Updating frontend..."
run_cmd "rsync -a --delete /var/www/docman/frontend/dist/ /var/www/html/$FRONTEND_FOLDER/public_html/"
run_cmd "chown -R www-data:www-data /var/www/html/$FRONTEND_FOLDER/public_html"
run_cmd "systemctl reload apache2"
[[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] Frontend update simulated." || echo "✅ Frontend updated successfully."

# --- Optional SSL ---
if [[ $SSL_FLAG -eq 1 ]]; then
    echo "8️⃣ Updating SSL certificates..."
    run_cmd "certbot --apache -d \"$DOMAIN_NAME\" --non-interactive --agree-tos -m \"$CERTBOT_EMAIL\""
    run_cmd "systemctl reload apache2"
    [[ $DRY_RUN -eq 1 ]] && echo "[DRY-RUN] SSL update simulated." || echo "✅ SSL updated."
fi

# --- Completion ---
echo ""
if [[ $DRY_RUN -eq 1 ]]; then
    echo "✅ DRY-RUN: No changes were applied. Commands logged to $DRYRUN_LOG"
else
    echo "🎉 DocMan update complete. All steps finished successfully."
fi