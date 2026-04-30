# Manual Install / Update

Use this guide when you need to manually update the live `RDocMan` deployment on the server without relying on the deployment/update scripts.

This is the conservative recovery path:

- restore the repo clone
- preserve the working server env
- manually deploy the latest code into `/var/www/docman`
- rebuild the frontend
- restart the backend
- verify the app

## 1. Recreate the repo clone

```bash
cd ~
mkdir -p ~/git
git clone https://github.com/resonance-designs/docman.git ~/git/docman
```

If you need your patched script copies later:

```bash
cp ~/scripts/docman/apache_production_deploy.sh ~/git/docman/scripts/ 2>/dev/null || true
cp ~/scripts/docman/apache_production_update.sh ~/git/docman/scripts/ 2>/dev/null || true
cp ~/scripts/docman/apache_production_update_ni.sh ~/git/docman/scripts/ 2>/dev/null || true
chmod +x ~/git/docman/scripts/apache_production_*.sh 2>/dev/null || true
```

## 2. Back up the currently working deployed env files

```bash
mkdir -p ~/docman/manual-recovery
cp /var/www/docman/backend/.env.prod ~/docman/manual-recovery/backend.env.prod
cp /var/www/docman/frontend-vue/.env.production ~/docman/manual-recovery/frontend.env.production 2>/dev/null || true
```

## 3. Replace deployed code with latest repo code

This keeps your good env files separate first.

```bash
sudo systemctl stop docman-backend.service

sudo rm -rf /var/www/docman
sudo mkdir -p /var/www/docman
sudo rsync -a --exclude '.git' --exclude 'node_modules' --exclude 'dist' --exclude 'dist-remote' ~/git/docman/ /var/www/docman/
```

## 4. Put the working env files back

```bash
sudo cp ~/docman/manual-recovery/backend.env.prod /var/www/docman/backend/.env.prod
sudo cp ~/docman/manual-recovery/frontend.env.production /var/www/docman/frontend-vue/.env.production 2>/dev/null || true
```

If that frontend file was not copied, regenerate it from backend env:

```bash
grep '^VITE_' /var/www/docman/backend/.env.prod | sudo tee /var/www/docman/frontend-vue/.env.production >/dev/null
```

## 5. Install dependencies

```bash
cd /var/www/docman
sudo npm ci --prefix backend
sudo npm ci --include=dev --prefix frontend-vue
```

## 6. Build frontend and remote bundle

```bash
cd /var/www/docman
sudo npm run build:vue
sudo npm run build:remote --prefix frontend-vue
```

## 7. Publish frontend assets

```bash
sudo mkdir -p /var/www/html/docman/public_html
sudo mkdir -p /var/www/html/docman/public_html/remote
sudo mkdir -p /var/www/html/docman/logs

sudo rsync -a --delete /var/www/docman/frontend-vue/dist/ /var/www/html/docman/public_html/
sudo rsync -a --delete /var/www/docman/frontend-vue/dist-remote/remote/ /var/www/html/docman/public_html/remote/
sudo chown -R www-data:www-data /var/www/html/docman
```

## 8. Fix backend permissions

```bash
sudo install -d -o docman -g www-data -m 775 /var/www/docman/backend/uploads
sudo chown -R docman:www-data /var/www/docman/backend
```

## 9. Start backend

```bash
sudo systemctl daemon-reload
sudo systemctl reset-failed docman-backend.service
sudo systemctl start docman-backend.service
```

## 10. Verify

```bash
sudo systemctl status docman-backend.service --no-pager
sudo journalctl -u docman-backend.service -n 100 --no-pager
sudo apachectl configtest
curl -I http://127.0.0.1:5001/
curl -I http://127.0.0.1:5001/api-docs/
curl -I https://docman.resonancedesigns.dev
curl -I https://api.docman.resonancedesigns.dev/api-docs/
```

## 11. Test login

Open:

- `https://docman.resonancedesigns.dev/login`

You should see:

- local login
- `Sign in with Resonance Account`

## 12. Authentik migration checks

If the infrastructure is healthy but Authentik sign-in still fails with `401`, walk these checks before assuming the provider config is broken:

- confirm the Authentik user already exists
- confirm the Authentik token includes a verified email if you expect automatic linking or provisioning
- confirm the local user is linked to the real Authentik `sub`, or confirm the email match is correct for auto-linking
- confirm `frontend-vue/.env.production` and `backend/.env.prod` still contain the same Authentik client ID

Current behavior:

- `RDocMan` now auto-links existing local users by verified Authentik email
- `RDocMan` now just-in-time provisions new local viewer accounts for verified Authentik identities with no local user yet
- manual `authentikSub` linking is still used for repair work and exceptions
- Authentik should be treated as the canonical suite account-registration authority
- set `LOCAL_SELF_REGISTRATION_ENABLED=false` in production if you want to disable legacy local self-registration

Manual `sub` retrieval is still useful when:

- an email is not verified
- the wrong `authentikSub` was saved earlier
- you want to pre-link a user before first Authentik sign-in

How to get the real `sub` today:

1. click `Sign in with Resonance Account`
2. preserve the browser network log across the redirect
3. inspect the Authentik token response
4. decode the JWT payload from `access_token` or `id_token`
5. copy the `sub` claim exactly

Do not use:

- Authentik username
- email address
- display name

If a bad `authentikSub` was already saved, the current admin UI may stop showing that user in the unlinked list. In that case, correct the record directly in MongoDB or Compass before retrying Authentik login.
