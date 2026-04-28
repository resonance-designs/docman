#!/bin/bash
set -euo pipefail

# ==================================================
# === DocMan Production Deployment Script (Full) ===
# ==================================================
#
# This script deploys DocMan to a production server running Apache.
#
# It performs the following steps:
#   1. Checks prerequisites (Node.js, Apache, UFW, Certbot).
#   2. Clones the repository from GitHub.
#   3. Installs dependencies and builds the application using npm.
#   4. Prepares the environment by setting up MongoDB configurations,
#      including TLS/SSL settings if desired.
#   5. Configures other essential environment variables such as Node.js port,
#      Redis, JWT keys, and AWS SES credentials.
#   6. Provides a summary of the final configuration before proceeding further.
#   7. Prompts the user to review their configuration before proceeding.
#   8. Starts the MongoDB service and waits until it's ready.
#   9. Creates a systemd service unit for DocMan.
#  10. Enables and starts the DocMan service.
#  11. Generates letsencrypt SSL/TLS certificates with certbot for HTTPS support.
#  12. Configures Apache virtual hosts for HTTP and HTTPS redirection.
#  13. Restarts Apache to apply changes.
#  14. Displays a success message upon completion.
#
# Usage:
#   sudo ./apache_production_deploy.sh
#
# Note: This script assumes that you have already set up a non-root user with sudo privileges.
#
# Author: Richard Bakos <resonance.designs.com@gmail.com>
# Organization: Resonance Designs
# Website: https://resonancedesigns.dev
# GitHub: https://github.com/resonance-designs
# Date: 2025-09-24

DEPLOY_ROOT=/var/www/docman
BACKEND_DIR="$DEPLOY_ROOT/backend"
VUE_FRONTEND_DIR="$DEPLOY_ROOT/frontend-vue"
APACHE_ROOT=/var/www/html
SERVICE_FILE=/etc/systemd/system/docman-backend.service
SERVICE_USER=docman
SERVICE_GROUP=www-data
MIN_NODE_VERSION=20.19.0
ENV_SOURCE_FILE=""

