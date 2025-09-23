#!/bin/bash
set -e

# ====================================================
# === DocMan Production Deployment Script (Full) ===
# ====================================================

# --- Root check ---
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root."
    exit 1
fi

# --- Functions ---
rollback() {
    echo "Rolling back deployment..."
    rm -rf /var/www/docman
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

mask_sensitive() {
    local var_value="$1"
    [[ -z "$var_value" ]] && echo "null" || echo "${var_value:0:3}***"
}

# --- Deployment Start ---
echo "===================================================="
echo "=== Deploying DocMan to Apache Production Server ==="
echo "===================================================="
echo ""
echo "This deployment script has the following prerequisites:"
echo "- Node.js 18+ and npm installed on your local machine."
echo "- MongoDB (if not using Atlas) installed on the server, or a MongoDB Atlas connection string."
echo "- Apache web server installed on the server."
echo "- Certbot installed on the server."
echo "- Open firewall for ports 80/443 (public) and keep Node on localhost (no public port needed)."
echo ""

read -p "Do you have these prerequisites and wish to continue with the deployment? (y/n): " use_deploy
if [[ ! "$use_deploy" =~ ^[Yy]$ ]]; then
    echo "Deployment canceled."
    exit 0
fi

# --- 1️⃣ Clone repository ---
echo ""
echo "1. Cloning repository..."
rm -rf /var/www/docman
mkdir -p /var/www/docman
chown -R www-data:www-data /var/www/docman
git clone https://github.com/resonance-designs/docman.git /var/www/docman

# --- 2️⃣ Install dependencies and build ---
echo ""
echo "2. Installing dependencies and building application..."
cd /var/www/docman
npm run build

# --- 3️⃣ Copy environment template ---
echo ""
echo "3. Preparing environment configuration..."
cd backend
cp .env.sample .env.prod
sed -i '/^#/d;/^$/d' .env.prod
sed -i 's/^ACTIVE_ENV=.*/ACTIVE_ENV=1/' .env.prod
sed -i 's/^ENV=.*/ENV=Production/' .env.prod
sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env.prod

# --- 4️⃣ MongoDB TLS/SSL Setup ---
echo ""
echo "MongoDB Setup:"
echo "1) Private MongoDB server (localhost/own host)"
echo "2) MongoDB Atlas"
read -p "Choose your MongoDB type [1/2]: " mongo_choice

if [[ "$mongo_choice" == "1" ]]; then
    # --- Private MongoDB Configuration ---
    ask "MONGO_USER" "Enter MongoDB username" ""
    ask "MONGO_PASSWORD" "Enter MongoDB password" ""
    ask "MONGO_HOST" "Enter MongoDB host (IP/hostname)" "localhost"
    ask "MONGO_PORT" "Enter MongoDB port" "27017"
    ask "MONGO_DB" "Enter MongoDB database name" ""
    ask "MONGO_AUTH_SOURCE" "Enter MongoDB auth source (usually 'admin')" "admin"

    # Disable Atlas
    sed -i "s|^MONGO_ATLAS_USER=.*|MONGO_ATLAS_USER=null|" .env.prod
    sed -i "s|^MONGO_ATLAS_PASSWORD=.*|MONGO_ATLAS_PASSWORD=null|" .env.prod
    sed -i "s|^MONGO_ATLAS_HOST=.*|MONGO_ATLAS_HOST=null|" .env.prod
    sed -i "s|^MONGO_ATLAS_DB=.*|MONGO_ATLAS_DB=null|" .env.prod
    sed -i "s|^MONGO_ATLAS_APP=.*|MONGO_ATLAS_APP=null|" .env.prod

    # TLS/SSL Decision
    echo ""
    echo "⚠️  TLS/SSL Warning:"
    echo "If you choose to enable TLS, the script will generate CA and Mongo certificates for secure connections."
    echo "Canceling at this step will remove the cloned repo."
    echo ""
    echo "1) Proceed with TLS"
    echo "2) Proceed without TLS"
    echo "3) Cancel deployment"
    read -p "Choose an option [1/2/3]: " tls_choice

    case $tls_choice in
        1)
            # --- Mongo SSL Setup Script ---
            echo "🔹 Running MongoDB SSL setup..."
            TMPDIR=$(mktemp -d)
            cd "$TMPDIR"

            # Generate CA
            openssl genrsa -out mongodb-ca.key 4096
            openssl req -x509 -new -nodes -key mongodb-ca.key -sha256 -days 3650 \
              -out mongodb-ca.crt -subj "/C=US/ST=YourState/L=YourCity/O=MongoCA/OU=IT/CN=docman-ca"

            # Generate Server key + CSR
            openssl genrsa -out server.key 4096
            openssl req -new -key server.key -out server.csr \
              -subj "/C=US/ST=YourState/L=YourCity/O=MongoServer/OU=IT/CN=docman-server"

            # SANs
            cat > server-ext.cnf <<EOF
