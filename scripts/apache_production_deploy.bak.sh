#!/bin/bash
set -e

# --- Root check ---
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root."
    exit 1
fi

# Function to rollback changes
rollback() {
    echo "Rolling back deployment..."
    rm -rf /var/www/docman
    echo "Deployment has been successfully reversed."
    exit 0
}

# Function to prompt for input
ask() {
    local var_name=$1
    local prompt=$2
    local default=$3
    local value
    read -p "$prompt [$default]: " value
    value=${value:-$default}
    sed -i "s|^$var_name=.*|$var_name=$value|" .env.prod
}

# Function to mask sensitive values in summary
mask_sensitive() {
    local var_value="$1"
    if [[ -z "$var_value" ]]; then
        echo "null"
    else
        echo "${var_value:0:3}***"
    fi
}

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

echo ""
echo "1. Cloning repository..."

rm -rf /var/www/docman # Remove existing directory if it exists
mkdir -p /var/www/docman
chown -R www-data:www-data /var/www/docman
git clone https://github.com/resonance-designs/docman.git /var/www/docman

echo ""
echo "2. Installing dependencies and building application..."
# Move to root directory and build app
cd /var/www/docman
npm run build

echo ""
echo "3. Configuring environment variables..."
# Copy and prepare environment file
cd /var/www/docman/backend
cp .env.sample .env.prod

# Strip comments (lines starting with #) and empty lines
sed -i '/^#/d;/^$/d' .env.prod

# Set defaults
sed -i 's/^ACTIVE_ENV=.*/ACTIVE_ENV=1/' .env.prod
sed -i 's/^ENV=.*/ENV=Production/' .env.prod
sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env.prod

configure_env() {
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

        # TLS/SSL only for private Mongo
        echo ""
        echo "⚠️  TLS/SSL Warning:"
        echo "If you choose to enable TLS, you will need your Certificate Authority (CA) and Certificate files ready."
        echo "Refer to the DocMan documentation on how to generate and store these files."
        echo "Canceling at this step will remove the cloned repo."
        echo ""
        echo "1) Proceed with TLS"
        echo "2) Proceed without TLS"
        echo "3) Cancel deployment"
        read -p "Choose an option [1/2/3]: " tls_choice

        case $tls_choice in
            1)
                sed -i "s|^MONGO_TLS=.*|MONGO_TLS=true|" .env.prod
                ask "MONGO_CA_FILE" "Path to Mongo CA file" ""
                ask "MONGO_CERT_FILE" "Path to Mongo cert file" ""
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

        # TLS not asked for Atlas
        sed -i "s|^MONGO_TLS=.*|MONGO_TLS=false|" .env.prod
        sed -i "s|^MONGO_CA_FILE=.*|MONGO_CA_FILE=null|" .env.prod
        sed -i "s|^MONGO_CERT_FILE=.*|MONGO_CERT_FILE=null|" .env.prod
    else
        echo "Invalid choice. Please restart and choose 1 or 2."
        rollback
    fi

    # --- Node.js ---
    ask "NODE_PORT" "Enter Node.js port" "3000"

    # --- Redis ---
    read -p "Do you want to use Redis? (y/n): " use_redis
    if [[ "$use_redis" =~ ^[Yy]$ ]]; then
        ask "UPSTASH_REDIS_REST_URL" "Enter Redis REST URL" ""
        ask "UPSTASH_REDIS_REST_TOKEN" "Enter Redis REST token" ""
    else
        sed -i "s|^UPSTASH_REDIS_REST_URL=.*|UPSTASH_REDIS_REST_URL=null|" .env.prod
        sed -i "s|^UPSTASH_REDIS_REST_TOKEN=.*|UPSTASH_REDIS_REST_TOKEN=null|" .env.prod
    fi

    # --- Authentication ---
    ask "TOKEN_KEY" "Enter authentication token key (JWT secret)" ""

    # --- AWS SES ---
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
}

configure_env

# --- Review loop ---
# List of critical fields that must not be empty
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
    echo "=========================================="
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
                # Check if critical field is left empty
                if [[ " ${critical_fields[*]} " == *" $var_to_edit "* ]] && [[ -z "$new_val" ]]; then
                    echo "⚠️  $var_to_edit cannot be empty. Please enter a value."
                else
                    break
                fi
            done
            if [[ -n "$new_val" ]]; then
                sed -i "s|^$var_to_edit=.*|$var_to_edit=$new_val|" .env.prod
            fi
        else
            echo "Variable $var_to_edit not found in .env.prod"
        fi
    fi
done

echo ""
echo "Environment configuration complete."
echo ""
echo "4. Creating system service for Backend/API..."

SERVICE_FILE=/etc/systemd/system/docman-backend.service

echo ""
echo "Generating systemd service file at $SERVICE_FILE..."

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
# Pre-create uploads with correct ownership/permissions
ExecStartPre=/usr/bin/install -d -o www-data -g www-data -m 775 /var/www/docman/backend/uploads

# Optional hardening
NoNewPrivileges=true
AmbientCapabilities=
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/www/docman/backend

[Install]
WantedBy=multi-user.target
EOL

echo "Reloading systemd daemon and enabling service..."
systemctl daemon-reload
systemctl enable docman-backend.service
systemctl start docman-backend.service

echo ""
echo "✅ DocMan Backend service created and started successfully."
echo "You can check status with: systemctl status docman-backend.service"

echo ""
echo "5. Setting up Apache frontend with reverse proxy"

mkdir -p /var/www/html/<prompt user for folder/domain name>/public_html
mkdir -p /var/www/html/<use the value from the prvious prompt>/logs
rsync -a --delete /var/www/docman/frontend/dist/ /var/www/html/<use the value from the prvious prompt>/public_html/
chown -R www-data:www-data /var/www/html/<use the value from the prvious prompt>/public_html

sudo tee /etc/apache2/sites-available/<prompt user for a site name>.conf >/dev/null << 'EOF'
<VirtualHost *:80>
    ServerName <prompt user for a domain>
    DocumentRoot /var/www/html/<use the value from earlier about the folder/domain name>/public_html/

    <Directory /var/www/html/<use the value from earlier about the folder/domain name>/public_html/>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

a2ensite <use the prompt about the site name>
systemctl reload apache2