# --- Functions ---
rollback() {
    echo "⚠️ Rolling back deployment..."
    rm -rf "$DEPLOY_ROOT"
    echo "Deployment has been successfully reversed."
    exit 0
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

detect_previous_env_source() {
    local candidates=()
    local latest_backup

    if [[ -f "$BACKEND_DIR/.env.prod" ]]; then
        ENV_SOURCE_FILE="$BACKEND_DIR/.env.prod"
        return
    fi

    latest_backup=$(ls -dt /var/www/docman_bak_* 2>/dev/null | head -n1 || true)
    if [[ -n "$latest_backup" && -f "$latest_backup/backend/.env.prod" ]]; then
        ENV_SOURCE_FILE="$latest_backup/backend/.env.prod"
        return
    fi

    ENV_SOURCE_FILE=""
}

env_default() {
    local var_name="$1"
    local fallback="${2:-}"

    if [[ -n "$ENV_SOURCE_FILE" && -f "$ENV_SOURCE_FILE" ]]; then
        local value
        value=$(grep -E "^${var_name}=" "$ENV_SOURCE_FILE" | tail -n1 | cut -d= -f2- || true)
        if [[ -n "$value" && "$value" != "null" ]]; then
            echo "$value"
            return
        fi
    fi

    echo "$fallback"
}

mask_sensitive() {
    local var_value="$1"
    [[ -z "$var_value" ]] && echo "null" || echo "${var_value:0:3}***"
}

version_ge() {
    local current="$1"
    local minimum="$2"
    [[ "$(printf '%s\n%s\n' "$minimum" "$current" | sort -V | head -n1)" == "$minimum" ]]
}

detect_existing_mongo_setup() {
    [[ -f /etc/mongod.conf ]]
}

read_existing_mongo_value() {
    local pattern="$1"
    awk -F': ' "$pattern {print \$2; exit}" /etc/mongod.conf 2>/dev/null
}

backup_if_exists() {
    local target="$1"
    if [[ -e "$target" ]]; then
        local backup_path="${target}_bak_$(date +%F_%H%M%S)"
        echo "⚠️ Existing path detected at $target"
        echo "🔄 Backing it up to $backup_path"
        mv "$target" "$backup_path"
    fi
}

ensure_service_user() {
    if id "$SERVICE_USER" >/dev/null 2>&1; then
        echo "✅ Service user '$SERVICE_USER' already exists."
        return
    fi

    echo "🔧 Creating service user '$SERVICE_USER'..."
    useradd --system --create-home --home-dir "$DEPLOY_ROOT" --gid "$SERVICE_GROUP" --shell /usr/sbin/nologin "$SERVICE_USER"
}

write_backend_service() {
    if [[ -f "$SERVICE_FILE" ]]; then
        cp "$SERVICE_FILE" "${SERVICE_FILE}.bak.$(date +%F_%H%M%S)"
        rm -f "$SERVICE_FILE"
    fi

    cat <<EOL > "$SERVICE_FILE"
[Unit]
Description=RDocMan Backend
After=network.target

[Service]
WorkingDirectory=$BACKEND_DIR
Environment=NODE_ENV=production
Environment=ATLAS=no
EnvironmentFile=$BACKEND_DIR/.env.prod
ExecStart=/usr/bin/npm run prod
User=$SERVICE_USER
Group=$SERVICE_GROUP
Restart=always
RestartSec=3
ExecStartPre=/usr/bin/install -d -o $SERVICE_GROUP -g $SERVICE_GROUP -m 775 $BACKEND_DIR/uploads
NoNewPrivileges=true
AmbientCapabilities=
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$BACKEND_DIR

[Install]
WantedBy=multi-user.target
EOL
}

publish_frontend_assets() {
    local frontend_folder="$1"
    local publish_root="$APACHE_ROOT/$frontend_folder"

    mkdir -p "$publish_root/public_html"
    mkdir -p "$publish_root/public_html/remote"
    mkdir -p "$publish_root/logs"

    rsync -a --delete "$VUE_FRONTEND_DIR/dist/" "$publish_root/public_html/"
    rsync -a --delete "$VUE_FRONTEND_DIR/dist-remote/remote/" "$publish_root/public_html/remote/"
    chown -R www-data:www-data "$publish_root/public_html"
}

check_prerequisites() {
    echo ""
    echo "🔍 Checking prerequisites..."
    missing_packages=()

    # Node.js (>=20.19.0 for current Vite/Vuetify toolchain)
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v | sed 's/v//')
        if ! version_ge "$NODE_VERSION" "$MIN_NODE_VERSION"; then
            echo "⚠️ Node.js $NODE_VERSION found (need >= $MIN_NODE_VERSION)."
            missing_packages+=("nodejs" "npm")
        else
            echo "✅ Node.js $NODE_VERSION installed."
        fi
    else
        echo "⚠️ Node.js not found."
        missing_packages+=("nodejs" "npm")
    fi

    # Git
    if ! command -v git >/dev/null 2>&1; then
        echo "⚠️ Git not found."
        missing_packages+=("git")
    else
        echo "✅ Git installed."
    fi

    # Apache2
    if ! command -v apache2 >/dev/null 2>&1; then
        echo "⚠️ Apache2 not found."
        missing_packages+=("apache2")
    else
        echo "✅ Apache2 installed."
    fi

    # Netcat (used for checking Mongo startup)
    if ! command -v nc >/dev/null 2>&1; then
        echo "⚠️ Netcat (nc) not found."
        missing_packages+=("netcat-openbsd")
    else
        echo "✅ Netcat installed."
    fi

    # rsync
    if ! command -v rsync >/dev/null 2>&1; then
        echo "⚠️ rsync not found."
        missing_packages+=("rsync")
    else
        echo "✅ rsync installed."
    fi

    # UFW (mandatory)
    if ! command -v ufw >/dev/null 2>&1; then
        echo "⚠️ UFW not found."
        missing_packages+=("ufw")
    else
        ufw allow 'Apache Full'
        echo "✅ UFW installed and Apache traffic allowed."
    fi

    # Certbot
    dpkg -l certbot >/dev/null 2>&1 || missing_packages+=("certbot")
    dpkg -l python3-certbot-apache >/dev/null 2>&1 || missing_packages+=("python3-certbot-apache")

    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        echo ""
        echo "⚠️ Missing packages: ${missing_packages[*]}"
        read -p "Install them now? (y/n): " install_missing
        if [[ "$install_missing" =~ ^[Yy]$ ]]; then
            apt update && apt install -y "${missing_packages[@]}"
            ufw allow 'Apache Full'
        else
            echo "⚠️ Cannot continue without prerequisites. Exiting."
            exit 1
        fi
    else
        ufw allow 'Apache Full'
        echo "✅ All prerequisites satisfied."
    fi
}