subjectAltName = DNS:localhost,DNS:docman-server,DNS:docman.resonancedesigns.dev,IP:127.0.0.1
EOF

            # Sign server cert
            openssl x509 -req -in server.csr -CA mongodb-ca.crt -CAkey mongodb-ca.key -CAcreateserial \
              -out server.crt -days 365 -sha256 -extfile server-ext.cnf
            cat server.crt server.key > mongo.pem

            # Client cert
            openssl genrsa -out client.key 4096
            openssl req -new -key client.key -out client.csr \
              -subj "/C=US/ST=YourState/L=YourCity/O=MongoClient/OU=IT/CN=docman-client"
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
            ;;
        2)
            sed -i "s|^MONGO_TLS=.*|MONGO_TLS=false|" .env.prod
            sed -i "s|^MONGO_CA_FILE=.*|MONGO_CA_FILE=null|" .env.prod
            sed -i "s|^MONGO_CERT_FILE=.*|MONGO_CERT_FILE=null|" .env.prod
            ;;
        3)
            rollback
            ;;
        *)
            echo "Invalid choice. Canceling deployment."
            rollback
            ;;
    esac

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
echo "Configuring Node.js port, Redis, JWT, and AWS SES..."
ask "NODE_PORT" "Enter Node.js port" "3000"

# Redis
read -p "Do you want to use Redis? (y/n): " use_redis
if [[ "$use_redis" =~ ^[Yy]$ ]]; then
    ask "UPSTASH_REDIS_REST_URL" "Enter Redis REST URL" ""
    ask "UPSTASH_REDIS_REST_TOKEN" "Enter Redis REST token" ""
else
    sed -i "s|^UPSTASH_REDIS_REST_URL=.*|UPSTASH_REDIS_REST_URL=null|" .env.prod
    sed -i "s|^UPSTASH_REDIS_REST_TOKEN=.*|UPSTASH_REDIS_REST_TOKEN=null|" .env.prod
fi

# Authentication
ask "TOKEN_KEY" "Enter authentication token key (JWT secret)" ""

# AWS SES
read -p "Do you want to use AWS SES for email? (y/n): " use_ses
if [[ "$use_ses" =~ ^[Yy]$ ]]; then
    ask "AWS_ACCESS_KEY_ID" "Enter AWS Access Key ID" ""
    ask "AWS_SECRET_ACCESS_KEY" "Enter AWS Secret Access Key" ""
    ask "AWS_SES_REGION" "Enter AWS SES region (e.g. us-east-1)" ""
    ask "AWS_SES_SENDER_EMAIL" "Enter AWS SES sender email" ""
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
    echo "### Summary of your .env.prod configuration:"
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

# --- 7️⃣ Systemd Backend Service ---
SERVICE_FILE=/etc/systemd/system/docman-backend.service
echo ""
echo "Creating systemd service file at $SERVICE_FILE..."
cat <<EOL > "$SERVICE_FILE"
[Unit]
Description=DocMan Backend
After=network.target

[Service]
WorkingDirectory=/var/www/docman/backend
Environment=NODE_ENV=production
Environment=ATLAS=no
EnvironmentFile=/var/www/docman/backend/.env.prod
ExecStart=/usr/bin/npm run prod
User=root
Group=www-data
Restart=always
RestartSec=3
ExecStartPre=/usr/bin/install -d -o www-data -g www-data -m 775 /var/www/docman/backend/uploads
NoNewPrivileges=true
AmbientCapabilities=
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/www/docman/backend

[Install]
WantedBy=multi-user.target
EOL

systemctl daemon-reload
systemctl enable docman-backend.service
systemctl start docman-backend.service
echo "✅ DocMan Backend service created and started successfully."

# --- 8️⃣ Apache frontend (Certbot SSL to be added later) ---
echo ""
echo "5. Setting up Apache frontend with reverse proxy..."
read -p "Enter folder/domain name for frontend: " frontend_folder
mkdir -p /var/www/html/$frontend_folder/public_html
mkdir -p /var/www/html/$frontend_folder/logs
rsync -a --delete /var/www/docman/frontend/dist/ /var/www/html/$frontend_folder/public_html/
chown -R www-data:www-data /var/www/html/$frontend_folder/public_html

read -p "Enter Apache site name (conf file name, e.g. docman): " site_name
read -p "Enter domain name for ServerName (e.g. docman.resonancedesigns.dev): " domain_name

sudo tee /etc/apache2/sites-available/$site_name.conf >/dev/null <<EOF
<VirtualHost *:80>
    ServerName $domain_name
    DocumentRoot /var/www/html/$frontend_folder/public_html/

    <Directory /var/www/html/$frontend_folder/public_html/>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

a2ensite $site_name
systemctl reload apache2
echo "✅ Apache frontend site configured successfully."

echo ""
echo "Deployment complete! You can now optionally configure Certbot SSL."
