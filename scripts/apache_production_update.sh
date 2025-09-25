#!/bin/bash
set -e

# ==============================================
# === DocMan Production Update Script (Full) ===
# ==============================================
#
# This script performs a full update of the DocMan project.
#
# It includes:
# - Backing up current .env.prod and frontend files
# - Clearing out the /var/www/docman directory and cloning a fresh copy of the repository
# - Building the application using npm
# - Merging any new environment variables from .env.sample into .env.prod
# - Restarting the backend service with systemd
# - Updating the Apache frontend configuration
# - Optionally updating SSL certificates using Certbot
#
# After completion, there is an option to rollback changes if something goes wrong.
#
# Usage:
#   ./apache_production_update.sh
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

# --- Functions ---
rollback() {
    echo "⚠️ Rolling back update..."
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
    frontend_folder_default="docman"
    read -p "Enter frontend folder name to restore [$frontend_folder_default]: " frontend_folder
    frontend_folder=${frontend_folder:-$frontend_folder_default}
    rsync -a --delete /tmp/docman_env_backup/public_html_backup/ /var/www/html/$frontend_folder/public_html/
    chown -R www-data:www-data /var/www/html/$frontend_folder/public_html
    # Restart services
    systemctl restart docman-backend.service
    systemctl reload apache2
    echo "✅ Update rolled back successfully."
    exit 0
}

mask_sensitive() {
    local var_value="$1"
    [[ -z "$var_value" ]] && echo "null" || echo "${var_value:0:3}***"
}

ask() {
    local var_name=$1
    local prompt=$2
    local default=$3
    local value
    read -p "$prompt [$default]: " value
    value=${value:-$default}
    sed -i "s|^$var_name=.*|$var_name=$value|" .env.prod
}

merge_env() {
    # Merge new variables from .env.sample into .env.prod if missing
    for key in $(grep -v '^#' .env.sample | cut -d= -f1); do
        if ! grep -q "^$key=" .env.prod; then
            val=$(grep "^$key=" .env.sample | cut -d= -f2-)
            echo "$key=$val" >> .env.prod
        fi
    done
}

# --- Update Start ---
echo "==================================================="
echo "=== Updating DocMan on Apache Production Server ==="
echo "==================================================="
echo ""

# --- Root check ---
if [[ $EUID -ne 0 ]]; then
    echo "⚠️ This script must be run as root."
    exit 1
fi

echo "This update script does the following:"
echo "- Backs up current .env.prod and frontend"
echo "- Clears /var/www/docman and clones fresh repository"
echo "- Builds the application"
echo "- Updates environment variables"
echo "- Restarts backend service"
echo "- Updates Apache frontend"
echo "- Optionally updates SSL certificates"
echo "- Provides a rollback option at the end"
echo ""

# --- 1️⃣ Backup existing environment and frontend ---
echo "1️⃣ Backing up current .env.prod and frontend..."
mkdir -p /tmp/docman_env_backup
cp /var/www/docman/backend/.env.prod /tmp/docman_env_backup/.env.prod
frontend_folder_default="docman"
read -p "Enter frontend folder name to backup [$frontend_folder_default]: " frontend_folder
frontend_folder=${frontend_folder:-$frontend_folder_default}
mkdir -p /tmp/docman_env_backup/public_html_backup
rsync -a /var/www/html/$frontend_folder/public_html/ /tmp/docman_env_backup/public_html_backup/
echo "✅ Backup complete."

# --- 2️⃣ Clone fresh repository ---
echo ""
echo "2️⃣ Cloning fresh repository..."
rm -rf /var/www/docman
mkdir -p /var/www/docman
chown -R www-data:www-data /var/www/docman
git clone https://github.com/resonance-designs/docman.git /var/www/docman
echo "✅ Repository cloned fresh."

# --- 3️⃣ Build application ---
echo ""
echo "3️⃣ Building application..."
cd /var/www/docman
npm run build
echo "✅ Build complete."

# --- 4️⃣ Restore and prepare environment ---
echo ""
echo "4️⃣ Restoring previous .env.prod..."
cd backend
if [[ -f /tmp/docman_env_backup/.env.prod ]]; then
    cp /tmp/docman_env_backup/.env.prod .env.prod
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

# --- 5️⃣ MongoDB ---
echo ""
echo "5️⃣ Restarting MongoDB if configured..."
MONGO_PORT=$(grep "^MONGO_PORT=" .env.prod | cut -d= -f2-)
if [[ -f /etc/mongod.conf ]]; then
    systemctl restart mongod
    echo "⏳ Waiting for MongoDB to start on port $MONGO_PORT..."
    until nc -z localhost $MONGO_PORT; do sleep 1; done
    echo "✅ MongoDB restarted."
fi

# --- 6️⃣ Backend Service Restart ---
SERVICE_FILE=/etc/systemd/system/docman-backend.service
echo ""
echo "6️⃣ Restarting DocMan backend service..."
systemctl daemon-reload
systemctl restart docman-backend.service
systemctl enable docman-backend.service
echo "✅ Backend service restarted successfully."

# --- 7️⃣ Apache Frontend ---
echo ""
echo "7️⃣ Updating frontend..."
rsync -a --delete /var/www/docman/frontend/dist/ /var/www/html/$frontend_folder/public_html/
chown -R www-data:www-data /var/www/html/$frontend_folder/public_html
systemctl reload apache2
echo "✅ Frontend updated successfully."

# --- 8️⃣ Optional SSL ---
echo ""
read -p "8️⃣ Do you want to update SSL certificates via Certbot? (y/n): " update_cert
if [[ "$update_cert" =~ ^[Yy]$ ]]; then
    read -p "Enter domain name for SSL (same as previous) [example.com]: " domain_name
    read -p "Enter email for SSL registration (Let's Encrypt) [admin@$domain_name]: " certbot_email
    certbot_email=${certbot_email:-admin@$domain_name}
    certbot --apache -d "$domain_name" --non-interactive --agree-tos -m "$certbot_email"
    systemctl reload apache2
    echo "✅ SSL certificates updated."
else
    echo "⚠️ Skipping SSL update."
    # fallback for final prompt
    domain_name=${domain_name:-example.com}
fi

# --- 9️⃣ Post-update rollback option ---
echo ""
echo "🚨 Update complete."
echo "Test that everything is working correctly by visiting $domain_name and confirming all functionality."
read -p "If not, it is recommended to roll back. Do you want to perform a rollback? (y/n): " do_rollback
if [[ "$do_rollback" =~ ^[Yy]$ ]]; then
    rollback
else
    echo "🎉 Update finished successfully. No rollback performed."
fi