# --- Deployment Start ---
echo "===================================================="
echo "=== Deploying DocMan to Apache Production Server ==="
echo "===================================================="
echo ""
echo "This script deploys DocMan to a production server running Apache."
echo ""
echo "It performs the following steps:"
echo "  1. Checks prerequisites (Node.js >= $MIN_NODE_VERSION, Apache, UFW, Certbot)."
echo "  2. Clones a fresh repository checkout from GitHub."
echo "  3. Installs dependencies, builds the Vue frontend, and builds the remote desktop bundle."
echo "  4. Prepares the environment by setting up MongoDB configurations,"
echo "     including TLS/SSL settings if desired."
echo "  5. Configures other essential environment variables such as Node.js port,"
echo "     Redis, JWT keys, and AWS SES credentials."
echo "  6. Provides a summary of the final configuration before proceeding further."
echo "  7. Prompts the user to review their configuration before proceeding."
echo "  8. Starts the MongoDB service and waits until it's ready."
echo "  9. Recreates an idempotent systemd service unit for DocMan."
echo " 10. Enables and starts the DocMan service."
echo " 11. Publishes the Vue frontend and remote bundle to Apache."
echo " 12. Generates letsencrypt SSL/TLS certificates with certbot for HTTPS support."
echo " 13. Configures Apache virtual hosts for HTTP and HTTPS redirection."
echo " 13. Restarts Apache to apply changes."
echo " 14. Displays a success message upon completion."
echo ""

# --- Root check ---
if [[ $EUID -ne 0 ]]; then
    echo "⚠️ This script must be run as root."
    exit 1
fi

read -p "Continue with prerequisites check? (y/n): " use_deploy
if [[ ! "$use_deploy" =~ ^[Yy]$ ]]; then
    echo "⚠️ Deployment canceled."
    exit 0
fi
check_prerequisites

# --- 1️⃣ Clone repository ---
echo ""
echo "1️⃣ Cloning repository..."
detect_previous_env_source
backup_if_exists "$DEPLOY_ROOT"
mkdir -p "$DEPLOY_ROOT"
chown -R "$SERVICE_GROUP:$SERVICE_GROUP" "$DEPLOY_ROOT"
git clone https://github.com/resonance-designs/docman.git "$DEPLOY_ROOT"
echo "✅ Repository cloned."

# --- 2️⃣ Install dependencies & build ---
echo ""
echo "2️⃣ Installing dependencies & building app..."
cd "$DEPLOY_ROOT"
npm ci --prefix backend
npm ci --include=dev --prefix frontend-vue
npm run build --prefix frontend-vue
npm run build:remote --prefix frontend-vue
echo "✅ Vue frontend and remote bundle build complete."

# --- 3️⃣ Prepare environment ---
echo ""
echo "3️⃣ Configuring environment..."
cd "$BACKEND_DIR"
cp .env.sample .env.prod
sed -i '/^#/d;/^$/d' .env.prod
sed -i 's/^ACTIVE_ENV=.*/ACTIVE_ENV=1/' .env.prod
sed -i 's/^ENV=.*/ENV=Production/' .env.prod
sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env.prod

# --- 4️⃣ MongoDB TLS/SSL Setup ---
echo ""
echo "4️⃣ MongoDB Setup:"
echo "1) Private MongoDB server (localhost/own host)"
echo "2) MongoDB Atlas"
existing_mongo_reuse=false
if detect_existing_mongo_setup; then
    echo "✅ Existing /etc/mongod.conf detected."
    read -p "Reuse the existing local MongoDB server configuration instead of regenerating it? (Y/n): " reuse_mongo
    if [[ ! "$reuse_mongo" =~ ^[Nn]$ ]]; then
        mongo_choice="1"
        existing_mongo_reuse=true
    fi
fi

if [[ -z "${mongo_choice:-}" ]]; then
    read -p "Choose your MongoDB type [1/2]: " mongo_choice
fi

if [[ "$mongo_choice" == "1" ]]; then
    # --- Private MongoDB Configuration ---
    existing_mongo_port="27017"
    existing_mongo_tls="false"
    existing_mongo_ca_file="/etc/mongodb-ssl/ca/mongodb-ca.crt"
    existing_mongo_client_file="/etc/mongodb-ssl/client.pem"

    if [[ "$existing_mongo_reuse" == true ]]; then
        existing_mongo_port=$(read_existing_mongo_value '/^[[:space:]]+port:/')
        [[ -z "$existing_mongo_port" ]] && existing_mongo_port="27017"

        if grep -q 'mode: requireTLS' /etc/mongod.conf 2>/dev/null; then
            existing_mongo_tls="true"
        fi

        detected_ca_file=$(read_existing_mongo_value '/^[[:space:]]+CAFile:/')
        [[ -n "$detected_ca_file" ]] && existing_mongo_ca_file="$detected_ca_file"

        echo "🔍 Reusing existing MongoDB server config from /etc/mongod.conf"
        echo "   port: $existing_mongo_port"
        echo "   TLS enabled: $existing_mongo_tls"
    fi

    if [[ -n "$ENV_SOURCE_FILE" ]]; then
        echo "🔍 Found previous DocMan environment file at $ENV_SOURCE_FILE"
        echo "   Reusing its values as the default prompts for the new .env.prod"
    fi

    ask "MONGO_USER" "Enter MongoDB username" "$(env_default MONGO_USER "")"
    ask "MONGO_PASSWORD" "Enter MongoDB password" "$(env_default MONGO_PASSWORD "")"
    ask "MONGO_HOST" "Enter MongoDB host (IP/hostname)" "$(env_default MONGO_HOST "localhost")"
    ask "MONGO_PORT" "Enter MongoDB port" "$(env_default MONGO_PORT "$existing_mongo_port")"
    MONGO_PORT=$(grep "^MONGO_PORT=" .env.prod | cut -d= -f2-)
    ask "MONGO_DB" "Enter MongoDB database name" "$(env_default MONGO_DB "")"
    ask "MONGO_AUTH_SOURCE" "Enter MongoDB auth source (usually 'admin')" "$(env_default MONGO_AUTH_SOURCE "admin")"

    # Disable Atlas
    sed -i "s|^MONGO_ATLAS_USER=.*|MONGO_ATLAS_USER=null|" .env.prod
    sed -i "s|^MONGO_ATLAS_PASSWORD=.*|MONGO_ATLAS_PASSWORD=null|" .env.prod
    sed -i "s|^MONGO_ATLAS_HOST=.*|MONGO_ATLAS_HOST=null|" .env.prod
    sed -i "s|^MONGO_ATLAS_DB=.*|MONGO_ATLAS_DB=null|" .env.prod
    sed -i "s|^MONGO_ATLAS_APP=.*|MONGO_ATLAS_APP=null|" .env.prod

    if [[ "$existing_mongo_reuse" == true ]]; then
        if [[ "$existing_mongo_tls" == "true" ]]; then
            sed -i "s|^MONGO_TLS=.*|MONGO_TLS=true|" .env.prod
            ask "MONGO_CA_FILE" "Path to Mongo CA file" "$existing_mongo_ca_file"
            ask "MONGO_CERT_FILE" "Path to Mongo client PEM" "$existing_mongo_client_file"
            echo "✅ Reusing existing MongoDB TLS/SSL configuration."
        else
            sed -i "s|^MONGO_TLS=.*|MONGO_TLS=false|" .env.prod
            sed -i "s|^MONGO_CA_FILE=.*|MONGO_CA_FILE=null|" .env.prod
            sed -i "s|^MONGO_CERT_FILE=.*|MONGO_CERT_FILE=null|" .env.prod
            echo "✅ Reusing existing MongoDB configuration without TLS/SSL."
        fi
    else
        # --- Mongo TLS/SSL Setup ---
        echo ""
        echo "⚠️ TLS/SSL Warning:"
        echo "If you choose to enable TLS, the script will generate CA and Mongo certificates for secure connections."
        echo "Canceling at this step will remove the cloned repo."
        echo ""
        echo "1) Proceed with TLS"
        echo "2) Proceed without TLS"
        echo "3) Cancel deployment"
        read -p "Choose an option [1/2/3]: " tls_choice

        case $tls_choice in
        1)
            # --- Prompt for subject details ---
            read -p "CA Country (C) [US]: " CA_C; CA_C=${CA_C:-US}
            read -p "CA State (ST) [YourState]: " CA_ST; CA_ST=${CA_ST:-YourState}
            read -p "CA City (L) [YourCity]: " CA_L; CA_L=${CA_L:-YourCity}
            read -p "CA Organization (O) [MongoCA]: " CA_O; CA_O=${CA_O:-MongoCA}
            read -p "CA Organizational Unit (OU) [IT]: " CA_OU; CA_OU=${CA_OU:-IT}
            read -p "CA Common Name (CN) [docman-ca]: " CA_CN; CA_CN=${CA_CN:-docman-ca}

            read -p "Server Country (C) [US]: " SRV_C; SRV_C=${SRV_C:-US}
            read -p "Server State (ST) [YourState]: " SRV_ST; SRV_ST=${SRV_ST:-YourState}
            read -p "Server City (L) [YourCity]: " SRV_L; SRV_L=${SRV_L:-YourCity}
            read -p "Server Organization (O) [MongoServer]: " SRV_O; SRV_O=${SRV_O:-MongoServer}
            read -p "Server Organizational Unit (OU) [IT]: " SRV_OU; SRV_OU=${SRV_OU:-IT}
            read -p "Server Common Name (CN) [docman-server]: " SRV_CN; SRV_CN=${SRV_CN:-docman-server}

            read -p "Client Country (C) [US]: " CL_C; CL_C=${CL_C:-US}
            read -p "Client State (ST) [YourState]: " CL_ST; CL_ST=${CL_ST:-YourState}
            read -p "Client City (L) [YourCity]: " CL_L; CL_L=${CL_L:-YourCity}
            read -p "Client Organization (O) [MongoClient]: " CL_O; CL_O=${CL_O:-MongoClient}
            read -p "Client Organizational Unit (OU) [IT]: " CL_OU; CL_OU=${CL_OU:-IT}
            read -p "Client Common Name (CN) [docman-client]: " CL_CN; CL_CN=${CL_CN:-docman-client}

            # --- Prompt for SANs dynamically, always include localhost & 127.0.0.1 ---
            SERVER_SANS="DNS:localhost,IP:127.0.0.1"
            echo "Now configuring additional Subject Alternative Names (SANs) for the server certificate."
            while true; do
                read -p "Do you want to add another domain or IP? (y/n): " add_san
                if [[ "$add_san" =~ ^[Yy]$ ]]; then
                    read -p "Is it a domain or an IP? (domain/ip): " san_type
                    if [[ "$san_type" =~ ^[Dd]omain$ ]]; then
                        read -p "Enter domain (e.g. example.com): " san_value
                        SERVER_SANS="$SERVER_SANS,DNS:$san_value"
                    elif [[ "$san_type" =~ ^[Ii]p$ ]]; then
                        read -p "Enter IP (e.g. 192.168.1.1): " san_value
                        SERVER_SANS="$SERVER_SANS,IP:$san_value"
                    else
                        echo "Invalid type. Please enter 'domain' or 'ip'."
                        continue
                    fi
                else
                    break
                fi
            done

            echo "Configured SANs: $SERVER_SANS"

            # --- Mongo SSL Setup Script ---
            echo "🔹 Running MongoDB SSL setup..."
            TMPDIR=$(mktemp -d)
            cd "$TMPDIR"

            # Generate CA
            openssl genrsa -out mongodb-ca.key 4096
            openssl req -x509 -new -nodes -key mongodb-ca.key -sha256 -days 3650 \
            -out mongodb-ca.crt -subj "/C=$CA_C/ST=$CA_ST/L=$CA_L/O=$CA_O/OU=$CA_OU/CN=$CA_CN"

            # Generate Server key + CSR
            openssl genrsa -out server.key 4096
            openssl req -new -key server.key -out server.csr \
            -subj "/C=$SRV_C/ST=$SRV_ST/L=$SRV_L/O=$SRV_O/OU=$SRV_OU/CN=$SRV_CN"

            # SANs
            cat > server-ext.cnf <<EOF
subjectAltName = $SERVER_SANS
EOF

            # Sign server cert
            openssl x509 -req -in server.csr -CA mongodb-ca.crt -CAkey mongodb-ca.key -CAcreateserial \
            -out server.crt -days 365 -sha256 -extfile server-ext.cnf
            cat server.crt server.key > mongo.pem

            # Generate Client cert
            openssl genrsa -out client.key 4096
            openssl req -new -key client.key -out client.csr \
            -subj "/C=$CL_C/ST=$CL_ST/L=$CL_L/O=$CL_O/OU=$CL_OU/CN=$CL_CN"
            openssl x509 -req -in client.csr -CA mongodb-ca.crt -CAkey mongodb-ca.key -CAcreateserial \
            -out client.crt -days 365 -sha256
            cat client.crt client.key > client.pem

            # Move certs to proper location
            mkdir -p /etc/mongodb-ssl/ca
            mv mongo.pem /etc/mongodb-ssl/
            mv client.pem /etc/mongodb-ssl/
            mv mongodb-ca.crt /etc/mongodb-ssl/ca/
            mv mongodb-ca.key /etc/mongodb-ssl/ca/

            # Permissions
            chown mongodb:mongodb /etc/mongodb-ssl/mongo.pem /etc/mongodb-ssl/client.pem
            chmod 600 /etc/mongodb-ssl/mongo.pem /etc/mongodb-ssl/client.pem
            chown mongodb:mongodb /etc/mongodb-ssl/ca/mongodb-ca.crt
            chmod 644 /etc/mongodb-ssl/ca/mongodb-ca.crt
            chown mongodb:mongodb /etc/mongodb-ssl/ca/mongodb-ca.key
            chmod 600 /etc/mongodb-ssl/ca/mongodb-ca.key

            # Update .env.prod
            sed -i "s|^MONGO_TLS=.*|MONGO_TLS=true|" /var/www/docman/backend/.env.prod
            ask "MONGO_CA_FILE" "Path to Mongo CA file" "/etc/mongodb-ssl/ca/mongodb-ca.crt"
            ask "MONGO_CERT_FILE" "Path to Mongo client PEM" "/etc/mongodb-ssl/client.pem"

            # --- Convert SANs for MongoDB bindIp ---
            BIND_IPS=$(echo "$SERVER_SANS" | sed -E 's/DNS:|IP://g')

            # --- Write mongod.conf ---
            cat <<EOF >/etc/mongod.conf
# mongod.conf

# Where and how to store data
storage:
  dbPath: /var/lib/mongodb

# Logging
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: reopen

# Network interfaces
net:
  port: $MONGO_PORT
  bindIp: $BIND_IPS
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/mongodb-ssl/mongo.pem
    CAFile: /etc/mongodb-ssl/ca/mongodb-ca.crt
    allowConnectionsWithoutCertificates: false

# Process management
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# Security
security:
  authorization: enabled

# Optional performance/enterprise options can go below
# operationProfiling:
# replication:
# sharding:
# auditLog:
EOF

            echo "✅ Private MongoDB configuration completed with TLS/SSL enabled."
            ;;
        2)
            sed -i "s|^MONGO_TLS=.*|MONGO_TLS=false|" .env.prod
            sed -i "s|^MONGO_CA_FILE=.*|MONGO_CA_FILE=null|" .env.prod
            sed -i "s|^MONGO_CERT_FILE=.*|MONGO_CERT_FILE=null|" .env.prod

            # --- Write mongod.conf ---
            cat <<EOF >/etc/mongod.conf
# mongod.conf

# Where and how to store data
storage:
  dbPath: /var/lib/mongodb

# Logging
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: reopen

# Network interfaces
net:
  port: $MONGO_PORT
  bindIp: localhost,127.0.0.1

# Process management
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# Optional performance/enterprise options can go below
# operationProfiling:
# replication:
# sharding:
# auditLog:
EOF

            echo "✅ Private MongoDB configuration completed without TLS/SSL enabled."
            ;;
        3)
            rollback
            ;;
        *)
            echo "Invalid choice. Canceling deployment."
            rollback
            ;;
        esac
    fi

elif [[ "$mongo_choice" == "2" ]]; then
    # --- MongoDB Atlas Configuration ---
    ask "MONGO_ATLAS_USER" "Enter MongoDB Atlas username" ""
    ask "MONGO_ATLAS_PASSWORD" "Enter MongoDB Atlas password" ""
    ask "MONGO_ATLAS_HOST" "Enter MongoDB Atlas host" ""
    ask "MONGO_ATLAS_DB" "Enter MongoDB Atlas database" ""
    ask "MONGO_ATLAS_APP" "Enter MongoDB Atlas app name" ""

    # Disable private Mongo
    sed -i "s|^MONGO_USER=.*|MONGO_USER=null|" .env.prod
    sed -i "s|^MONGO_PASSWORD=.*|MONGO_PASSWORD=null|" .env.prod
    sed -i "s|^MONGO_HOST=.*|MONGO_HOST=null|" .env.prod
    sed -i "s|^MONGO_PORT=.*|MONGO_PORT=null|" .env.prod
    sed -i "s|^MONGO_DB=.*|MONGO_DB=null|" .env.prod
    sed -i "s|^MONGO_AUTH_SOURCE=.*|MONGO_AUTH_SOURCE=null|" .env.prod
    sed -i "s|^MONGO_TLS=.*|MONGO_TLS=false|" .env.prod
    sed -i "s|^MONGO_CA_FILE=.*|MONGO_CA_FILE=null|" .env.prod
    sed -i "s|^MONGO_CERT_FILE=.*|MONGO_CERT_FILE=null|" .env.prod
else
    echo "Invalid MongoDB choice." && rollback
fi

# --- 5️⃣ Configure remaining environment ---
echo ""
echo "5️⃣ Configuring Node.js port, Redis, JWT, and AWS SES..."
ask "NODE_PORT" "Enter Node.js port" "$(env_default NODE_PORT "5001")"
NODE_PORT=$(grep "^NODE_PORT=" .env.prod | cut -d= -f2-)

# Redis
read -p "Do you want to use Redis? (y/n): " use_redis
if [[ "$use_redis" =~ ^[Yy]$ ]]; then
    ask "UPSTASH_REDIS_REST_URL" "Enter Redis REST URL" "$(env_default UPSTASH_REDIS_REST_URL "")"
    ask "UPSTASH_REDIS_REST_TOKEN" "Enter Redis REST token" "$(env_default UPSTASH_REDIS_REST_TOKEN "")"
else
    sed -i "s|^UPSTASH_REDIS_REST_URL=.*|UPSTASH_REDIS_REST_URL=null|" .env.prod
    sed -i "s|^UPSTASH_REDIS_REST_TOKEN=.*|UPSTASH_REDIS_REST_TOKEN=null|" .env.prod
fi

# Authentication
ask "TOKEN_KEY" "Enter authentication token key (JWT secret)" "$(env_default TOKEN_KEY "")"

# AWS SES
read -p "Do you want to use AWS SES for email? (y/n): " use_ses
if [[ "$use_ses" =~ ^[Yy]$ ]]; then
    ask "AWS_ACCESS_KEY_ID" "Enter AWS Access Key ID" "$(env_default AWS_ACCESS_KEY_ID "")"
    ask "AWS_SECRET_ACCESS_KEY" "Enter AWS Secret Access Key" "$(env_default AWS_SECRET_ACCESS_KEY "")"
    ask "AWS_SES_REGION" "Enter AWS SES region (e.g. us-east-1)" "$(env_default AWS_SES_REGION "")"
    ask "AWS_SES_SENDER_EMAIL" "Enter AWS SES sender email" "$(env_default AWS_SES_SENDER_EMAIL "")"
else
    sed -i "s|^AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=null|" .env.prod
    sed -i "s|^AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=null|" .env.prod
    sed -i "s|^AWS_SES_REGION=.*|AWS_SES_REGION=null|" .env.prod
    sed -i "s|^AWS_SES_SENDER_EMAIL=.*|AWS_SES_SENDER_EMAIL=null|" .env.prod
fi

# --- 6️⃣ Review environment loop ---
critical_fields=("MONGO_USER" "MONGO_PASSWORD" "MONGO_DB" "TOKEN_KEY" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
while true; do
    echo ""
    echo "6️⃣ Summary of your .env.prod configuration:"
    echo ""
    while read -r line; do
        key=$(echo "$line" | cut -d= -f1)
        value=$(echo "$line" | cut -d= -f2-)
        if [[ "$key" =~ PASSWORD|SECRET|TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY ]]; then
            value=$(mask_sensitive "$value")
        fi
        echo "$key=$value"
    done < .env.prod
    echo ""
    read -p "Are these values correct? (y/n): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo ".env.prod file configured successfully."
        break
    else
        read -p "Enter the variable name you want to edit (e.g. MONGO_HOST): " var_to_edit
        if grep -q "^$var_to_edit=" .env.prod; then
            current_val=$(grep "^$var_to_edit=" .env.prod | cut -d= -f2-)
            while true; do
                read -p "Enter new value for $var_to_edit [current: $current_val]: " new_val
                if [[ " ${critical_fields[*]} " == *" $var_to_edit "* ]] && [[ -z "$new_val" ]]; then
                    echo "⚠️  $var_to_edit cannot be empty."
                else
                    break
                fi
            done
            [[ -n "$new_val" ]] && sed -i "s|^$var_to_edit=.*|$var_to_edit=$new_val|" .env.prod
        else
            echo "Variable $var_to_edit not found in .env.prod"
        fi
    fi
done
echo "✅ Backend environment file created successfully."

# --- 7️⃣ Check that MongoDB is running ---
if [[ "$mongo_choice" == "1" ]]; then
    echo ""
    echo "7️⃣ Waiting for MongoDB to start..."
    systemctl enable mongod
    systemctl start mongod
    until nc -z localhost $MONGO_PORT; do sleep 1; done;
    echo "✅ MongoDB started successfully."
fi

# --- 8️⃣ Create MongoDB Admin User ---
if [[ "$existing_mongo_reuse" == true ]]; then
    read -p "8️⃣ Existing MongoDB detected. Do you want to create another MongoDB admin user automatically anyway? (y/n): " create_admin
else
    read -p "8️⃣ Do you want to create a MongoDB admin user automatically? (y/n): " create_admin
fi
if [[ "$create_admin" =~ ^[Yy]$ ]]; then
    mongo <<EOF
use admin
db.createUser({
  user: "$(grep '^MONGO_USER=' .env.prod | cut -d= -f2-)",
  pwd: "$(grep '^MONGO_PASSWORD=' .env.prod | cut -d= -f2-)",
  roles: [ { role: "root", db: "admin" } ]
})
EOF
    echo "✅ MongoDB admin user created."
fi

# --- 9️⃣ Systemd Backend Service ---
echo ""
echo "9️⃣ Creating systemd service file at $SERVICE_FILE..."
ensure_service_user
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$BACKEND_DIR"
install -d -o "$SERVICE_GROUP" -g "$SERVICE_GROUP" -m 775 "$BACKEND_DIR/uploads"
write_backend_service
systemctl daemon-reload
systemctl enable docman-backend.service
systemctl start docman-backend.service
echo "✅ DocMan Backend service created and started successfully."

# --- 1️⃣0️⃣ Apache frontend and remote bundle ---
echo ""
echo "1️⃣0️⃣ Setting up Apache frontend with reverse proxy..."
read -p "Enter folder name for frontend publish root [docman]: " frontend_folder
frontend_folder=${frontend_folder:-docman}
backup_if_exists "$APACHE_ROOT/$frontend_folder"
# Create frontend directory structure
publish_frontend_assets "$frontend_folder"
# Enable Apache modules
a2enmod proxy proxy_http rewrite headers
# Create Apache config file
read -p "Enter Apache site name (conf file name) [docman]: " site_name
site_name=${site_name:-docman}
read -p "Enter domain name for ServerName (e.g. docman.resonancedesigns.dev): " domain_name

sudo tee /etc/apache2/sites-available/$site_name.conf >/dev/null <<EOF
<VirtualHost *:80>
    ServerName $domain_name
    DocumentRoot $APACHE_ROOT/$frontend_folder/public_html/

    <Directory $APACHE_ROOT/$frontend_folder/public_html/>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Reverse proxy API and uploads to Node backend
    ProxyPreserveHost On
    ProxyRequests Off

    # API
    ProxyPass /api http://localhost:$NODE_PORT/api
    ProxyPassReverse /api http://localhost:$NODE_PORT/api

    # Uploads (served by backend)
    ProxyPass /uploads http://localhost:$NODE_PORT/uploads
    ProxyPassReverse /uploads http://localhost:$NODE_PORT/uploads

    # SPA fallback for non-file routes (excluding /api and /uploads)
    <IfModule mod_rewrite.c>
        RewriteEngine On
        # Don't rewrite API requests
        RewriteCond %{REQUEST_URI} !^/api
        # Don't rewrite uploads
        RewriteCond %{REQUEST_URI} !^/uploads
        # Don't rewrite asset files
        RewriteCond %{REQUEST_URI} !^/assets/
        # Don't rewrite index.html itself
        RewriteCond %{REQUEST_URI} !index\.html$
        # Only rewrite if the file doesn't exist
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^ /index.html [L]
    </IfModule>

    ErrorLog /var/www/html/$frontend_folder/logs/error.log
    CustomLog /var/www/html/$frontend_folder/logs/access.log combined
</VirtualHost>
EOF

a2ensite $site_name
systemctl reload apache2
echo "✅ Apache frontend site configured successfully."

# --- 1️⃣1️⃣ Certbot SSL (Optional) ---
echo ""
echo "1️⃣1️⃣ Use certbot to configure SSL certificate..."
read -p "Do you wish to create an SSL certificate and use https on your domain? (y/n): " use_cert
if [[ "$use_cert" =~ ^[Yy]$ ]]; then
    missing_packages=()

    # Check for certbot
    dpkg -l certbot >/dev/null 2>&1 || missing_packages+=("certbot")
    dpkg -l python3-certbot-apache >/dev/null 2>&1 || missing_packages+=("python3-certbot-apache")

    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        echo "⚠️ The following required packages are missing: ${missing_packages[*]}"
        read -p "Do you want this script to install them for you? (y/n): " install_missing
        if [[ "$install_missing" =~ ^[Yy]$ ]]; then
            apt update && apt install -y "${missing_packages[@]}"
        else
            echo "⚠️ Skipping installation of missing packages. Cannot continue SSL setup."
            exit 1
        fi
    fi

    # Backup current :80 conf
    cp /etc/apache2/sites-available/$site_name.conf /etc/apache2/sites-available/$site_name.conf.bak

    # Run certbot
    read -p "Enter email address for SSL certificate registration (Let's Encrypt) [default: admin@$domain_name]: " certbot_email
    certbot_email=${certbot_email:-admin@$domain_name}

    certbot --apache -d "$domain_name" --non-interactive --agree-tos -m "$certbot_email"

    # --- Move Node proxy to :443 safely ---
    SSL_CONF="/etc/apache2/sites-available/$site_name-le-ssl.conf"
    if [[ -f "$SSL_CONF" ]]; then
        # Extract proxy + SPA section from :80 backup
        PROXY_BLOCK=$(awk '/# Reverse proxy API/,/<\/IfModule>/{print}' /etc/apache2/sites-available/$site_name.conf.bak)

        # Ensure HTTPS header is set
        if ! echo "$PROXY_BLOCK" | grep -q 'RequestHeader set X-Forwarded-Proto'; then
            PROXY_BLOCK="    RequestHeader set X-Forwarded-Proto \"https\"\n$PROXY_BLOCK"
        else
            PROXY_BLOCK=$(echo "$PROXY_BLOCK" | sed 's|RequestHeader set X-Forwarded-Proto .*|RequestHeader set X-Forwarded-Proto "https"|')
        fi

        # Insert proxy block before </VirtualHost> in :443 conf safely
        awk -v block="$PROXY_BLOCK" '
            /<\/VirtualHost>/ {
                print block
            }
            { print }
        ' "$SSL_CONF" > "${SSL_CONF}.tmp" && mv "${SSL_CONF}.tmp" "$SSL_CONF"

        systemctl reload apache2
        echo "✅ SSL proxy configuration updated successfully."
    else
        echo "⚠️ Could not find SSL conf $SSL_CONF. Skipping proxy migration."
    fi

    systemctl reload apache2
    echo "✅ Apache reloaded with SSL support."
else
    echo "⚠️ Skipping SSL setup."
fi

echo ""
echo "Deployment complete! You can now optionally configure Certbot SSL."
