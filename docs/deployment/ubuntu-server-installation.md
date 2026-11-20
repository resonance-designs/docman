# DocMan: complete Ubuntu server installation and operations guide

**For:** a new, dedicated Ubuntu Server LTS machine. These instructions target **Ubuntu 26.04 LTS**, matching the NMDOH server.  
**Application:** DocMan 3.0.0, Vue interface, native Linux services.
**Guide checked against the repository:** November 17, 2026.

**Documentation standard:** This must remain a complete, beginner-followable, end-to-end walkthrough for the **latest stable Ubuntu Server LTS**, currently **26.04 LTS**. Every prerequisite must include installation and configuration instructions. Maintain one concrete sequence, with exact commands, file contents, expected results, and troubleshooting; do not add alternative walkthroughs for older LTS releases. When the latest LTS changes, verify official release information and dependency compatibility, then update and validate this guide. Document any compatibility blocker explicitly rather than claiming support without verification. Keep instructions given during guided installations reflected here, with completed and pending checks distinguished.

This guide starts with obtaining a server and ends with a working HTTPS website, user accounts, document upload/download/replacement, automatic startup, email, backups, recovery, and updates. You do not need Docker, a project workspace, or an invitation system to share documents. Users need accounts and access to the documents they use.

**Interactive installation:** [`install.sh` and its walkthrough](automated-installation.md) automate fresh-server package/configuration setup with prompts, protected credentials, HTTPS and optional backups. Read its validation status and prerequisites first. Choose either that fresh-install sequence or this manual sequence; do not partially configure databases manually and then run the fresh installer. Existing servers use section 19. Installer backup artifact paths differ from the manual backup below; use the installer walkthrough's recovery instructions for those snapshots.

The main installation uses local DocMan accounts. An external identity provider is **not a prerequisite**. Outgoing email can use an organization SMTP relay, authenticated SMTP, or AWS SES, configured by a superadmin (section 16). Email is needed for password-reset delivery, but not to sign in or transfer files. A second server is used in the off-server backup instructions.

**Read this first:** These are fresh-install instructions, not commands to paste over an existing production server. If DocMan already contains documents, start with [existing installations and updates](#19-existing-installations-and-updates). Never delete its application directory before locating and backing up its uploaded files.

### Installation target

This guide follows one installation sequence: **Ubuntu 26.04 LTS (`resolute`), Node.js 22 and npm from Ubuntu, MongoDB Community 9.0, and Redis from Ubuntu**. Run `cat /etc/os-release` to confirm the server version before beginning.

MongoDB supports Ubuntu 26.04 starting with 9.0.4. These instructions use its `resolute` repository and `server-9.asc` signing key. See the [MongoDB platform matrix](https://www.mongodb.com/docs/community-platform-support/). Package candidates can change; recorded version outputs below describe the actual installation rather than pinning every future apt installation to those patch versions.

**For an existing NOC-provisioned, internal-only development server:** use the existing access route, such as NinjaOne to an NMDOH workstation and then a terminal on the server. Skip OS provisioning and changes to NOC-managed SSH/network settings. Start with [the internal POC sequence](#44-internal-poc-installation-sequence). Install dependencies and establish local application startup first. Public DNS, DMZ placement, and public certificate issuance are not prerequisites for those installation steps. Internal HTTPS is a later stage of making the application available to demonstration users.

**Verification boundary:** NMDOH user output confirms Ubuntu 26.04.1, Node 22.22.1/npm 9.2.0, MongoDB 9.0.8 and Redis 8.0.5 with successful authentication/denial checks, checkout e9df951, application accounts/category, migration and valid audit chain, frontend build/publication, and backend startup with local Redis and HTTP 401 from the unauthenticated API. The user reports the application URLs now use the existing internal DNS name `docman-dev.doh.nm.gov`. Apache 2.4.66 and the required proxy/headers/rewrite/SSL modules are now confirmed; restart returned without error. The DocMan site is active with a NOC-approved self-signed certificate; server-side HTTPS checks returned 200 for the website and 401 for the unauthenticated API. The user confirms browser login as RBakos after the workstation certificate-transfer/trust instructions. Document workflow tests remain pending. Clock synchronization and active NTP are confirmed. Base-tool completeness, firewall restrictions, certificate issuance/trust, Apache configuration, workstation/browser workflows, email, and backup recovery still require verification. Reported npm vulnerabilities remain unresolved. This is not a completed or security-approved deployment. Earlier isolated workflow tests do not replace acceptance testing on this server. Recent local documentation edits may not yet be present in its checkout.


## Contents

1. [How to use this guide](#1-how-to-use-this-guide)
2. [What you need and what each part does](#2-what-you-need-and-what-each-part-does)
3. [Create or install the Ubuntu server](#3-create-or-install-the-ubuntu-server)
4. [Connect securely and prepare Ubuntu](#4-connect-securely-and-prepare-ubuntu)
5. [Set up the address and firewall](#5-set-up-the-address-and-firewall)
6. [Install Node.js](#6-install-nodejs)
7. [Install and secure MongoDB](#7-install-and-secure-mongodb)
8. [Install and secure Redis](#8-install-and-secure-redis)
9. [Download DocMan and create its directories](#9-download-docman-and-create-its-directories)
10. [Configure the application](#10-configure-the-application)
11. [Create accounts and initialize the database](#11-create-accounts-and-initialize-the-database)
12. [Build the website](#12-build-the-website)
13. [Configure automatic application startup](#13-configure-automatic-application-startup)
14. [Configure Apache and HTTPS](#14-configure-apache-and-https)
15. [Check the complete document workflow](#15-check-the-complete-document-workflow)
16. [Configure outgoing email in System settings](#16-configure-outgoing-email-in-system-settings)
17. [Set up backups and scheduled checks](#17-set-up-backups-and-scheduled-checks)
18. [Restore and test a backup](#18-restore-and-test-a-backup)
19. [Existing installations and updates](#19-existing-installations-and-updates)
20. [Optional organization sign-in](#20-optional-organization-sign-in)
21. [Troubleshooting](#21-troubleshooting)
22. [Daily operation and handover checklist](#22-daily-operation-and-handover-checklist)

## 1. How to use this guide

For a server you install yourself, work through the sections in order. For the already provisioned NMDOH server, follow section 4.4's numbered sequence. Read the explanation immediately after a command block **before** running it. Run commands one line at a time unless they form a continued command or a complete script. Check each result before continuing; pasting a whole block does not automatically stop later commands if an earlier command fails.

Commands in `bash` blocks run in your **Ubuntu server's terminal**, unless a paragraph explicitly says otherwise. `powershell` blocks run on your **Windows computer**. `javascript` blocks in the MongoDB section run inside **mongosh**, the database's own prompt. Configuration blocks are file contents; do not paste those at a shell prompt. A script introduced with “paste into this file” is also file content, even if its block is marked `bash`.

### Recognize where you are

| What the prompt looks like (examples only) | Where you are | What to enter there |
| --- | --- | --- |
| `PS C:\Users\you>` | Windows PowerShell | Only commands labeled for Windows |
| `rbakos@dohr2simdocmdev:~$` | Ubuntu terminal as your personal account | The guide's normal server commands |
| `root@recovery:~#` | Ubuntu terminal as root | Only the restore steps explicitly requiring a root shell; type `exit` to return to your normal account |
| `test>` / `admin>` / `docman>` | MongoDB shell | The MongoDB commands in section 7; type `exit` to return to Ubuntu |
| `sftp>` | Backup file-transfer session | Type `bye` to return to Ubuntu |
| A full-screen editor with shortcuts along the bottom | nano | Paste/edit the named file, save, and exit before running more commands |

Do not type the prompt itself. For example, type `systemctl is-active mongod`, not `rbakos@dohr2simdocmdev:~$ systemctl is-active mongod`. If Bash displays only `>` after you paste, it is waiting for a closing quote or the rest of a multiline command. Finish the block, or press Ctrl+C and paste it again from the beginning.

- A **terminal** is a window where you type commands.
- **SSH** lets your computer open a secure terminal on the server.
- `sudo` runs one command as the server administrator. It may ask for your Ubuntu login password. Password characters do not appear while you type.
- `cd` changes directory. `pwd` shows your current directory.
- A **service** runs in the background. `systemctl` starts, stops, and checks services.
- **DNS** connects a name such as `docs.example.org` to a server's IP address.
- **HTTPS/TLS** encrypts browser traffic and identifies your website using a certificate.
- An **environment file** contains application settings. The backend file also contains passwords.
- A **migration** updates existing database records and indexes to match this application version.
- **localhost**, **loopback**, and `127.0.0.1` mean “this same computer.” A localhost URL typed on your workstation goes to your workstation, not the Ubuntu server.
- A **port** is a numbered connection point: SSH uses 22, HTTPS uses 443, and this backend uses 5001.
- A **repository** is the application's source-code collection. A **commit hash** identifies one exact saved version of that code. A **clone** downloads a working copy.
- A **build** turns the frontend's source code into the browser files Apache serves.
- A **certificate authority (CA)** signs website certificates. **PKI** is the organization's system/team managing those certificates. A **CSR** is a certificate request, not a private key.

Examples use `docs.example.org`, `203.0.113.10`, and uppercase `CHANGE_ME_...` values. These are examples, not working credentials or addresses. Replace them with your own values wherever they appear. Do not replace the fixed Linux account name `docman` or the fixed database name `docman`; keeping those names makes the commands consistent.

To edit a file, use `sudo nano /path/to/file`. Paste the provided contents, replace the example values, press **Ctrl+O**, press **Enter**, and press **Ctrl+X**. In nano, `^` means Ctrl. When viewing a long status page or `less`, press **Q** to leave it. **Ctrl+C** stops a running foreground command.

If nano says `[ New File ]`, that is expected when creating a file. If it reports “No such file or directory” **while saving**, the parent directory is missing: return to the preceding directory-creation step. “Permission denied” means the file needs the documented `sudo` editor command or its ownership is wrong. After saving, reopen the same file to confirm the text is there. Keep secret files private when doing this. To replace existing file contents, use Ctrl+K repeatedly to cut the existing lines, then paste the supplied replacement; do not append a second whole configuration underneath the first.

Lines ending in `\` continue onto the next line; the backslash must be the last character on that line. Copy the complete continued command. A block containing `<<'JS'` or `<<'EOF'` feeds the following lines to a program and ends at the matching `JS` or `EOF` line. Copy the whole block, including that closing line, with the closing marker at the start of its line. Do not copy the Markdown backticks around a block. Commands are for Bash on Ubuntu, not PowerShell.

### Decide whether a command worked

Many commands (`mkdir`, `chmod`, `chown`, `cp`, `ln`, and service reloads) normally print **nothing** when successful. Silence is only the expected result where stated; follow the check supplied with that step. For a command that has just finished, you can immediately run:

```bash
echo $?
```

`0` means that command reported success; another number means it did not. Run this immediately: after another command, it checks that other command instead. A command such as `grep` can return `1` simply because it found no match. The deliberate unauthorized-access tests below are also expected to return an error. Those exceptions are explicitly labeled.

For `apt install`, “already the newest version” is success. New packages usually produce many `Unpacking` and `Setting up` lines, then return to your Ubuntu prompt. “No VM guests are running outdated hypervisor binaries” is informational, not a failure. `E:`, “Failed to fetch,” “Unable to locate package,” or an unmet dependency means stop and resolve that package step. If a configuration-file prompt asks whether to replace an existing file, preserve the installed configuration unless this guide explicitly tells you to replace it; do not overwrite NOC's settings by guessing.

### Values you must obtain, rather than guess

| Value | Where it comes from | When you need it |
| --- | --- | --- |
| Server address, personal Ubuntu login, sudo access | NOC/server administrator | Connecting to the server |
| Approved application commit hash | The application maintainer, after the intended fixes have been committed and made available | Section 9; an old version badge is not a substitute |
| Actual website name and trusted certificate | NOC's DNS/certificate administrator, or the public DNS/CA process if applicable | Browser access in sections 5 and 14 |
| Database/Redis passwords | Choose your own, at least 18 characters, and save privately | Sections 7–10 |
| JWT signing secret | Generated by the application-secret command; not a login password | Section 10 |
| Email identity/API credentials | Your authorized AWS administrator/setup | Optional email section 16 |
| Backup destination and access | Backup administrator or the separate-server setup | Section 17 |

For example, replacing `CHANGE_ME_APPROVED_COMMIT_HASH` means deleting that entire placeholder and pasting the real hash. Do not retain the words `CHANGE_ME`, angle brackets, or sample domains. If a required value has not been supplied, pause the step that needs it. A guide cannot create organizational access or issue a trusted certificate on someone else's behalf.

If a command reports an error, stop that section. An error does not become harmless because the next command succeeds. See [troubleshooting](#21-troubleshooting). Do not paste environment files or passwords into a support ticket.

### Development passwords and configuration formatting

For this dev/POC walkthrough, **choose your own passwords of at least 18 characters**. There is no hexadecimal-password generation requirement. `Enter password` during `db.createUser` means **assign a new password to that account**, not authenticate with an existing one. Keep each password labeled by account. Cryptographic signing keys such as `JWT_SECRET` are separate machine secrets, not login passwords.

You can choose spaces and punctuation. Configuration files and connection URLs need those characters represented correctly; do not change your password merely to fit a URL. On the Ubuntu server, use this optional formatter when preparing the MongoDB/Redis URLs or Redis/backup configuration:

```bash
python3 -c '
import getpass, json
from urllib.parse import quote
value = getpass.getpass("Enter your already chosen password (18+ characters): ")
if len(value) < 18:
    raise SystemExit("STOP: choose a password of at least 18 characters")
if any(ord(c) < 32 or 127 <= ord(c) <= 159 for c in value):
    raise SystemExit("STOP: input contains control characters; check the terminal input")
print("URL-encoded value:", quote(value, safe=""))
print("Quoted configuration value:", json.dumps(value, ensure_ascii=False))
'
```

This **formats the password you chose; it does not generate or change it**. Expected: two labeled lines. The output still contains your secret in readable/reversible forms: keep it private and do not paste it into chat. Use:

- The **original password** at MongoDB login/creation prompts and the Redis password test.
- The **URL-encoded value** only in the password portion of `MONGO_URI` or `REDIS_URL`. For example, an `@` within a password becomes `%40` there. Do not encode the whole connection URL or encode an already encoded password again.
- The entire **quoted configuration value**, including its quotes, after `requirepass ` in `redis.conf`, or after `password: ` in the MongoDB backup YAML. Replace the whole example quoted value; do not add a second pair of quotes. This handles spaces, double quotes, and backslashes in ordinary text passwords.
- The **original password as one line** in the restic password file, with no added quotes.

This setup policy changes documentation and the helper shown here, not every password rule in the application. The existing password-reset API still checks character composition; its separate test in section 16 states that requirement explicitly. No live server password or application validation has been changed by editing this guide.

## 2. What you need and what each part does

### 2.1 Gather these items

| Item | What to obtain |
| --- | --- |
| Server | A dedicated VM, cloud instance, or physical machine running **Ubuntu Server 26.04 LTS, amd64/x86-64**. |
| Starting resources | A practical small-install starting point is 2 CPU cores, 4 GB RAM, and 40 GB SSD. Add capacity for documents, growth, and temporary backups. This is a planning estimate, not a tested capacity guarantee. |
| CPU compatibility | An x86-64 CPU/VM exposing AVX instructions for MongoDB. Older CPUs or VM CPU emulation may not provide them. |
| Administrator access | The hosting/VM console and an Ubuntu account allowed to run `sudo`. Keep console access available in case SSH breaks. |
| Website name | For browser access, an internal or public DNS name users can resolve. It can be arranged after dependency installation and local startup checks. |
| Network | A stable server IP, outbound HTTPS/DNS/package access, inbound HTTPS from intended users, and SSH from administrators. Public certificate issuance below also needs inbound HTTP. |
| Source access | Access to `https://github.com/resonance-designs/docman` and the exact approved Git commit to deploy. The commit must include the current migration and publication-audit fixes. |
| Password storage | An organization-approved password manager for the credentials generated below. |
| Email, if used | An AWS account with billing configured and permission to configure SES, IAM, and domain DNS. |
| Backups | Another Ubuntu server or equivalent approved SFTP storage, with enough space for retained backups. |

For physical storage encryption, enable your organization's supported encrypted-disk option during provisioning. Encryption at rest is an operating-system/storage choice; DocMan does not encrypt every uploaded file itself. Keep disk recovery keys outside the server. A physical Ubuntu encrypted installation may require someone to unlock the disk after reboot; plan for that before using it remotely.

### Installation milestones

Follow the numbered sections in order, or the explicit internal-server sequence in section 4.4. A milestone is complete only after its expected result is observed.

| Milestone | Required work | Completion evidence |
| --- | --- | --- |
| Prepared server | OS/access, base packages, time and firewall policy (sections 3–5) | Correct OS, successful installs, Apache version, synchronized clock, recorded network restrictions |
| Database services | Node/npm, MongoDB, Redis (sections 6–8) | Versions, active services, successful authenticated and denied unauthenticated checks |
| Application installed | Approved source, dependencies, saved configuration, accounts/category, migration (sections 9–11) | Correct commit, successful installs, readable settings, created accounts/category, completed migration and valid audit chain |
| Local startup | Frontend build/publication and backend service (sections 12–13) | Website files, active backend, local Redis selected, API HTTP 401 |
| Browser access | Certificate, Apache modules/site, client trust/DNS (section 14) | Valid HTTPS response from the intended workstation; localhost startup alone does not count |
| Working document sharing | Login and role-separated document workflows (section 15) | Upload/replacement/approval/download and denied-access tests pass |
| Operations | Email if used, backups, restoration, renewal and maintenance (sections 16–22) | Recorded feature checks, usable off-server backup, successful recovery test, assigned operational ownership |

If waiting for an external prerequisite such as a NOC certificate, record the pending item and preserve the files already created. Do not redo successful setup or label browser access complete while waiting.

### 2.2 Installed components

| Component | Purpose | Network exposure |
| --- | --- | --- |
| Apache | Serves the built website, terminates HTTPS, forwards API requests | TCP 80 and 443 from intended user networks; internal-only for this POC |
| Node.js 22 + npm | Runs the backend; installs packages and builds Vue | Backend TCP 5001 must be blocked externally |
| MongoDB Community 9.0 | Stores users, document metadata, versions, and audit records | Loopback TCP 27017 only |
| Redis | Shares rate-limit counters across requests/processes | Loopback TCP 6379 only |
| systemd | Starts services after reboot and restarts the backend after failure | No additional public port |
| Certbot (public-certificate route only) | Obtains and renews public certificates; not used for the NMDOH internal certificate | Uses the website's HTTP challenge path |
| MongoDB Database Tools | Creates/restores database backups | Connects locally to MongoDB |
| restic + OpenSSH | Encrypts and transfers backups to another server | Outbound SSH to backup host |

Browser → HTTPS Apache → `/api/` Node → local MongoDB/Redis. Uploaded documents live in `/var/lib/docman/uploads`, outside both the Git checkout and Apache's public website directory. Downloads go through the authenticated application.

The React frontend, Vite development server, PM2, Nginx, Docker, Kubernetes, Atlas, and Upstash are not required for this installation. npm installs the JavaScript dependencies from the repository's lockfiles.

## 3. Create or install the Ubuntu server

### 3.1 If your organization or cloud provider supplies the server

Create a VM/instance with the resources above. Select **Ubuntu Server 26.04 LTS x86-64**, attach a persistent disk, reserve a stable IP, and enable console access. If NOC has already provisioned the server, keep that installation and check its version rather than rebuilding it to match an example. Record the supplied SSH username; it is often `ubuntu`, but varies by provider. Add your SSH public key during provisioning if the provider supports it. Do not choose a preconfigured Docker or application image.

If IT supplies the machine, ask for its IP, sudo-enabled username, login method, DNS administrator contact, and whether traffic uses a public address, VPN, or organization proxy. An internal-only deployment can use an organization-issued certificate as explained in section 14.

### 3.2 If you install Ubuntu yourself

Download the **live-server amd64 ISO** from [Ubuntu's 26.04 LTS release directory](https://releases.ubuntu.com/26.04/). Use the downloaded ISO as the VM's virtual DVD, or write it to a USB drive with your organization's approved imaging utility. Writing an image erases that USB drive: choose an empty one.

Boot the new machine from that media. In the installer:

1. Choose language and keyboard layout.
2. Choose Ubuntu Server. Configure its network adapter; DHCP is suitable during installation if a stable lease/address will be assigned afterward.
3. Leave the proxy empty unless your network administrator supplies one. Accept the normal package mirror if reachable.
4. Choose the intended **empty** installation disk. Review the disk name and size before accepting the erase operation. Do not use a disk containing documents you need.
5. Create the server name `docman-server` and your personal administrator account, for example `docdeploy`. Choose a strong password and store it.
6. Select **Install OpenSSH server**. Optional featured applications are unnecessary.
7. Finish installation, eject the ISO/USB when requested, and reboot.
8. Log in at the console and run `ip -br address` to find the assigned address.

If OpenSSH was not selected, install it from that console:

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

**Check:** run `systemctl is-active ssh`. It must print `active`. Package installation should finish without an apt error; `enable --now` may print a symlink message or nothing. If the check is not `active`, run `sudo journalctl -u ssh -n 40 --no-pager` from the console. Continue to remote login only after SSH is active.

`ip -br address` shows interface names and addresses. `lo` / `127.0.0.1` is not the address to use from your workstation. Find the address on the network interface (often `ens...` or `enp...`); ask NOC if there are several possible networks.

For a LAN server behind a router, your network administrator must provide a stable address/DHCP reservation. Public access additionally needs the router/firewall to forward TCP 80/443 to this machine. Do not publish database ports. A server on a private VPN can remain private; users must be able to reach that VPN.

## 4. Connect securely and prepare Ubuntu

### 4.1 Open an SSH session

On Windows, open **PowerShell** from Start. Run `ssh -V`. If Windows says SSH is missing, open Settings → System → Optional features → Add/View features → **OpenSSH Client**, install it, and reopen PowerShell. On macOS/Linux, open Terminal; SSH is normally available.

Generate a key **on your computer**, if you do not already have an approved one:

```text
ssh-keygen -t ed25519 -C "docman-administrator"
```

Accept the default filename only if it will not overwrite an existing key. Use a passphrase. The `.pub` file is the public key; the file without `.pub` is private and must stay on your computer.

**Success looks like:** messages saying the identification and public key were saved, followed by a fingerprint and a small text-art box. When asked for a passphrase, enter it twice; it does not appear while typing. If asked to overwrite an existing key, answer `n` and use the existing approved key or choose a new filename. Later commands must use the filename you actually chose.

Connect, replacing the username and address:

```text
ssh docdeploy@203.0.113.10
```

On the first connection, compare the displayed host fingerprint with the server console's output from `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. Accept only a match. If you provisioned a key already, SSH uses it; otherwise enter the initial Ubuntu password.

If your provider gave you `root` rather than a personal sudo account, use that initial session to create one:

```bash
adduser docdeploy
usermod -aG sudo docdeploy
```

`adduser` asks for the new Ubuntu password twice, then optional profile information. You can press Enter through those optional fields and confirm with `Y`. `usermod` normally prints nothing. Run `id docdeploy`: its groups must include `sudo`. If `adduser` says the account exists, do not reset an existing person's account; inspect it before continuing.

Log in as that new account in a second terminal before closing the initial session. If the provider disables password SSH and only root has a key, use the console to install your public key in the new account as described next.

### 4.2 Install your public key and verify a second connection

Display the key **on Windows**:

```powershell
Get-Content "$HOME\.ssh\id_ed25519.pub"
```

On macOS/Linux, use `cat ~/.ssh/id_ed25519.pub`. Copy the entire single line beginning `ssh-ed25519`.

In the **server session as your personal administrator account**:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Paste the public key on its own line in `authorized_keys`, preserving existing keys.

The `mkdir` and `chmod` commands normally return silently. Save and close nano before running the final `chmod`. The key is one line, although nano may visually wrap it. Verify with `ls -ld ~/.ssh` and `ls -l ~/.ssh/authorized_keys`: expect directory permissions `drwx------` and file permissions `-rw-------`, owned by your personal login. If the key file is empty, the next login will fail. Open another computer terminal and confirm this works:

```text
ssh -o PreferredAuthentications=publickey docdeploy@203.0.113.10
```

A successful connection shows an Ubuntu welcome message or a new `username@server` prompt, not `Permission denied (publickey)`. Then run `sudo -v` in that new server session; enter your Ubuntu password if asked. It should return to the prompt without an error. Both the SSH login and sudo must work before disabling password login. Keep the first session and provider console available.

Open `sudo nano /etc/ssh/sshd_config.d/00-docman.conf`, paste the following contents, then save and exit:

```text
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
```

Check and reload:

```bash
sudo sshd -t
sudo sshd -T | grep -E 'passwordauthentication|kbdinteractiveauthentication|permitrootlogin|pubkeyauthentication'
sudo systemctl reload ssh
```

The first command should produce no error. Effective password authentication, keyboard-interactive authentication, and root login should be `no`; public-key authentication should be `yes`. Site-specific `Match` sections can change SSH behavior; if the results differ, resolve that before closing working sessions. Test another new login. [Ubuntu's OpenSSH documentation](https://ubuntu.com/server/docs/how-to/security/openssh/) explains the server configuration.

### 4.3 Install operating-system tools

All commands in this section run on the **Ubuntu server**, at your normal sudo-enabled account's `$` prompt. A fresh installation does not imply Apache, Node, MongoDB, Redis, or the tools below are present.

First check the OS and CPU:

```bash
cat /etc/os-release
uname -m
lscpu | grep -w avx
```

Expect Ubuntu `26.04`, `x86_64`, and a CPU flags line containing `avx`. Stop on a different target or missing AVX; fix the machine configuration before installing MongoDB.

Refresh the available package list:

```bash
sudo apt update
```

Wait for it to finish without `E:` or download errors. If a repository is unreachable, correct the network/proxy/repository issue before continuing.

Apply Ubuntu updates:

```bash
sudo apt upgrade -y
```

Wait for completion. For a NOC-managed server, follow its approved update window and configuration policy. Do not overwrite organization-managed configuration when prompted.

Install the common prerequisites. Copy this complete command, including both continued lines:

```bash
sudo apt install -y ca-certificates curl gnupg git rsync nano jq openssl \
  build-essential python3 apache2 ufw redis-server restic openssh-client \
  unattended-upgrades dnsutils util-linux logrotate
```

**Expected:** package installation completes without an error; “already the newest version” also counts as success. This installs Apache explicitly. It does not install Node/npm or MongoDB; those follow in sections 6–7. It may start Apache's default site and Redis, which are not yet configured for DocMan.

| Packages | Why they are installed |
| --- | --- |
| ca-certificates, curl, gnupg | Trusted HTTPS downloads and repository signing-key setup |
| git, rsync | Download the approved source and publish the website build |
| nano, jq, openssl | Edit files, inspect JSON, format/generate cryptographic material |
| build-essential, python3 | Build native npm dependencies and run setup helpers |
| apache2 | Serve the website and proxy its API over HTTPS |
| redis-server | Run the local rate-limit store; secure it in section 8 |
| ufw | Host firewall when NOC has not supplied another managed implementation |
| dnsutils, util-linux | DNS checks and utilities such as runuser/flock |
| restic, openssh-client | Encrypted off-server backups; configure in section 17 |
| unattended-upgrades | Ubuntu security updates, subject to NOC policy |

Verify Apache is actually installed:

```bash
apache2 -v
```

**Expected:** `Server version: Apache/2.4...`. `command not found` means installation is incomplete; resolve the apt error before continuing. Apache configuration and certificate installation come later, in section 14.

On a server you administer independently, enable Ubuntu security updates:

```bash
sudo dpkg-reconfigure -plow unattended-upgrades
```

Choose **Yes** in the dialog, then press Enter. On a NOC-managed server, confirm its existing update policy instead of replacing it. MongoDB's third-party packages need a separate update plan; Ubuntu automatic updates alone do not establish that plan.

Check the clock:

```bash
timedatectl status
```

Expect `System clock synchronized: yes`. Preserve NOC's configured time provider. For an independently administered server using its supplied NTP service, run the following if synchronization is not enabled:

```bash
sudo timedatectl set-timezone UTC
sudo timedatectl set-ntp true
timedatectl status
```

The first two commands normally print nothing. If NTP is unsupported or synchronization remains `no`, resolve the time-service configuration and access to an approved time source before authentication testing. Do not assume an active service means the clock is synchronized.

**If time synchronization needs installation/configuration:** Ubuntu 26.04 uses Chrony by default. Preserve a working NOC-managed provider. On a fresh server without a managed provider, install and start Chrony:

```bash
sudo apt install -y chrony
sudo systemctl enable --now chrony
systemctl is-active chrony
chronyc tracking
chronyc sources -v
```

Expect `active`, a tracking report with `Leap status: Normal`, and a selected source marked `^*`. Initial synchronization may take a short time. If sources remain unreachable, obtain the approved time-server hostname/IP from NOC and check its network reachability rather than repeatedly restarting the application.

For an internal NTP source supplied by NOC, open `sudo nano /etc/chrony/sources.d/docman-internal.sources` and enter:

```text
server CHANGE_ME_NOC_TIME_SERVER iburst
```

Replace the placeholder with the actual NOC hostname/IP, save with Ctrl+O, Enter, and exit with Ctrl+X. This example is for ordinary NTP; if NOC requires authenticated NTS, obtain its specific source/trust settings. If public sources are prohibited, comment out the `pool` lines in `/etc/chrony/sources.d/ubuntu-ntp-pools.sources`; preserve NOC-managed sources and DHCP configuration. Restart and verify:

```bash
sudo systemctl restart chrony
chronyc sources -v
chronyc tracking
timedatectl status
```

Expect a selected source, `Leap status: Normal`, and `System clock synchronized: yes`. For startup errors inspect `sudo journalctl -u chrony -n 50 --no-pager`. Ordinary NTP uses outbound UDP 123; Ubuntu's default NTS sources also need outbound TCP 4460. This configures a time client, not a time server for other computers. See [Ubuntu's Chrony setup](https://ubuntu.com/server/docs/how-to/networking/chrony-client/).

If `/var/run/reboot-required` exists, reboot now with `sudo reboot`, wait for the server to return, and reconnect over SSH. A reboot closes your terminal connection.

To check that file without needing to know Linux file commands, run:

```bash
if [ -f /var/run/reboot-required ]; then
  echo 'Reboot required: schedule it, then reconnect afterward'
else
  echo 'No reboot-required flag'
fi
```

**Time checkpoint:** `timedatectl status` should show `System clock synchronized: yes` and an active NTP service. UTC is the timezone used by this guide's scheduled tasks. If synchronization is `no`, wait briefly and check again; if it stays `no`, resolve time-service/network access with NOC before authentication testing. A wrong clock can invalidate login tokens and certificates.

### 4.4 Internal POC installation sequence

For a fresh, already provisioned internal server, work in this order. Run commands in the Ubuntu terminal, not in the workstation's PowerShell window.

1. Check the machine:

   ```bash
   cat /etc/os-release
   uname -m
   free -h
   df -h /
   lscpu | grep -w avx
   ```

   **Expected:** Ubuntu `26.04`, `x86_64`, and a flags line containing `avx`. In `free -h`, inspect the `Mem:` row; `available` is the memory left for applications. In `df -h /`, `Avail` is free disk space. The supplied NMDOH server had 7.3 GiB total memory and 39 GB available disk. A blank AVX result or a different OS/architecture is a reason to stop before installing MongoDB.

2. Complete **section 4.3's operating-system package installation** before continuing. This is the same prerequisite list for the internal POC; do not use a smaller substitute list and postpone missing tools. Respect NOC-managed update/time policies. Then inspect package candidates:

   ```bash
   apt-cache policy nodejs redis-server
   ```

   **Expected:** each package has a `Candidate:` version, not `(none)`. `Installed: (none)` is normal before installation. If a candidate is missing, resolve the apt/repository error first.

3. Follow section 6 to install Node.js, npm, and Redis. Confirm the version outputs and `PONG`.
4. Follow section 7's MongoDB installation commands. Confirm its version, active service, successful ping, and localhost listener. Then create database accounts and enable authentication using sections 7.2–7.3.
5. Complete Redis password configuration in section 8. The earlier `PONG` confirms connectivity only; it does not mean Redis has been password-protected yet.
6. Confirm section 5.2’s host/NOC firewall restrictions before starting the backend; it listens on all interfaces. Then follow sections 9–13 to install the application, configure it, provision users/category, migrate, build, and check backend startup locally. Pass the prerequisite checkpoint below before those steps. Supply the intended application URL when writing settings; the URL does not need to be reachable just to test `http://127.0.0.1:5001/api/docs` on the server. Its expected unauthenticated response is 401. This is a backend startup check, not a browser login acceptance test.
7. After local startup works, complete browser DNS/reachability and organization-trusted HTTPS in sections 5 and 14, then section 15's browser workflow tests. Use section 14's organization-certificate route for the internal POC. Do not open public firewall access or request a public certificate for a short internal machine name.
8. Complete email, backup/recovery, and operational checks as applicable before handing the POC to users. Their status must be recorded separately from basic application startup.

**Required prerequisite checkpoint:** after section 4.3, run this whole block on the server:

```bash
missing_tools=0
for tool in git curl gpg rsync nano jq openssl python3 make gcc g++ apache2 ssh dig flock ss; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf 'FOUND: %s\n' "$tool"
  else
    printf 'MISSING: %s\n' "$tool"
    missing_tools=1
  fi
done
if [ "$missing_tools" -eq 0 ]; then
  echo 'Base tools found; continue with version and service checks'
else
  echo 'STOP: complete the package installation in section 4.3'
fi
apache2 -v
timedatectl status
```

**Expected:** every tool says `FOUND`, the final tool message says `Base tools found`, Apache prints `Server version: Apache/2.4...`, and the clock says `System clock synchronized: yes`. A missing tool means the installation is not complete; revisit section 4.3 and resolve apt errors. These checks do not prove Apache is configured or network access is permitted. Node/npm, MongoDB, and Redis have their own version/service/authentication checks in sections 6–8. Record actual results rather than assuming a command in this guide has already been executed.

Use NOC's existing firewall and update policies. If this server needs its own UFW/security-update setup, apply sections 4.3 and 5 with the actual administrator access path accounted for. Do not replace NOC-managed SSH settings simply because the fresh standalone-server example includes them. Snap/Certbot is only necessary if you later choose the public-certificate route.

When reporting progress, send the version/check results and any errors; the entire successful apt installation log is unnecessary. Stop on unexpected errors. Never include passwords, private keys, or environment-file contents.

## 5. Set up the address and firewall

### 5.1 DNS

For the internal NMDOH POC, have NOC create or confirm an internal **A record** pointing the chosen website name to this server's private IPv4 address. Do not create a public record for this internal machine. For a public deployment you administer yourself, add an A record in your domain's DNS management page pointing the chosen name to the server's stable public IPv4 address. For a delegated name such as `docs.department.example.org`, use the label appropriate to that DNS zone. Do not include `https://` or a path in a DNS record.

Only add an **AAAA record** if IPv6 reaches this server and its firewall is configured. Remove an incorrect old AAAA record; it can make browsers and certificate issuance fail even when IPv4 works. For private deployment, use the private address in the organization's internal DNS instead.

On the **Ubuntu server**, run:

```bash
dig +short docs.example.org A
dig +short docs.example.org AAAA
```

Replace `docs.example.org` with the agreed website name. The first command should print the intended IPv4 address. An empty second result is normal when IPv6 is not configured. An empty/wrong A result means DNS is not ready. On the **Windows workstation**, use `Resolve-DnsName YOUR_ACTUAL_WEBSITE_NAME` in PowerShell and inspect its `IPAddress` result; Windows does not normally include `dig`. Both machines must resolve the intended address before browser testing.

DNS changes can take time to propagate. The A result must match your intended address. Record these values in your password manager/deployment notes:

| Setting | Your value |
| --- | --- |
| Website hostname | `docs.example.org` → replace |
| Website URL | `https://docs.example.org` → replace |
| Server IP and administrator username | Your values |
| Approved application Git commit | Your exact commit hash |
| Certificate contact email | An inbox someone monitors |
| MongoDB administrator password | Choose in section 7; at least 18 characters |
| MongoDB application password | Choose in section 7; at least 18 characters |
| Redis password / JWT signing secret | Choose the Redis password in section 8; generate the separate machine signing key in section 10 |
| First DocMan administrator email/username/password | Your values |
| Backup host and encryption password | Section 17 |

### Network prerequisites for package installation and operation

Internal-only hosting still needs access to approved software sources. Before installation, have NOC provide the server's DNS resolvers, permitted package-access route (direct or managed proxy/mirror), and time source. Exact proxy addresses, credentials, and organization CA certificates must come from NOC; this guide cannot invent them.

| Connection | Needed for |
| --- | --- |
| Approved Ubuntu mirrors, using their configured HTTP/HTTPS ports | OS packages and updates |
| HTTPS to `pgp.mongodb.com` and `repo.mongodb.org` | MongoDB signing key and packages |
| HTTPS to `github.com` and download destinations it redirects to | Source checkout and dependency-hosted downloads |
| HTTPS to `registry.npmjs.org` and destinations specified by the lockfiles | `npm ci`; allow the actual failing download host if an npm dependency uses another source |
| Approved DNS resolvers | Resolving package, website, database-tool, and integration hostnames |
| Approved time source | UDP 123; TCP 4460 additionally for Ubuntu NTS sources |
| AWS SES regional HTTPS endpoint, if email is enabled | Outgoing application email |
| Approved backup host SSH/SFTP port, usually TCP 22 | Off-server backups |

These are destination/service requirements, not instructions to expose inbound database ports. A blocked download is an unresolved prerequisite. Use the error's hostname to request the appropriate NOC rule or mirror/proxy configuration. If TLS inspection is required, obtain the verified organization CA and install its trust as described in section 14.3; do not disable TLS verification in npm, curl, or Git. Proxy-required sites must obtain NOC's apt/Git/npm proxy settings before the package steps can succeed. Working apt access alone does not prove Git/npm access.

### 5.2 Two firewall layers

If your hosting provider has a security group/cloud firewall, configure it too:

- TCP 22: your administrator network/IP or VPN.
- TCP 80 and 443: intended users; the public HTTP certificate method requires port 80 reachable by the certificate authority.
- No inbound rules for TCP 5001, 5173, 5174, 6379, or 27017.

On Ubuntu, allow SSH **before** enabling the firewall:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
sudo ufw status verbose
```

Answer `y` when prompted. Check a second SSH connection immediately.

`ufw status verbose` must show `Status: active`, default incoming policy `deny`, and allow rules for OpenSSH/22 and Apache's 80/443 ports. If it says `inactive`, UFW is not enforcing these rules. If NOC manages another firewall instead, verify its equivalent rules with NOC; do not treat an absent UFW command as proof the server is protected. Rule names may be shown as port numbers, and IPv6 rules may appear separately. The general OpenSSH rule allows port 22; organizations can narrow it to known administrator networks after confirming those addresses and keeping console access. Do not guess your source IP and lock yourself out. [Ubuntu's firewall documentation](https://ubuntu.com/server/docs/firewalls/) describes UFW rules.

**NMDOH observed checkpoint:** MongoDB and Redis are loopback-only, Node listens on `*:5001`, Apache listens on ports 80/443, and UFW reports `inactive`. This does not prove public exposure or that NOC filtering blocks internal clients. Confirm the applicable host/network firewall policy and required management access before enabling UFW. Apache listening on 443 alone does not prove the disabled DocMan HTTPS site has a certificate or works.

**Application-specific detail:** the backend currently listens on all interfaces; it does not implement a `HOST=127.0.0.1` setting. This guide therefore relies on the host and network firewalls to prevent direct access to port 5001. Apache connects to it through loopback. MongoDB and Redis will additionally bind to loopback themselves.

## 6. Install Node.js

Use Node.js **22**, at least **22.12**, from Ubuntu’s package repository. Do not use a per-user `nvm` installation for the system service in this guide.

### 6.1 Install and verify the Ubuntu packages

The NMDOH server's package candidate was Node 22.22.1. Install Node, npm, and Redis:

```bash
sudo apt install -y nodejs npm redis-server
sudo systemctl enable --now redis-server
node --version
npm --version
redis-server --version
redis-cli ping
command -v node
```

Observed results: `v22.22.1`, npm `9.2.0`, Redis `8.0.5`, and `PONG`. Node should resolve to `/usr/bin/node`. A newer patch may be available when you install. If your candidate is a different Node major version, reassess it before installing instead of silently changing the runtime target. Continue to section 7.

**If the check fails:** `command not found` means the corresponding package installation did not finish or the executable is not on the path. A Redis connection refusal means the service is not accepting connections: run `systemctl is-active redis-server` (expect `active`) and `sudo journalctl -u redis-server -n 40 --no-pager`. `NOAUTH` means a Redis password is already configured; use the authenticated test in section 8. Do not reset an existing Redis password without updating its application configuration too.

## 7. Install and secure MongoDB

### 7.1 Install MongoDB Community 9.0

Add the signing key and the `resolute` repository:

```bash
curl -fsSL https://pgp.mongodb.com/server-9.asc -o /tmp/mongodb-server-9.asc
sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-9.gpg /tmp/mongodb-server-9.asc
echo 'deb [ arch=amd64 signed-by=/usr/share/keyrings/mongodb-server-9.gpg ] https://repo.mongodb.org/apt/ubuntu resolute/mongodb-org/9.0 multiverse' | sudo tee /etc/apt/sources.list.d/mongodb-org-9.0.list
```

**Expected:** `curl` and `gpg` normally produce no output; `tee` prints the single repository line it wrote. If curl reports a TLS, DNS, or HTTP error, stop; do not run gpg on an unsuccessful download. If gpg asks to overwrite an existing key file, this step may already have been run: check the filename and existing repository before repeating it. Do not add a different Ubuntu release's repository to bypass a download error.

Install and start:

```bash
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

Verify:

```bash
mongod --version | head -n 1
systemctl is-active mongod
mongosh --quiet --host 127.0.0.1 --eval 'db.runCommand({ ping: 1 })'
sudo ss -lntp | grep ':27017'
mongodump --version
mongorestore --version
```

Expected: MongoDB **9.0.4 or newer within 9.0**, `active`, `{ ok: 1 }`, and `127.0.0.1:27017`. The NMDOH installation returned **9.0.8**. Do not change `bindIp` to `0.0.0.0`: the backend will connect locally. `mongodb-org` includes the database-tools dependency; if the backup executables are missing, install `mongodb-database-tools` from the configured MongoDB repository and recheck. The ping is a connectivity check, not an authentication test.

Source: [MongoDB Community installation for Ubuntu](https://www.mongodb.com/docs/manual/administration/install-community-linux/?linux-distro=ubuntu&linux-method=pkg). Continue to section 7.2.

`mongodump --version` and `mongorestore --version` each print their tool version and build information; their version numbers need not equal the database server's 9.0.8. If `is-active` reports `failed` or the ping reports connection refused, run `sudo journalctl -u mongod -n 60 --no-pager` before continuing. A listener on `0.0.0.0:27017` or `[::]:27017` is not the localhost-only result expected here; set `net.bindIp` to `127.0.0.1` in `/etc/mongod.conf`, restart MongoDB, and repeat the listener check.

### 7.2 Create database accounts

These steps match the next step in the guided NMDOH installation. On a fresh instance, create the users locally before enabling authentication, then immediately enable it in section 7.3. Keep MongoDB bound to `127.0.0.1` throughout. If authentication is already enabled, connect using your existing database administrator instead; do not disable it to rerun setup.

Ensure MongoDB is running:

```bash
sudo systemctl enable --now mongod
systemctl is-active mongod
```

**Expected result:** the last command prints exactly:

```text
active
```

The first command starts MongoDB and enables startup after reboot. It may print a message about creating a service symlink, or nothing if the service is already enabled. No output from that first command alone is not an error; the `active` result from the second command confirms MongoDB is running.

If the result is `inactive`, `failed`, or an error such as `Unit mongod.service could not be found`, stop before creating accounts. Inspect the service and its recent log messages:

```bash
sudo systemctl status mongod --no-pager
sudo journalctl -u mongod -n 60 --no-pager
```

If the unit cannot be found, check that the MongoDB installation in section 7.1 completed successfully. For a failed service, resolve the error reported in the logs, then run `sudo systemctl restart mongod` and repeat `systemctl is-active mongod`. Continue only when it prints `active`.

Choose two passwords yourself, each **at least 18 characters long**, and save them privately:

- **MongoDB administrator password** — the new password you will assign to `docman_db_admin`.
- **DocMan database password** — the new password you will assign to `docman_app`.

For this development environment, you choose the passwords; this guide does not require generated hexadecimal strings or a particular mix of uppercase letters, digits, and symbols. Use normal text on one line, without invisible control characters. The 18-character minimum is our setup rule, not a claim that MongoDB enforces it automatically. Do not share the passwords in chat.

**You are creating these passwords, not entering an existing MongoDB password.** The `Enter password` prompt below assigns the password to the new account. It is not asking for your Ubuntu sudo password.

Open the database shell from the Ubuntu terminal:

```bash
mongosh --host 127.0.0.1
```

**Expected:** connection/version information followed by a prompt such as `test>`. A warning that access control is not enabled is expected only during this fresh setup; section 7.3 enables it. `ECONNREFUSED` means MongoDB is not running at the requested address. Do not paste `use admin` into the Ubuntu `$` prompt; it belongs at the mongosh prompt.

Inside **mongosh**, run the database switch **by itself**:

```javascript
use admin
```

Wait for `switched to db admin` and the `admin>` prompt. Then paste and run this separate, complete command. Do not combine it with `use admin` in one paste; the shell may execute only the database switch:

```javascript
db.createUser({
  user: "docman_db_admin",
  pwd: passwordPrompt(),
  roles: [{ role: "root", db: "admin" }]
})
```

At the password prompt, paste the saved **administrator password**. It is not your Ubuntu sudo password. After entering the password and pressing Enter, expect a result containing `ok: 1` and the `admin>` prompt. `use admin` itself normally says `switched to db admin`; that message alone does not mean the user was created. If you receive an error instead of `ok: 1`, stop before creating the next user.

Still inside **mongosh**, switch databases in a separate command:

```javascript
use docman
```

Wait for the `docman>` prompt. Then create the application account:

```javascript
db.createUser({
  user: "docman_app",
  pwd: passwordPrompt(),
  roles: [{ role: "readWrite", db: "docman" }]
})
```

At this prompt, paste the **DocMan database password** and press Enter. Expect another result containing `ok: 1`, now at the `docman>` prompt. A password prompt may display no characters as you type. After that success, leave mongosh:

```javascript
exit
```

The application user is limited to its database.

After `exit`, your normal Ubuntu `username@server:...$` prompt should return. Run subsequent `sudo` commands there, not in mongosh. The database administrator has broader privileges and must not be used in the application's environment file. If a user already exists or a command fails, stop and investigate using the existing credentials; do not delete users or database files to force these commands through.

**If user creation reports `U_STRINGPREP_PROHIBITED_ERROR`:** the input contains characters MongoDB cannot accept during normalization. Remote clipboard handling can introduce invisible control characters. This does not mean an ordinary long password is unsupported. Cancel a garbled prompt with Ctrl+C and check the terminal input method rather than repeatedly pasting the same broken input. Do not put the password directly into a command or post it in a support message. Before retrying account creation, run `db.getUser("docman_db_admin")` at `admin>` (or the corresponding application username at `docman>`): `null` means the account does not exist; an account object means do not recreate it.

### 7.3 Enable authentication and verify access

Back at the **Ubuntu terminal**, preserve the current configuration and edit it:

```bash
sudo cp -a /etc/mongod.conf /etc/mongod.conf.before-docman-auth
sudo nano /etc/mongod.conf
```

`cp` normally prints nothing and makes a recovery copy; nano then opens the live file. If this backup filename already exists from a previous attempt, preserve that original copy instead of repeatedly overwriting it with a broken configuration. In nano, Ctrl+W followed by `security` and Enter finds the section. A leading `#` means a line is a comment and is not active configuration.

Find `#security:` and replace it with the following. If an active `security:` section exists, edit that section instead of adding another:

```yaml
security:
  authorization: enabled
```

Use **two spaces**, not a tab, before `authorization`. Preserve the package's other settings and the existing `bindIp: 127.0.0.1`. Preserve the rest of the installed configuration.

Save with **Ctrl+O**, **Enter**, then **Ctrl+X**. Restart and check:

```bash
sudo systemctl restart mongod
systemctl is-active mongod
```

Expect `active`. If it fails, inspect `sudo journalctl -u mongod -n 60 --no-pager` and check the YAML indentation before proceeding.

For a YAML parse error, reopen `sudo nano /etc/mongod.conf`, correct the reported line/indentation, save, and retry the restart. There must be only one active `security:` key. Do not continue with user provisioning while the service is failed.

Test the application account:

```bash
mongosh 'mongodb://127.0.0.1:27017/docman' \
  --username docman_app \
  --authenticationDatabase docman \
  --password
```

Enter the **DocMan database password**. Inside mongosh:

```javascript
db.getCollectionNames()
exit
```

An empty list, `[]`, is expected before application records exist. Existing collections are also valid if this is no longer an empty database. The important result is that the authenticated operation succeeds.

Finally, test that the same operation is denied without credentials:

```bash
mongosh 'mongodb://127.0.0.1:27017/docman' --quiet \
  --eval 'db.getCollectionNames()'
sudo ss -lntp | grep ':27017'
```

The unauthenticated command **must return an authorization error**, such as `requires authentication` or `Unauthorized`; that error is the expected success condition for this negative test. The listener must remain on `127.0.0.1:27017`. A successful unauthenticated `ping` does not prove authentication is disabled or enabled, so use the collection-list test above.

The MongoDB setup checkpoint is complete only when the authenticated operation succeeds, the unauthenticated operation is denied, and the listener remains local. On the NMDOH server, both authentication tests passed; the loopback listener was confirmed earlier in setup.

## 8. Install and secure Redis

Redis was installed in section 6.1 (or earlier with the tools in section 4.3). If it is not installed yet, run `sudo apt install -y redis-server` first. Choose a Redis password of **at least 18 characters**, save it privately, and use the quoted configuration form described in section 1 below. Then edit:

```bash
sudo cp -a /etc/redis/redis.conf /etc/redis/redis.conf.before-docman
sudo nano /etc/redis/redis.conf
```

The copy command normally prints nothing; nano opens the existing Redis settings. Keep the original backup if you are returning to fix an earlier attempt instead of overwriting it again. Lines starting with `#` are comments. The directives below need to be active lines without a leading `#`.

Find and set these directives, replacing any existing active copies instead of adding conflicting duplicates. In nano, Ctrl+W searches:

```text
bind 127.0.0.1 -::1
protected-mode yes
port 6379
requirepass "CHANGE_ME_REDIS_PASSWORD"
```

Each setting belongs on its own line. Replace the **whole existing line**, not just part of it: `port protected-mode yes` is invalid; `protected-mode yes` and `port 6379` must be separate lines. Replace `CHANGE_ME_REDIS_PASSWORD` with your chosen password, retaining the surrounding double quotes. Inside those quotes, write a literal double quote as `\"` and a literal backslash as `\\`.

Leave other package defaults in place. Save with **Ctrl+O**, **Enter**, then exit with **Ctrl+X**. At your Ubuntu `$` prompt, run:

```bash
sudo systemctl enable --now redis-server
sudo systemctl restart redis-server
systemctl is-active redis-server
```

**Expected:** `active`. If you see a failed-job message, `failed`, or `activating`, stop here; `activating` can mean Redis is repeatedly trying and failing to start. Follow the troubleshooting steps below before testing passwords.

### If Redis fails to start after editing

Read the recent service errors:

```bash
sudo journalctl -u redis-server -n 50 --no-pager
```

Look for `FATAL CONFIG FILE ERROR`, a line number, and the offending line. Before sharing logs, replace any displayed password with `[REDACTED]`; an error may include the password setting.

For example, the NMDOH installation reported line 112 containing `port protected-mode yes`, followed by `wrong number of arguments`. Check the saved settings with:

```bash
sudo grep -nE '^[[:space:]]*(port|protected-mode)[[:space:]]' /etc/redis/redis.conf
```

This shows line numbers and those two settings, without displaying the password. Expect one active `protected-mode yes` line and one active `port 6379` line. Your line numbers can differ. A correct `port 6379` elsewhere does not cancel out a malformed line.

To fix the example error, open the reported line:

```bash
sudo nano +112 /etc/redis/redis.conf
```

Use the line number from your error if it differs. Replace the entire malformed line with `protected-mode yes`; preserve the separate `port 6379` line. Save with **Ctrl+O**, **Enter**, then exit with **Ctrl+X**. Clear the repeated-start failure limit and retry:

```bash
sudo systemctl reset-failed redis-server
sudo systemctl restart redis-server
systemctl is-active redis-server
```

**Expected:** `active`. The first two commands normally print nothing on success. If it still fails, read the newest journal errors again; do not proceed until the service starts.

### Verify Redis authentication

At the Ubuntu `$` prompt, run the following commands **one at a time**. The first command pauses for your password; finish that prompt before entering the remaining commands:

```bash
read -rsp 'Redis password: ' REDISCLI_AUTH; echo
export REDISCLI_AUTH
redis-cli -h 127.0.0.1 ping
unset REDISCLI_AUTH
```

At `Redis password:`, enter the Redis password you already configured, then press Enter; its characters stay hidden. This is not a request to create another password or enter your Ubuntu/MongoDB password. `read` temporarily stores it, `export` makes it available to the Redis client, and `unset` removes it from this shell afterward. `export` and `unset` normally print nothing. The authenticated `redis-cli` command must print `PONG`.

After `unset REDISCLI_AUTH`, check the denied case explicitly:

```bash
redis-cli -h 127.0.0.1 ping
```

**Expected:** an error containing `NOAUTH Authentication required`. This is intentional: it confirms a client without the password is denied. If it prints `PONG`, the password configuration did not take effect. If the authenticated test says `WRONGPASS`, compare the saved Redis password with the active `requirepass` line and restart after correcting it. A connection refusal needs the Redis service logs, not a password change. Never expose Redis to the Internet to solve a connection problem.

## 9. Download DocMan and create its directories

### 9.1 Create a dedicated application identity

Your human Ubuntu account installs code. A separate account named `docman` runs the application and owns uploaded files:

```bash
sudo useradd --system --user-group --home-dir /var/lib/docman --create-home --shell /usr/sbin/nologin docman
sudo install -d -o docman -g docman -m 0750 /var/lib/docman/uploads
sudo install -d -o docman -g docman -m 0750 /var/log/docman
sudo install -d -o "$USER" -g "$USER" -m 0755 /var/www/docman
sudo install -d -o root -g root -m 0755 /var/www/html/docman/public_html
```

If `docman` or the checkout already exists, do not recreate or change ownership recursively without checking the existing deployment. This section assumes a fresh installation.

The creation commands normally print nothing. Verify their results:

```bash
id docman
sudo stat -c '%U %G %a %n' /var/lib/docman/uploads /var/log/docman /var/www/docman /var/www/html/docman/public_html
```

`id` should list a `docman` user/group; the numerical IDs can vary. Uploads and logs must show `docman docman 750`. The checkout directory must show your personal username/group and `755`; the public directory must show `root root 755`. These numbers control who can read/write/enter a directory. If the results differ, correct the specific creation command before cloning. `$USER` expands to the current Ubuntu login: run this section in your normal sudo-enabled account, not a `sudo -i` root shell.

### 9.2 Clone and select the approved release

```bash
git clone https://github.com/resonance-designs/docman.git /var/www/docman
cd /var/www/docman
git fetch --tags
git log -5 --oneline
```

**Expected:** clone progress ends without `fatal:`; `git log` shows up to five lines beginning with abbreviated commit hashes. If `git clone` fails, do not continue into an unrelated directory. If `/var/www/docman` is not empty, inspect it with `ls -la /var/www/docman` rather than deleting it; it may already contain an installation.

The person supplying this application must give you its approved commit hash. A version badge alone does not identify uncommitted fixes. Replace the placeholder below with that hash:

```bash
git switch --detach CHANGE_ME_APPROVED_COMMIT_HASH
git rev-parse HEAD
```

Record the printed hash. A detached checkout here is intentional: it pins exactly what is deployed.

`git switch` should report `HEAD is now at ...`; `git rev-parse HEAD` should print the full hash of the supplied commit. It is usually 40 hexadecimal characters. If Git cannot find the commit, it has not been fetched/published or was mistyped. Obtain/fetch the intended commit before continuing; do not replace it with an arbitrary latest branch. If the changes to deploy are still only on a developer's computer, they must first be committed and made available in the repository or supplied as a reviewed release artifact. Do not substitute an old tag merely because its name looks similar.

If cloning asks for credentials, your account needs repository access. GitHub account passwords do not authenticate Git HTTPS operations. Use an organization-approved Git credential method or a repository-scoped, read-only SSH deploy key. For the SSH method, generate a separate server key using `ssh-keygen -t ed25519 -f ~/.ssh/docman_repository`, have the repository administrator add its `.pub` contents under repository Settings → Deploy keys without write access, then use:

```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/docman_repository -o IdentitiesOnly=yes' \
  git clone git@github.com:resonance-designs/docman.git /var/www/docman
```

Use this alternative clone command only if the earlier clone did not succeed and the destination is empty. Verify GitHub's SSH host fingerprint through its official documentation before accepting it. The private deploy key stays on the server; never put a personal token in the repository URL or an environment file.

If you used that custom SSH key, save its selection for later fetch/update commands:

```bash
git -C /var/www/docman config core.sshCommand "ssh -i $HOME/.ssh/docman_repository -o IdentitiesOnly=yes"
git -C /var/www/docman fetch --tags origin
```

The configuration command normally prints nothing; fetch must finish without an authentication error. If the key has a passphrase, enter it when SSH asks. Return to the commit-selection commands above after a successful alternative clone; cloning alone does not select the approved commit.

### 9.3 Install application packages

```bash
cd /var/www/docman/backend
npm ci
cd /var/www/docman/frontend-vue
npm ci
```

Run npm as your normal deployment account, **not with sudo**. `npm ci` uses the checked-in lockfiles.

Each `npm ci` must finish and return to the prompt without `npm ERR!` or `npm error`. A typical successful result says `added ... packages` and `audited ... packages`. Funding and audit summaries may follow; a vulnerability count is not the same as an installation failure and must be reviewed separately. Run `echo $?` immediately after each install if uncertain: expect `0`. Do not run the second install until the first has completed successfully. Development packages are needed to build the frontend and run verification. Do not use `npm audit fix --force` during installation: it can change dependency versions outside the approved release.

The application's error logger writes to `backend/logs`. On this fresh checkout, point that location at the dedicated log directory:

```bash
ln -s /var/log/docman /var/www/docman/backend/logs
```

If `backend/logs` already exists, inspect it and preserve existing logs before changing its layout. Do not nest a new symlink inside it.

`ln -s` normally prints nothing. Check `readlink /var/www/docman/backend/logs`: it must print `/var/log/docman`. An empty result means this is not the intended symlink; resolve that before service startup. A symlink is a pointer to another location, so the logger writes outside the source checkout. Uploaded files and error logs are the service's writable locations; code remains read-only to the service.

Keep this local-only symlink out of Git's change report:

```bash
printf '\n/backend/logs\n' >> /var/www/docman/.git/info/exclude
```

This command normally prints nothing. It changes only this checkout's local ignore list; it does not change tracked source files. Later `git status --short` checks should not list `backend/logs` as an unexplained source change.

## 10. Configure the application

### 10.1 Backend environment

#### Prepare and save the values before opening the editor

Do this at the Ubuntu `$` prompt on the server. **Do not open nano yet.** You need three saved values: an encoded MongoDB application password, an encoded Redis password, and a JWT signing key. Keep them in private notes or your password manager, not in chat.

“URL-encoded” means the same password with special characters represented by codes so they work inside a connection address. For example, `@` becomes `%40`. This does not change the account password and does not conceal it. Use your original password at login prompts; use the encoded value only inside the connection URL.

Paste this complete command:

```bash
python3 -c '
import getpass
from urllib.parse import quote
for label in ("MongoDB application password", "Redis password"):
    value = getpass.getpass(label + ": ")
    print("URL-encoded value:", quote(value, safe=""))
'
```

At the first prompt, enter the original password for `docman_app` and press Enter. Input stays hidden. Save the text printed after `URL-encoded value:` as **Encoded MongoDB application password**. At the second prompt, enter the original Redis password and save the resulting value as **Encoded Redis password**. Save only the value, without the label. If the output looks unchanged, the password did not need special characters encoded.

If you ran `clear` or lost the output, run this formatter again with the original passwords. It does not create or change passwords. Never feed an already encoded value back into the formatter.

If nano is already open, save your progress with **Ctrl+O**, **Enter**, then exit with **Ctrl+X** before running terminal commands. Reopen the existing file later with `sudo nano /var/www/docman/backend/.env.prod`; do not repeat the file-creation command, which would erase its contents.

Run `openssl rand -hex 64`: expect one line of **128 hexadecimal characters**. Save the complete line as **JWT secret**. This is a machine signing key, **not a user-chosen login password**. It is copied into a configuration file and never manually typed at a password prompt. The chosen-password rule below does not replace this cryptographic key with an 18-character password.

If you already generated and saved the JWT key for this installation, use that saved key. **Checkpoint: before continuing, confirm all three labeled values are saved and available to copy.** Both JWT fields below use the same saved key. Both password placeholders use the saved text printed by the formatter, including its `%` codes.

#### Create and edit the configuration file

The block below checks whether the backend settings file already exists. It preserves existing settings; otherwise it creates an empty file with restricted permissions. Copy the entire block:

```bash
if sudo test -e /var/www/docman/backend/.env.prod; then
  echo 'Existing settings preserved; edit them below'
else
  sudo install -o root -g docman -m 0640 /dev/null /var/www/docman/backend/.env.prod
fi
```

If the file exists, expect the preservation message. Otherwise creation normally prints nothing. Stop on an error. Then open the file:

```bash
sudo nano /var/www/docman/backend/.env.prod
```

Paste this complete configuration and replace **every** `CHANGE_ME_...` value and `docs.example.org`. Do not include spaces around `=`. Do not use the Redis password as the database password. Passwords in connection URLs must use the URL-encoded form described in section 1. Keep the URL itself on one line.

Use the **DocMan database password**, not the MongoDB administrator password, in `MONGO_URI` (URL-encoded); use the Redis password in `REDIS_URL` (URL-encoded); use the same 128-character JWT secret on both token-secret lines. For local startup before a DNS name is assigned, you can set the three URL values to `https://` followed by your actual server name, then update all three to the final browser hostname before section 14/15. This does not configure HTTPS by itself. Leave `NODE_ENV=production` even on the development/POC server: it selects the deployed application's settings, not the server's organizational name.

```dotenv
NODE_ENV=production
ENV=Production
ACTIVE_ENV=1
ATLAS=no
NODE_PORT=5001
DOCMAN_UI=vue
MONGO_URI=mongodb://docman_app:CHANGE_ME_URL_ENCODED_MONGO_APP_PASSWORD@127.0.0.1:27017/docman?authSource=docman
JWT_SECRET=CHANGE_ME_JWT_HEX_SECRET
TOKEN_KEY=CHANGE_ME_SAME_JWT_HEX_SECRET
APP_BASE_URL=https://docs.example.org
FRONTEND_URL=https://docs.example.org
PRODUCTION_URL=https://docs.example.org
TRUST_PROXY=loopback
UPLOAD_DIR=/var/lib/docman/uploads
SEED_ON_DEPLOY=false
LOCAL_SELF_REGISTRATION_ENABLED=false
ENABLE_API_DOCS=false
ALLOW_DESTRUCTIVE_ADMIN_TOOLS=false
REDIS_PROVIDER=local
REDIS_URL=redis://:CHANGE_ME_URL_ENCODED_REDIS_PASSWORD@127.0.0.1:6379/0
REDIS_KEY_PREFIX=docman:ratelimit:
REDIS_CONNECT_TIMEOUT_MS=3000
REDIS_COMMAND_TIMEOUT_MS=3000
RATE_LIMIT_GENERAL=100/60s
RATE_LIMIT_LOGIN=5/15m
RATE_LIMIT_REGISTER=10/1h
RATE_LIMIT_PASSWORD_RESET=3/1h
APPROVAL_REQUIRED=true
APPROVAL_MIN_APPROVALS=1
APPROVAL_ALLOW_SELF_APPROVAL=false
AUDIT_LOG_READS=true
AUDIT_STDOUT=false
AUDIT_FAIL_CLOSED=true
VERIFY_FILE_INTEGRITY_ON_DOWNLOAD=true
```

Use the **same generated JWT secret** on the `JWT_SECRET` and `TOKEN_KEY` lines for compatibility with token helpers. Changing that secret later invalidates existing signed sessions.

The database URI deliberately authenticates to `docman`, where `docman_app` was created. The database administrator password never belongs in this application file. Use the formatter in section 1 to URL-encode the password before inserting it into the URI. This preserves characters such as `@`, `#`, spaces, and quotes without treating them as URL syntax. Enter the original password at MongoDB/Redis prompts; only connection URLs use its encoded representation.

`APPROVAL_REQUIRED=true` means a replacement version needs approval. With self-approval disabled, provision another authorized person and select appropriate document owners/approvers. If the organization explicitly chooses immediate replacement without approval, set `APPROVAL_REQUIRED=false`; that is a workflow choice, not a requirement to create projects.

`AUDIT_FAIL_CLOSED=true` makes audit persistence failures surface as failures rather than silently omitting required audit records. It does not make all application/database writes transactional; interrupted publication can require **Retry publication**. The audit chain detects inconsistencies but is not an external immutable archive.

Keep `SEED_ON_DEPLOY=false`. The existing safe seed script creates demonstration records and reports its bootstrap credentials; it is not the clean account-only setup used here. Do not run dummy-data or clear-data scripts on this deployment.

Check permissions without printing the file contents:

```bash
sudo stat -c '%U %G %a %n' /var/www/docman/backend/.env.prod
sudo -u docman test -r /var/www/docman/backend/.env.prod && echo 'Application can read settings'
sudo -u docman test -w /var/lib/docman/uploads && echo 'Application can write uploads'
```

Expect `root docman 640` and both confirmation messages. Never copy this backend file into Apache's document root.

If either confirmation message is missing, that permission test failed. Correct `.env.prod` with `sudo chown root:docman /var/www/docman/backend/.env.prod` and `sudo chmod 0640 /var/www/docman/backend/.env.prod`; correct upload ownership with the directory command in section 9.1. Recheck before continuing. Do not print the whole file to diagnose permissions.

Check for unreplaced examples without exposing their values:

```bash
sudo grep -qE 'CHANGE_ME_|docs[.]example[.]org' /var/www/docman/backend/.env.prod
placeholder_status=$?
case "$placeholder_status" in
  0) echo 'STOP: replace the remaining example values in .env.prod' ;;
  1) echo 'No example placeholders found' ;;
  *) echo 'STOP: could not check the settings file; fix the reported error' ;;
esac
```

Copy this whole check so it captures grep's result immediately. Expect `No example placeholders found`. This checks placeholders only, not whether passwords and URLs are correct. The two other messages mean stop and correct the settings or access error before continuing.

### 10.2 Frontend environment

```bash
cd /var/www/docman/frontend-vue
nano .env.production
```

Contents:

```dotenv
VITE_AUTHENTIK_ENABLED=false
```

Save and exit nano. Run `grep -x 'VITE_AUTHENTIK_ENABLED=false' /var/www/docman/frontend-vue/.env.production`: expect that exact line. If nothing prints, reopen the file and check spelling, spaces, and the path. Do not copy the backend secrets into this frontend file.

The production frontend uses same-origin `/api`, so it needs no separate API hostname. `VITE_` values are embedded in public JavaScript: **never put secrets in them**. A frontend environment change requires rebuilding; a backend environment change requires restarting its service.

## 11. Create accounts and initialize the database

### 11.1 Install an account-creation command

Use this command to create the **first superadmin**, before anyone can sign in to the website. Once signed in, superadmins can create and manage other accounts through **Users** in the navigation menu; see the browser instructions below. The bootstrap command uses the actual User model and password hashing, prompts privately, and creates no sample documents. Only Ubuntu administrators can run it.

Create `/usr/local/sbin/docman-create-user`:

```bash
sudo nano /usr/local/sbin/docman-create-user
```

Paste this entire Python program:

```python
#!/usr/bin/python3
import getpass
import json
import os
import subprocess
import sys

if os.geteuid() != 0:
    sys.exit("Run this command with sudo.")
person = {}
for key, label in [("firstname", "First name"), ("lastname", "Last name"),
                   ("email", "Email"), ("username", "Username")]:
    person[key] = input(label + ": ").strip()
    if not person[key]:
        sys.exit("All fields are required. No account created.")
person["email"] = person["email"].lower()
if "@" not in person["email"]:
    sys.exit("Enter a real email address. No account created.")
person["role"] = input("Role (superadmin/admin/editor/viewer): ").strip()
if person["role"] not in ["superadmin", "admin", "editor", "viewer"]:
    sys.exit("Invalid role. No account created.")
password = getpass.getpass("Password (18+ characters, at most 72 UTF-8 bytes): ")
if len(password) < 18 or len(password.encode("utf-8")) > 72:
    sys.exit("Password length is outside the allowed range. No account created.")
if password != getpass.getpass("Repeat password: "):
    sys.exit("Passwords do not match. No account created.")
person["password"] = password
program = r'''
import mongoose from '/var/www/docman/backend/node_modules/mongoose/index.js';
import User from '/var/www/docman/backend/src/models/User.js';
let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
  const person = JSON.parse(input);
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing');
  await mongoose.connect(process.env.MONGO_URI);
  await User.init();
  if (await User.exists({$or: [{email: person.email}, {username: person.username}]})) {
    throw new Error('That email or username already exists; nothing changed');
  }
  const user = await User.create({...person, identityProvider: 'local'});
  console.log(`Created ${user.username} with role ${user.role}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
'''
result = subprocess.run(
    ["runuser", "-u", "docman", "--", "/usr/bin/node",
     "--env-file=/var/www/docman/backend/.env.prod",
     "--input-type=module", "--eval", program],
    input=json.dumps(person), text=True, cwd="/var/www/docman/backend")
sys.exit(result.returncode)
```

Save, then:

```bash
sudo chown root:root /usr/local/sbin/docman-create-user
sudo chmod 0700 /usr/local/sbin/docman-create-user
sudo docman-create-user
```

Create the first person with role **superadmin**. Use an actual monitored email address and a unique password stored in your password manager. This is a **DocMan account**, separate from Ubuntu and MongoDB accounts.

**Expected interaction:** enter each answer and press Enter: first name, last name, email, username, `superadmin`, password, and the same password again. The last two answers are hidden. For this script, ordinary ASCII characters count as one byte each, so a password of 18–72 ASCII characters meets its length range. A successful run ends with `Created YOUR_USERNAME with role superadmin.` No password should be printed.

`chown`/`chmod` normally print nothing. A Python `SyntaxError` means the pasted program is damaged or incomplete; reopen the file and compare it with the whole block. `MONGO_URI is missing` points to section 10. `Authentication failed` points to the app database credentials from section 7. A duplicate-email/username message means no new account was created; do not delete the existing account to bypass it.

After deploying the user-management update, create the second person with role **editor** or **admin** and a third account with role **viewer** using the Users page below. If testing before browser access is configured, the bootstrap command can still provision them. Give each person their own account. Share initial credentials through your organization's approved secure channel. Do not send passwords in ordinary email. This maintenance command writes directly to the database and does not create an application audit event; record administrative provisioning in your change log.

Role guide: viewers read permitted documents; editors work with documents they are allowed to manage; admins have broader administration rights; superadmins manage system settings. Roles do not replace document-level access controls. Give ordinary external users the minimum role needed and explicitly assign document access.

Choose your own password of at least 18 characters and save it privately. This account-creation helper does not require a particular character mix. The 72-byte maximum reflects the application’s existing bcrypt password storage limit; it is not a MongoDB limit. The current Vue login page can still contain suite/legacy wording even with Authentik disabled; choose **Sign in with local DocMan account**. It does not require a Resonance account for this installation.

#### Manage accounts from the website after the first login

These instructions require the user-management update, not the older e9df951 server checkout. Deploy the backend changes and rebuilt Vue frontend together before looking for the menu.

1. Sign in as a **superadmin**. Choose **Users** in the navigation menu. Admins, editors, and viewers do not receive this menu and cannot call its management API.
2. Click **Create user**. Enter first/last name, email, username, and role. Department/job title are optional. New usernames are saved in lowercase and accept 3–50 letters, digits, dots, underscores, or hyphens.
3. Confirm outgoing email is configured and tested (section 16), and `APP_BASE_URL` is the actual HTTPS application address. Use a real reachable recipient email. Administrators no longer enter an initial password in this form.
4. Click **Create user**. Expect **Account created and invitation sent** and an **Invitation pending** row. The recipient follows the single-use link within 24 hours, sets a password, and then signs in. If delivery fails, fix mail settings and use **Resend invitation**; do not create a duplicate account. See the [complete invitation and policy guide](../account-invitations.md) for recovery and verification.
5. **Edit** changes profile details and role. **Reset password** sets a new local password for another user and invalidates their previous local access/refresh sessions. Passwords for linked SSO accounts belong in the identity provider. Use another superadmin or the existing recovery procedure if your own password needs resetting.
6. **Disable** asks for confirmation, blocks login and existing requests, and preserves the account's document/audit history. **Enable** permits fresh login; previous local sessions remain invalid. The interface does not permanently delete accounts.
7. A superadmin can demote or disable **another** superadmin (for example when someone leaves), never their own account, and never the last active superadmin: DocMan refuses with **At least one other active superadmin must remain** until another superadmin exists. Demoting or disabling signs that person out everywhere immediately. These checks hold even if two superadmins act at the same moment. Role, status, creation, and password-reset actions are audited without passwords/hashes.

Keep **System Settings → Accounts and passwords → Allow local self-registration** off (the default). The database setting replaces the old `LOCAL_SELF_REGISTRATION_ENABLED` variable. UI invitations require working outgoing email; initial CLI superadmin provisioning does not. Minimum password length is configurable from 14 to 24, default 18; passwords may be longer, up to 72 UTF-8 bytes. Verify the new user's permitted access with a separate browser profile; a role alone does not assign access to every document.

### 11.2 Create the first document category

The current Vue Categories screen lists categories but does not create them. Documents require a category, so create a real initial one before testing uploads. Change `General` and its description if your organization uses a different classification:

```bash
cd /var/www/docman/backend
sudo -u docman /usr/bin/node --env-file=.env.prod --input-type=module <<'JS'
import mongoose from 'mongoose';
import Category from './src/models/Category.js';
try {
  await mongoose.connect(process.env.MONGO_URI);
  await Category.init();
  const category = await Category.findOneAndUpdate(
    { name: 'General' },
    { $setOnInsert: { description: 'General shared documents', type: 'Document' } },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(`Document category ready: ${category.name}`);
} finally {
  await mongoose.disconnect();
}
JS
```

This is required reference data, not a sample document.

**Expected result:** `Document category ready: General` (or the name you chose), followed by your Ubuntu prompt. Repeating the same name reuses the category. A stack trace or database error is not success; fix the connection or pasted code before opening the document form. For additional categories, repeat with the intended name/description and `type: 'Document'`. As with account provisioning, record this direct maintenance action in your change log.

### 11.3 Run the compliance migration

The application must not be accepting writes while migration runs. On this new installation, it has not been started yet.

```bash
cd /var/www/docman/backend
sudo -u docman env NODE_ENV=production /usr/bin/node src/scripts/migrateComplianceFields.js --dry-run
```

**Expected:** the summary begins `[migrateComplianceFields] Dry run complete.` and its `missingFiles` count is `0`. On this new database, document/file update counts will normally be zero. `--dry-run` skips the migration’s record updates, but its database connection setup can create indexes, as observed on the NMDOH server. It is not a strictly read-only operation. A `Failed:` line, missing files, or conflicting versions means stop here and investigate.

Only after that check passes, apply the migration:

```bash
sudo -u docman env NODE_ENV=production /usr/bin/node src/scripts/migrateComplianceFields.js
```

**Expected:** `[migrateComplianceFields] Migration complete.` with `missingFiles: 0` in the JSON summary. JSON prints field names in quotes, so you may see `"missingFiles":0`. Save the non-secret summary in your installation notes. Only after it completes, verify the audit chain:

```bash
sudo -u docman env NODE_ENV=production /usr/bin/node src/scripts/verifyAuditChain.js
```

**Expected:** JSON containing `"valid":true`. The number of checked entries can vary. A failure or `"valid":false` means do not start the application yet.

Run the actual migration only after the dry run succeeds. A fresh installation should have no missing files or conflicting versions. The final command should report `"valid":true`. The migration installs uniqueness constraints, including publication-audit idempotency and version indexes. These are necessary even if the database appears to work without them.

Do not ignore a conflict or missing-file report on an existing installation. Preserve its data and investigate; do not delete duplicate records merely to make migration pass.

## 12. Build the website

```bash
cd /var/www/docman/frontend-vue
npm run build
test -f dist/index.html && echo 'Website build exists'
```

**Expected:** Vite prints a successful build summary such as `built in ...`, followed by `Website build exists`. The time and generated asset names vary. If the build reports an error, or the confirmation line is absent, stop; do not publish an old or missing build. Check the Node version, npm installation result, and the first build error.

Publish the successful build:

```bash
sudo rsync -a --delete dist/ /var/www/html/docman/public_html/
sudo chown -R root:root /var/www/html/docman/public_html
sudo find /var/www/html/docman/public_html -type d -exec chmod 0755 {} +
sudo find /var/www/html/docman/public_html -type f -exec chmod 0644 {} +
```

The `--delete` above is only for the generated **public website directory**. It must never target `/var/lib/docman/uploads`, `/var/www/docman`, or your backup directory. The build contains no uploaded documents or backend secrets.

The copy/ownership commands normally return silently. Verify the published entry file is readable by Apache:

```bash
if sudo -u www-data test -r /var/www/html/docman/public_html/index.html; then
  echo 'Published website is readable by Apache'
else
  echo 'STOP: published index.html is missing or unreadable'
fi
```

Expect the first message. On failure, check the source `dist/index.html`, copy destination, and directory/file permissions from this section.

The standalone website does not require the optional suite remote bundle. If an approved host application embeds DocMan, also run `npm run build:remote` and publish the generated `dist-remote` assets according to that host's integration instructions. Do not install the old React interface just to run the Vue website.

## 13. Configure automatic application startup

Run `sudo nano /etc/systemd/system/docman-backend.service`. Paste these contents, then save and exit:

```ini
[Unit]
Description=DocMan backend
Wants=network-online.target
After=network-online.target mongod.service redis-server.service
Requires=mongod.service redis-server.service

[Service]
Type=simple
User=docman
Group=docman
WorkingDirectory=/var/www/docman/backend
Environment=NODE_ENV=production
EnvironmentFile=/var/www/docman/backend/.env.prod
ExecStart=/usr/bin/node /var/www/docman/backend/src/server.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=60
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/docman/uploads
ReadWritePaths=/var/log/docman

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemd-analyze verify /etc/systemd/system/docman-backend.service
```

**Expected:** no diagnostics and exit status `0` (check with `echo $?` immediately). An unknown setting, missing executable, or missing dependency is a reason to fix this unit or the earlier package installation before starting it. This command checks the unit definition; it does not prove the app can connect to its database.

On the NMDOH Ubuntu server, verification returned `0` while warning that `CPUAccounting=` was removed in the unrelated `xfs_scrub_all.service` and `system-xfs_scrub.slice` units. Those specific warnings did not prevent DocMan startup. Check the named file and exit code: do not edit unrelated system units or treat errors in `docman-backend.service` as harmless.

Load and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now docman-backend
sudo systemctl status docman-backend --no-pager
sudo journalctl -u docman-backend -n 80 --no-pager
curl -i http://127.0.0.1:5001/api/docs
```

Expect `active (running)`, successful MongoDB/Redis initialization, and **HTTP 401** from the unauthenticated API request. Here 401 is correct: you reached the application, but did not sign in. There is no dedicated `/health` endpoint to use instead. A connection refusal or 500 is not success.

`daemon-reload` tells systemd to reread the file and normally prints nothing. `enable --now` may report a created symlink. In the status output, read the **Active** line; `activating (auto-restart)` or `failed` is not the expected stable `active (running)`. For a failure, use the displayed journal command and section 21's matching error. After correcting settings, run `sudo systemctl restart docman-backend` and repeat both status and the curl check. The curl response begins with a line such as `HTTP/1.1 401 Unauthorized`; it should come from the API, not be an HTML website page.

If Redis falls back to memory, fix its URL/password and restart.

The backend logs should include `Rate limiting store: local`. A line saying `using in-memory fallback` is a failure of the intended Redis setup even if the API returns 401. Never publish a successful Redis configuration checkpoint based on service status alone. A running website alone does not prove the configured rate-limit store works. Check System Settings after login too; a saved runtime provider setting can override your environment on an existing database.

## 14. Configure Apache and HTTPS

**Verify the prerequisite before configuring the website.** A fresh Ubuntu server does not necessarily have Apache installed. Earlier package lists include it, but a successful `www-data` file-read check only verifies permissions, not Apache installation. If you skipped or have not confirmed that package step, run these commands one at a time at the server's Ubuntu `$` prompt:

```bash
sudo apt update
sudo apt install -y apache2
apache2 -v
```

The update and installation must finish without errors. “Already the newest version” is also success. The version command must print `Server version: Apache/2.4...`; patch numbers may differ. If it says `command not found`, installation is not complete. Stop and resolve the package error before editing Apache configuration. Installation may start Apache with its default site; that is not the DocMan site and does not establish HTTPS access. Record installation as confirmed only after seeing the version output.

### 14.1 Choose the certificate route

Use **A** for a publicly resolvable name with inbound port 80 reachable. Use **B** if your organization supplies certificates for a private server. Both routes lead to the final Apache configuration below. Do not distribute a browser certificate-warning bypass as your deployment method.

**For the NMDOH internal server:** go directly to **14.3**, then **14.4**. Skip the public Certbot instructions. This choice concerns who issues your certificate, not a different Ubuntu installation. Finish section 13's local backend check before starting this section. If NOC has not supplied the final name/certificate process yet, local installation can be complete while this browser-access stage remains pending.

### 14.2 Route A: public certificate with Certbot

Prepare a small HTTP site solely for certificate challenges:

```bash
sudo install -d -o root -g root -m 0755 /var/www/letsencrypt/.well-known/acme-challenge
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo nano /etc/apache2/sites-available/docman.conf
```

The directory command is normally silent; `a2enmod` should report each module enabled or already enabled. “Module ... does not exist” means Apache/modules were not installed correctly. Nano opens the new site file; save and exit after pasting the next block.

Paste, replacing the hostname:

```apache
<VirtualHost *:80>
    ServerName docs.example.org
    DocumentRoot /var/www/letsencrypt
    <Directory /var/www/letsencrypt>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

```bash
sudo a2dissite 000-default
sudo a2ensite docman
sudo apache2ctl configtest
```

**Expected:** the site is enabled (or already enabled), and the check prints `Syntax OK`. If it reports a syntax error, reopen the named file, correct the indicated line, and repeat `configtest`. Do not start/reload Apache with a failing configuration.

After `Syntax OK`:

```bash
sudo systemctl enable --now apache2
sudo systemctl reload apache2
echo 'docman-certificate-check' | sudo tee /var/www/letsencrypt/.well-known/acme-challenge/check
```

**Expected:** service commands return without errors and `tee` prints `docman-certificate-check`. Check `systemctl is-active apache2`: expect `active`. If Apache will not start, use `sudo journalctl -u apache2 -n 50 --no-pager` and resolve the error before requesting a certificate.

From a computer **outside the server**, open `http://docs.example.org/.well-known/acme-challenge/check`. It must display `docman-certificate-check`. Fix DNS/firewalls first if it does not.

Install Certbot and request the certificate:

For the internal-server installation this subsection is skipped. If using the public route and `snap` is missing, install it with `sudo apt install -y snapd` first. Allow that installation to finish without errors.

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo /snap/bin/certbot certonly --webroot -w /var/www/letsencrypt \
  -d docs.example.org --email CHANGE_ME_CERTIFICATE_CONTACT_EMAIL --agree-tos
```

Do not install both apt and snap copies of Certbot. If the symlink already exists, inspect `ls -l /usr/local/bin/certbot`; do not overwrite a different installation blindly. Certificate files should now exist under `/etc/letsencrypt/live/docs.example.org/`.

**Expected:** Certbot reports a successfully received/saved certificate, its paths, and an expiry date. It may ask an optional email-sharing question; answer according to your preference. A failed domain challenge is not success: leave the challenge site in place and fix the DNS/HTTP reachability issue reported. Do not proceed to an SSL configuration referencing certificate files that were not created. The full chain and private key are separate files. Sources: [Certbot installation](https://certbot.eff.org/instructions?os=snap&ws=apache) and [webroot/renewal usage](https://eff-certbot.readthedocs.io/en/stable/using.html).

### 14.3 Route B: organization-issued certificate

**NMDOH POC hostname:** the user confirmed `docman-dev.doh.nm.gov` already has an internal DNS A record pointing to `dohr2simdocmdev`. ITSD NOC issues internal certificates. Use `docman-dev.doh.nm.gov` wherever this section and section 14.4 show `docs.example.org`, and set all three backend URL values (`APP_BASE_URL`, `FRONTEND_URL`, `PRODUCTION_URL`) to `https://docman-dev.doh.nm.gov` before browser testing. The machine’s short name is not the browser certificate name.

For a private server, obtain a certificate signed by a CA trusted by every intended user's computer. Your organization's PKI team supplies its issuance process and renewal schedule.

Ask that team for: the exact browser hostname, a PEM-format server certificate and intermediate chain, the approved root CA certificate, and the renewal contact/process. **PEM** files are text beginning `-----BEGIN CERTIFICATE-----`; a `.pfx` or binary `.cer` file is not interchangeable with that text. If they supply another format, request PEM files for Apache so you do not have to guess a conversion.

Before generating a key, run `sudo ls -l /etc/ssl/docman/privkey.pem`. On a fresh setup, `No such file or directory` is expected. If it already exists, keep that key and its corresponding CSR/certificate; do not overwrite it by repeating the next command unless you intentionally need a new key/certificate pair. Generate the key and request on the server:

```bash
sudo install -d -m 0700 /etc/ssl/docman
if sudo test -e /etc/ssl/docman/privkey.pem || sudo test -e /etc/ssl/docman/docman.csr; then
  echo 'Existing key or request found; preserve it and do not regenerate'
else
  sudo openssl req -new -newkey rsa:3072 -nodes \
  -keyout /etc/ssl/docman/privkey.pem \
  -out /etc/ssl/docman/docman.csr \
  -subj '/CN=docs.example.org' \
  -addext 'subjectAltName=DNS:docs.example.org'
fi
sudo chmod 0600 /etc/ssl/docman/privkey.pem
sudo cat /etc/ssl/docman/docman.csr
```

Replace the hostname in both places. The guard preserves any existing key/request: if only one exists, stop and locate its matching file before submission rather than overwriting it. A request awaiting NOC issuance must retain its original private key. Give the **CSR** to the PKI team; never give them the private key. The key-generation command may print a long series of dots/plus signs; that is normal. The final `cat` must display text between `-----BEGIN CERTIFICATE REQUEST-----` and `-----END CERTIFICATE REQUEST-----`. Send that complete **CSR** text through the organization's certificate request process. Do not send `/etc/ssl/docman/privkey.pem`.

When the signed PEM certificate arrives, run `sudo nano /etc/ssl/docman/fullchain.pem`. Paste the server certificate block first, then each supplied intermediate certificate block in the order given by PKI. Save and exit. Verify the name and validity dates:

```bash
sudo openssl x509 -in /etc/ssl/docman/fullchain.pem -noout -subject -issuer -dates -ext subjectAltName
```

**Expected:** readable subject/issuer/date lines and a `DNS:` entry matching the exact browser hostname. The current date must be inside the `notBefore`/`notAfter` interval. If the file cannot be read or the name/dates are wrong, stop and have PKI correct the certificate before activating the site.

Obtain the root CA through a verified organization channel. IT should distribute trust to Windows/macOS/browser clients through its managed-device tools. On this Ubuntu server, create `sudo nano /usr/local/share/ca-certificates/docman-organization-root.crt`, paste the approved root's PEM certificate block, and save. Then run:

```bash
sudo update-ca-certificates
```

Expect processing to finish with `done.` and an added-certificate count when it was newly installed (zero can mean it was already installed). Only install a root CA confirmed by your organization. Later HTTPS curl checks must succeed without `-k`.

Prepare Apache for the private certificate:

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo install -d -o root -g root -m 0755 /var/www/letsencrypt
```

Expect module-enabled/already-enabled messages and no directory-creation error. The directory is used by the shared HTTP configuration below; it does not require Certbot. **Do not enable the DocMan site yet:** create its file in section 14.4 first. Certbot is not needed for this route; arrange CA renewal and Apache reload with your PKI team.

#### Approved self-signed certificate for the NMDOH POC

ITSD NOC has approved self-signing for this internal development deployment. This replaces waiting for NOC issuance for this POC; the Security team owns firewall configuration. Reuse the key and CSR created above for `docman-dev.doh.nm.gov`. If those files are absent, complete their creation first. Do not regenerate an existing key.

On the Ubuntu server, generate the certificate once (do not overwrite a certificate already in use):

```bash
sudo openssl x509 -req \
  -in /etc/ssl/docman/docman.csr \
  -signkey /etc/ssl/docman/privkey.pem \
  -out /etc/ssl/docman/fullchain.pem \
  -days 365 -sha256 -copy_extensions copy
```

Expect `Certificate request self-signature ok` and the subject, followed by the prompt. This creates a one-year self-signed certificate and copies the CSR's hostname extension. The file name matches the prepared Apache configuration; no intermediate certificate is needed for this self-signed certificate. See the [OpenSSL x509 command reference](https://docs.openssl.org/3.0/man1/openssl-x509/).

Verify it before enabling the site:

```bash
sudo openssl x509 -in /etc/ssl/docman/fullchain.pem -noout -subject -issuer -dates -ext subjectAltName
sudo openssl x509 -in /etc/ssl/docman/fullchain.pem -noout -checkhost docman-dev.doh.nm.gov
```

Expect identical subject/issuer names, current validity dates, `DNS:docman-dev.doh.nm.gov`, and a hostname-match message. A missing/wrong SAN or a command error is a reason to stop and correct the certificate before site activation. Leave the private key mode 0600 and never transfer it to the workstation.

Self-signing does not automatically establish browser trust. Distribute only the public certificate through the approved organization process and verify its SHA-256 fingerprint against the server before trusting it on demonstration clients. Record the fingerprint with `sudo openssl x509 -in /etc/ssl/docman/fullchain.pem -noout -sha256 -fingerprint`. Browser trust setup must be completed on the workstation used for the demonstration; installing trust on Ubuntu alone does not configure Windows browsers. Do not use clicking through certificate warnings as the acceptance test.

For server-side trust, install this specific approved certificate:

```bash
sudo install -m 0644 /etc/ssl/docman/fullchain.pem /usr/local/share/ca-certificates/docman-dev-selfsigned.crt
sudo update-ca-certificates
```

Expect certificate-update messages ending in `done.`. After Apache activation in section 14.4, HTTPS curl checks must succeed without `-k`. Record the expiry and replace/retrust the self-signed certificate before it expires; Certbot does not renew this route.

#### Trust the approved self-signed certificate on the Windows demonstration workstation

Use the NMDOH Windows workstation reached through NinjaOne, under the same Windows user that will open the browser. This is not the Ubuntu SSH terminal or your personal computer outside the network.

First, on the **Ubuntu server**, stage only the public certificate for download:

```bash
sudo install -m 0644 /etc/ssl/docman/fullchain.pem /home/rbakos/docman-dev.crt
sha256sum /home/rbakos/docman-dev.crt
```

The copy normally prints nothing. Save the displayed SHA-256 file hash for comparison. This public certificate can be transferred; never transfer `privkey.pem`. For another installation, substitute the actual Ubuntu username/home path.

Open **PowerShell on the NMDOH Windows workstation** (a separate window; keep the SSH session open). Download into your Windows user profile:

```powershell
scp rbakos@dohr2simdocmdev:/home/rbakos/docman-dev.crt "$env:USERPROFILE\docman-dev.crt"
Get-FileHash -Algorithm SHA256 "$env:USERPROFILE\docman-dev.crt"
```

Use your existing SSH authentication; if prompted for a password, it is the Ubuntu login password, not a database or DocMan password. If `scp` is missing, install the Windows OpenSSH Client using section 4.1's instructions. Expect transfer completion and a SHA-256 hash matching the server's file hash (letter case does not matter). Do not compare this file hash with an OpenSSL DER certificate fingerprint; those hash different representations. Stop on a mismatch or failed transfer.

After matching the hash, import this approved certificate for the current Windows user:

```powershell
certutil -user -addstore Root "$env:USERPROFILE\docman-dev.crt"
```

Expect `CertUtil: -addstore command completed successfully.` If a trust dialog appears, confirm the certificate identity matches the one just verified before accepting it. If organizational policy denies the import, have ITSD deploy the certificate through its managed trust process; do not work around that policy. This does not modify the computer-wide store or trust on other demonstration users' computers. See [Microsoft's certutil reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/certutil).

Close and reopen the demonstration browser, then visit `https://docman-dev.doh.nm.gov`. Expect the DocMan login page without a certificate warning. If trust errors remain, verify the browser uses the intended Windows profile/trust store and have ITSD apply its browser-specific policy. A timeout is a connectivity problem, not a certificate-import failure. Complete section 15's login/document tests before declaring the demonstration ready.

### 14.4 Final Apache configuration

Run `sudo nano /etc/apache2/sites-available/docman.conf`. If the file is new, paste the following contents; if it contains the temporary HTTP site, replace those contents. Replace **all three hostname occurrences** (ServerName twice, redirect once) and **both certificate paths**.

For the NMDOH/private-certificate route, the two certificate directives must be:

```apache
SSLCertificateFile /etc/ssl/docman/fullchain.pem
SSLCertificateKeyFile /etc/ssl/docman/privkey.pem
```

Those two lines replace the `/etc/letsencrypt/live/...` directives in the complete file below; they are not a separate file. For the public route, keep the Let's Encrypt paths but replace their hostname with yours. Save and exit nano after completing all replacements. Do not create an Apache alias for the actual uploads directory.

```apache
<VirtualHost *:80>
    ServerName docs.example.org
    DocumentRoot /var/www/letsencrypt
    <Directory /var/www/letsencrypt>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^ https://docs.example.org%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName docs.example.org
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/docs.example.org/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/docs.example.org/privkey.pem
    SSLProtocol -all +TLSv1.2 +TLSv1.3

    DocumentRoot /var/www/html/docman/public_html
    ProxyRequests Off
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPass /api/ http://127.0.0.1:5001/api/ timeout=120
    ProxyPassReverse /api/ http://127.0.0.1:5001/api/
    ProxyPass /uploads/ http://127.0.0.1:5001/uploads/ timeout=120
    ProxyPassReverse /uploads/ http://127.0.0.1:5001/uploads/
    LimitRequestBody 62914560

    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set X-Frame-Options "DENY"
    Header always set Strict-Transport-Security "max-age=31536000"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"

    <Directory /var/www/html/docman/public_html>
        Options -Indexes -MultiViews
        AllowOverride None
        Require all granted
        RewriteEngine On
        RewriteCond %{REQUEST_URI} !^/(api|uploads)(/|$)
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.html [END]
    </Directory>

    <FilesMatch "^\.">
        Require all denied
    </FilesMatch>
    ErrorLog ${APACHE_LOG_DIR}/docman-error.log
    CustomLog ${APACHE_LOG_DIR}/docman-access.log combined
</VirtualHost>
```

The 60 MiB Apache request ceiling leaves room for multipart overhead around the default 50 MB application upload limit. If a superadmin raises the limit in **System Settings → Document storage**, raise `LimitRequestBody` to match (section 15.1). `/uploads/` is forwarded to application handling for supported profile images; it does **not** publicly expose stored documents.

**If waiting for an organization certificate:** you may save the complete site file now using the intended certificate paths, but leave the site disabled. The private route's HTTP document directory must exist (`sudo install -d -o root -g root -m 0755 /var/www/letsencrypt`, normally silent). After saving, check:

```bash
if [ -e /etc/apache2/sites-enabled/docman.conf ] || [ -L /etc/apache2/sites-enabled/docman.conf ]; then
  echo 'STOP: DocMan site is already enabled; investigate before restarting Apache'
else
  echo 'DocMan site is disabled while awaiting its certificate'
fi
```

Expect the disabled message. Do not enable/reload the site until the signed certificate and matching private key are installed and verified in section 14.3. An ordinary configtest does not validate a disabled site file. Keep the original CSR/key while waiting; do not generate replacement keys to work around the missing certificate.

**After the certificate files are installed and verified**, enable and validate the site (on this dedicated server):

```bash
sudo a2dissite 000-default
sudo a2ensite docman
sudo apache2ctl configtest
```

**Expected:** enabled/already-enabled site messages and `Syntax OK`. A missing certificate file, key mismatch, or unknown directive must be fixed before continuing. If the error names `docman.conf`, reopen that file; if it names a certificate path, compare it with the files created by the selected certificate route.

Only after `Syntax OK`, activate and test:

```bash
sudo systemctl enable --now apache2
sudo systemctl reload apache2
curl -I https://docs.example.org/
curl -i https://docs.example.org/api/docs
curl -I http://docs.example.org/
```

Expect `Syntax OK`, HTTPS website status 200, API status 401 without login, and HTTP redirect to HTTPS.

More specifically, the website response starts with `HTTP/1.1 200 OK` or `HTTP/2 200`; the API response starts with status `401`; and the HTTP response starts with `301` and includes a `Location: https://YOUR_HOSTNAME/...` header. Header capitalization/protocol versions can vary. A 200 response containing Apache's default welcome page is not the DocMan site: check `ServerName`, DNS, enabled sites, and `DocumentRoot`. A TLS verification error means check the name, chain, trust, and server time before testing login. Do not use curl's `-k` option to hide certificate errors. On route B, install the approved root CA first if the server itself does not yet trust it.

### 14.5 Certificate renewal

For route A, install a hook so Apache loads renewed certificates:

```bash
sudo install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-apache
```

Contents:

```bash
#!/bin/sh
set -eu
/usr/sbin/apache2ctl configtest
/usr/bin/systemctl reload apache2
```

```bash
sudo chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-apache
sudo /snap/bin/certbot renew --dry-run
sudo /etc/letsencrypt/renewal-hooks/deploy/reload-apache
sudo systemctl list-timers --all | grep -i certbot
```

The renewal test must pass.

For `certbot renew --dry-run`, expect a message that the simulated renewals succeeded. The reload hook should report `Syntax OK` and return without an error. The timer listing should contain a Certbot renewal timer and a next-run time; an empty listing means automatic renewal has not been demonstrated. A successful dry run does not change the live certificate's expiry date. Keep the HTTP challenge path reachable. Monitor expiry independently; a timer being installed is not proof its future renewals will succeed. Route B uses your organization's renewal process instead.

## 15. Check the complete document workflow

Use harmless test documents and three **separate browser profiles or different browsers** so accounts do not overwrite each other's sessions. Multiple private windows of the same browser can share one session; do not assume they isolate different users. For example, use an Edge profile for the administrator, a separate Chrome profile for the editor/approver, and Firefox for the viewer.

Create `poc-original.txt` on your workstation containing `POC version one`, and a replacement containing `POC version two`. These recognizable contents make the download check unambiguous. Before each account's checks, confirm the displayed signed-in identity belongs to that person.

1. Open `https://docs.example.org`. Confirm a trusted certificate and no browser warning.
2. Sign in as the first superadmin using the username/email option the login form requests.
3. Open System Settings. Confirm the intended Redis provider is local and that registration/destructive tools are not enabled unintentionally.
4. Create a document using an allowed small file, such as a PDF or text file. Supply its title, description, author, category, and Opens For Review date, with the appropriate review interval/period. Use the category created in section 11; the current Vue Categories page is a list, not a category-creation form.
5. Assign the intended document owner/stakeholders and approvers. You do not need a project or a team just to share the document.
6. Sign in as the second authorized person. Confirm the document appears and can be downloaded. Open the downloaded file and check its contents.
7. Upload a changed copy as a newer version. With the supplied approval settings it should await approval, not immediately replace the published download.
8. Have a **different authorized approver** approve it. Confirm the new version becomes current, the previous version remains in history, and a subsequent download contains the replacement contents.
9. Inspect revision and audit views. Confirm the upload/publication activity appears. If publication was interrupted, use the authorized **Retry publication** action and verify one successful publication event.
10. As a viewer who has not been assigned access, confirm a restricted document is absent and that its copied detail/download URL is denied. Test permitted viewer access separately after assignment.
11. Copy a download URL into a signed-out browser: it must not deliver the file. A direct guessed URL under `/uploads/` must not expose a document either.
12. Sign out, then attempt another protected action. Sign-in must be required again.
13. Reload a nested page directly; Apache should serve the Vue interface rather than a 404.

Then run:

```bash
cd /var/www/docman/backend
sudo -u docman env NODE_ENV=production node src/scripts/verifyAuditChain.js
sudo ss -lntp
sudo ufw status verbose
```

MongoDB and Redis should bind only to loopback. From another computer, confirm ports 5001, 27017, and 6379 are unreachable. On Windows, use `Test-NetConnection YOUR_SERVER_IP -Port 5001`, then repeat for the other two ports; `TcpTestSucceeded` should be false. Port 443 should succeed. Checking `ss` locally does not verify the external firewall.

If UFW was not installed because NOC manages the firewall, use NOC's firewall status plus the external connection tests; do not install/enable a second firewall just to make this command print something. A network timeout on a deliberately blocked backend/database port is expected; a timeout on HTTPS 443 is not. If an unauthorized user receives document bytes, stop the demonstration and investigate document access before uploading real material.

Reboot once in a planned test window:

```bash
sudo reboot
```

Reconnect after the machine returns and run:

```bash
systemctl is-active mongod redis-server docman-backend apache2
```

Expect four `active` lines, in the order requested. A missing/failed service is a failed reboot check; inspect its journal before continuing. Then repeat sign-in/download. This proves the site does not depend on an open terminal session.

### 15.1 Encryption at rest and upload size

DocMan can encrypt every stored document file on disk. It is **invisible to users**: there are no keys to hand out and no document passwords. People upload and download normally; the server encrypts files while they are written to disk and decrypts them only for accounts that are allowed to download them. Who can download is still decided by document assignments, roles, and the approval workflow, and every download is in the audit log.

How it works, briefly: each file gets its own random 256-bit key. That key is itself encrypted with the server's `DOCUMENT_ENCRYPTION_KEY` and stored in MongoDB (`fileprotections`). File contents are encrypted in 64 KiB chunks with AES-256-GCM as the upload streams in, so the unencrypted file is never written to disk, and downloads are decrypted chunk by chunk, so even large files use little memory. Any change to a stored file (edited, truncated, reordered, or swapped with another file) is detected and the download is blocked and audited.

#### Prepare the server encryption key once

First install the updated application and complete sections 10–14. On the Ubuntu server, run this entire block from Bash (the prompt ending in `$`, not the MongoDB shell):

```bash
sudo python3 - <<'PY'
from pathlib import Path
import re
import secrets
p = Path('/var/www/docman/backend/.env.prod')
text = p.read_text()
entries = re.findall(r'^DOCUMENT_ENCRYPTION_KEY=(.*)$', text, re.M)
if entries:
    if len(entries) != 1 or not re.fullmatch(r'[0-9a-fA-F]{64}', entries[0].strip()):
        raise SystemExit('STOP: existing document key is invalid or duplicated. Do not overwrite it; contact the application maintainer.')
    print('Existing document encryption key preserved.')
else:
    with p.open('a') as output:
        output.write('\nDOCUMENT_ENCRYPTION_KEY=' + secrets.token_hex(32) + '\n')
    print('Document encryption key added without displaying it.')
PY
sudo chown root:docman /var/www/docman/backend/.env.prod
sudo chmod 0640 /var/www/docman/backend/.env.prod
sudo systemctl restart docman-backend
systemctl is-active docman-backend
```

Expected: **Document encryption key added without displaying it.** (or **Existing document encryption key preserved.**) followed by **active**. This is a machine key, not a password anyone types. Never reuse the JWT or email settings key. If the script says **STOP**, do not replace the key: existing files depend on it. If the service is not active, run `sudo journalctl -u docman-backend -n 50 --no-pager`, find the startup error, and fix it before continuing. Do not post the contents of `.env.prod`.

Back up `.env.prod` securely using section 17 **before uploading documents**. Restoring encrypted files needs three things together: the upload files, MongoDB (including the `fileprotections` collection), and the **same** `DOCUMENT_ENCRYPTION_KEY`. Keep an independently recoverable copy of the key in the organization's approved secret store, separate from the data backups (a stolen backup should not contain the key that unlocks it). Do not email it or commit it to Git. If the key is lost or changed, encrypted files cannot be downloaded by anyone. There is no automatic key rotation yet; restore the original key from the secret store and restart. Never generate a replacement key as a troubleshooting step.

#### Turn it on and set the upload size

1. Sign in as a **superadmin** and open **System Settings → Document storage**. If the card says the server has no encryption key, the key step above did not take effect: check `.env.prod` and that the restart succeeded.
2. Turn on **Encrypt uploaded files at rest** (it is on by default once a key exists).
3. Set **Maximum upload size** in MB (1 to the server ceiling, 250 MB by default; the ceiling can be changed with `MAX_UPLOAD_MB_CEILING` in `.env.prod`). Click **Save storage settings**. Expected: **Storage settings saved.**, and the values remain after reloading the page.
4. If you raise the upload size above 50 MB, also raise Apache's request limit in section 14 so the web server does not reject the upload first. Set `LimitRequestBody` to the new size plus about 10 MB of headroom, in bytes. For example, for 200 MB: `LimitRequestBody 220200960` (210 × 1024 × 1024). Then run `sudo apachectl configtest` (expected **Syntax OK**) and `sudo systemctl reload apache2`.
5. Upload a harmless test file to a document. Expected: the version shows **Encrypted at rest**. On the server, confirm the stored file is unreadable: `sudo ls -t /var/www/docman/backend/uploads | head -1` shows the newest stored name; `sudo head -c 200 /var/www/docman/backend/uploads/<that name> | strings | head` should show no readable text from your file.
6. Download the file as an assigned user. Expected: the original file, byte for byte.
7. Sign in as an unrelated account. Expected: no access to the document or the file.
8. In **Audit Log**, filter on `file.` and confirm the upload and downloads appear.

Turning encryption off affects only new uploads; existing encrypted files stay encrypted and keep downloading normally. If an encrypted download reports an integrity failure, preserve the stored file and restore a verified backup; do not edit hashes or metadata.

Encryption at rest protects stored files, database dumps, and backups taken without the key. It does not protect a compromised running server, which must be able to decrypt files to serve downloads. The server's disks, swap, and backup storage still need infrastructure encryption (for example LUKS) as agreed with NOC/security.

## 16. Configure outgoing email in System settings

After deploying this version, sign in as a **superadmin**, open **System Settings**, and find **Outgoing email**. Regular admins cannot view, edit, or test email configuration. The shared email service uses these settings for password-reset and review emails; saving changes takes effect on subsequent sends without a restart. A send already in progress may finish using the previous settings.

Choose **SMTP** for an agency mail server or another SMTP provider, **AWS SES**, **Use existing server AWS SES settings** for the old environment configuration, or **Disabled**. Existing deployments continue using their SES environment values until a UI setting is saved. Database/configuration failures never silently fall back to another provider. SMTP requires no local Postfix installation: `npm ci` installs the mail client library. A webmail URL is not an SMTP server address.

### 16.1 Get the mail-server information first

Ask the agency mail administrator for:

- The outgoing SMTP hostname, port, and connection security (STARTTLS or direct TLS).
- Whether the application logs in with a username/password or the mail server authorizes the application's source IP. For IP authorization, IT must add the source address actually seen by the relay.
- The approved sender address and any restrictions on recipient domains.
- A public CA certificate bundle if the mail server uses an agency/private certificate authority. Do not request the mail server's private key.

Do not guess these values from the webmail sign-in page. Port 587 commonly uses STARTTLS and 465 commonly uses direct TLS, but use IT's actual values. Internal relays may use port 25. Both authenticated and IP-authorized modes support encrypted connections. Password authentication with an unencrypted connection is rejected. The explicitly selected **No encryption** option is only for an internal relay that IT requires to operate that way; it sends email contents without transport encryption.

#### NMDOH POC: known REDCap mail settings and pending confirmation

As reported by the deployment owner on **November 18, 2026**, NMDOH's REDCap server uses SMTP host **`webmail.state.nm.us`** on **port `25`**. These are a starting point for DocMan, not a verified DocMan connection or permission to relay mail.

| DocMan UI field | Candidate value / status |
| --- | --- |
| Email service | SMTP |
| SMTP server hostname or IP | `webmail.state.nm.us` (reported REDCap setting) |
| SMTP port | `25` (reported REDCap setting) |
| SMTP authentication | Unconfirmed. Select IP-authorized relay only if the mail administrator confirms no username/password is required; otherwise obtain the application credentials securely. |
| Connection security | Unconfirmed. Ask whether STARTTLS is supported/required. Port 25 alone does not establish encryption or authentication requirements. |
| Sender email address | Unconfirmed. The owner believes arbitrary sender addresses may work, but this has not been verified or approved. Obtain an approved application sender address. |
| Application server authorization | Unconfirmed for `dohr2simdocmdev`, whose website is `docman-dev.doh.nm.gov`. REDCap's authorization does not establish DocMan's authorization. |

Ask NOC/security and the mail administrators to confirm **both** of these separate requirements:

1. **Network access:** can `dohr2simdocmdev` reach `webmail.state.nm.us` on TCP port 25, and is a network access rule needed? NOC/security owns these rules; do not independently change host firewalls.
2. **Mail relay permission:** does the mail server require the application's source IP to be allowlisted, or require SMTP login? Confirm the source IP the relay actually sees, permitted sender addresses, and allowed recipient domains. Explicitly ask whether delivery to outside agencies is permitted; successful internal delivery does not prove that.

Also confirm the TLS mode and any required agency CA bundle. The working REDCap configuration can provide clues, but do not copy REDCap credentials or assume its permissions apply to this application server. No connection to this mail server or real message delivery has been verified for DocMan.

After the email-settings update is deployed, enter the confirmed values using section 16.4. Send a test to an authorized mailbox you control. **Success requires both** the UI's provider-accepted message and receipt in the mailbox (check junk/quarantine). If connection fails, investigate network access/TLS settings; if relay or sender is rejected, have the mail administrator check authorization and address restrictions. If accepted but not received, investigate downstream delivery/filtering. Record the confirmed settings and test outcome here and in HANDOFF; do not record passwords or API keys.

### 16.2 Prepare credential encryption once (only for saved passwords/API keys)

SMTP without login and AWS server credentials/IAM roles do not need a UI credential-encryption key. To store SMTP passwords or AWS API keys through the UI, configure a dedicated `EMAIL_SETTINGS_KEY` on the application server. This machine key is separate from user passwords and JWT signing keys. The database stores credentials encrypted with AES-256-GCM and bound to their destination/account settings; the key stays in the protected server environment file. Edit mail settings through the UI, not directly in MongoDB. The UI cannot reveal saved credentials.

At the server's **Bash prompt**, run this exactly once. It preserves existing environment settings, appends a new random machine key only when none exists, and never prints the key:

```bash
sudo python3 - <<'PY'
from pathlib import Path
import re, secrets
p = Path('/var/www/docman/backend/.env.prod')
if not p.is_file():
    raise SystemExit('STOP: .env.prod is missing; complete section 10 first.')
text = p.read_text()
if re.search(r'^\s*(?:export\s+)?EMAIL_SETTINGS_KEY\s*=', text, re.M):
    raise SystemExit('Key setting already exists; kept unchanged. Do not generate a replacement.')
with p.open('a') as stream:
    stream.write('\nEMAIL_SETTINGS_KEY=' + secrets.token_hex(32) + '\n')
print('Email credential encryption key added; its value was not displayed.')
PY
sudo chown root:docman /var/www/docman/backend/.env.prod
sudo chmod 0640 /var/www/docman/backend/.env.prod
sudo systemctl restart docman-backend
systemctl is-active docman-backend
```

**Expected:** the key-added message (or existing-key message on a retry), followed by `active`. `chown` and `chmod` normally print nothing. If the file is missing, stop and complete section 10. If the service is not active, inspect `sudo journalctl -u docman-backend -n 40 --no-pager` and correct the reported startup problem. Never paste environment-file contents into a support message.

Reload System Settings. The encryption-not-configured warning should disappear when you select a credential-based mode. If it remains, use `sudo nano /var/www/docman/backend/.env.prod` to check that there is exactly one active `EMAIL_SETTINGS_KEY` line with 64 hexadecimal characters and no placeholder. Do not replace an existing valid key. Save with Ctrl+O, Enter, Ctrl+X; restart the backend and reload the page.

Back up the protected environment file/key through the approved encrypted backup process and keep recovery access outside this server. Losing or replacing the key prevents decryption of saved mail credentials. Do not rotate it as part of routine password changes. To deliberately replace the key: retain the old key securely, schedule a mail interruption, install the new key, restart, then re-enter the full SMTP password or both AWS key fields and save/test. Blank password fields preserve existing ciphertext only when it can be decrypted with the current key. Restore the old key to recover old encrypted backups. There is no automatic multi-key rotation.

### 16.3 Trust an internal mail certificate, if required

Skip this subsection if the mail certificate chains to an already trusted CA. Otherwise obtain the approved public CA bundle from IT and verify it using their distribution process. Copy it to your Ubuntu home directory as `mail-ca.pem`, then run:

```bash
sudo install -d -m 0755 /etc/ssl/docman
sudo install -m 0644 ~/mail-ca.pem /etc/ssl/docman/mail-ca.pem
openssl x509 -in /etc/ssl/docman/mail-ca.pem -noout -subject -issuer -dates
sudo nano /var/www/docman/backend/.env.prod
```

**Expected:** installation commands print nothing and OpenSSL prints certificate identity/dates that match IT's information. Stop if the file is missing, invalid, expired, or unexpected. Add or update this one setting in nano:

```dotenv
NODE_EXTRA_CA_CERTS=/etc/ssl/docman/mail-ca.pem
```

Save with Ctrl+O, Enter, Ctrl+X. Run `sudo systemctl restart docman-backend`, then `systemctl is-active docman-backend`; expect `active`. Node loads this CA file when it starts. All backend processes that send mail must load the same setting. Keep certificate validation enabled; the application deliberately offers no “ignore certificate errors” option. Prefer the SMTP hostname covered by the certificate over an IP address. See [Nodemailer TLS options](https://nodemailer.com/smtp).

### 16.4 Configure SMTP and verify it

1. In **System Settings → Outgoing email**, choose **SMTP**.
2. Enter the approved sender email, optional display name, and optional reply-to address.
3. Enter IT's SMTP hostname/IP, port, and connection-security mode. The host field takes only a host, not `https://`, a path, or `:port`.
4. Choose **IP-authorized relay** or **Username and password**. For a relay, leave login credentials out; IT must authorize the source IP. For password authentication, enter the supplied SMTP username/password after completing section 16.2.
5. Click **Save email settings**. Expect “Email settings saved.” No restart is needed for UI changes. Saved password fields become blank; this is intentional. Leaving them blank preserves the saved credentials for the same server/account. Changing SMTP host, port, security mode, or username requires entering the password again. Switching provider or selecting a credential-free method removes old saved credentials.
6. Enter an email address you control in **Test recipient email address**, then click **Send test email**. Save/discard any unsaved changes first. Expect “Mail provider accepted the test email,” then confirm receipt in the inbox or junk folder. Only three tests per minute per administrator are allowed; after a rate-limit message, wait one minute.

An accepted test is submission success, not proof that downstream delivery succeeded. If the message is missing, have the mail administrator check relay logs, recipient restrictions, filtering, and quarantine. For connection failures, check host/port, IT-managed network access, TLS mode, certificate hostname, and CA trust. For authentication errors, check the username/password and whether SMTP login is enabled for this application account. For sender/recipient rejections, check relay authorization and approved sender/domain rules. Error responses intentionally omit raw credentials and mail-server responses.

A “settings changed” conflict means another administrator saved first: use **Discard changes / reload**, review the current settings, and reapply your edit. An audit failure stops an operation before it begins where possible. If the message says settings were already saved or a test was already accepted but completion auditing failed, reload/check the mailbox before retrying; these actions are not atomic with the audit database. Investigate the audit service before declaring configuration complete.

### 16.5 AWS SES alternative

For AWS SES, complete the AWS prerequisites below, then select **AWS SES** in Outgoing email. Enter sender/reply-to details and the region. Select **Server credentials / IAM role** to use AWS's credential chain, or **Store AWS access keys** after section 16.2. Enter both access-key fields when replacing keys; leave both blank to retain saved keys. Save and use the same test-email/inbox checks as section 16.4.

To retain the original deployment method, choose **Use existing server AWS SES settings** and maintain `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_REGION`, and `AWS_SES_SENDER_EMAIL` in the protected `.env.prod` file. Restart after environment changes. An IAM role can supply credentials instead of the access-key environment variables. Do not put SES SMTP credentials into API-key fields; SMTP credentials belong to the SMTP mode.

#### Prepare AWS and verify the sender

1. Obtain an organization-owned AWS account with billing. Secure its root account with MFA and use an authorized administrator identity for setup. Do not generate root access keys for DocMan.
2. Open Amazon SES in the AWS console. Choose and record one region, for example `us-east-1`; keep identity, permissions, and application settings in that region.
3. Open **Verified identities**, create a **Domain** identity for the domain you will send from, and enable Easy DKIM. Copy the provided DNS record names/types/values into that domain's DNS service exactly. A DNS provider may automatically append the domain name; check for accidentally duplicated suffixes.
4. Wait for SES to show the identity as verified and DKIM as successful. Use a sender such as `docman@example.org` within that verified domain.

The website domain and mail-sender domain can differ. Domain ownership must actually be verified; changing the sender setting alone is insufficient. See [SES identity setup](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html).

New SES accounts can be in a sandbox. In that state, ordinary recipient addresses must also be verified. For a small test, verify your test recipient; for real use, request production access in the same region, describe this application's transactional notifications/password resets, and complete AWS's review. Do not assume a submitted request is approved. See [SES sandbox and production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).

#### Create application credentials

In IAM, create a dedicated application user, such as `docman-ses`, without console sign-in. Create an IAM permissions policy using this JSON, replacing the region, AWS account ID, domain, and sender:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ses:SendEmail",
    "Resource": "arn:aws:ses:us-east-1:123456789012:identity/example.org",
    "Condition": {
      "StringEquals": {"ses:FromAddress": "docman@example.org"}
    }
  }]
}
```

Attach this policy to that user. Under its security credentials, create an access key for an application running outside AWS, following the console's current prompts. Save the access key ID and secret in your password manager; the secret is only shown at creation. These are **API credentials, not SES SMTP credentials**. Choose **Store AWS access keys** in the UI for these credentials, or **Server credentials / IAM role** to use the SDK credential chain (including environment credentials and an attached IAM role). The permission corresponds to the application's [SES SendEmail API](https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html).


Monitor provider bounces/complaints using the organization's mail operations process. For stored AWS keys, rotate by entering both new fields in the UI, saving, testing, then disabling the old AWS key. For environment keys, update the protected environment file, restart, test, then disable the old key. **Disabled** stops outgoing mail but leaves document sharing available.

### 16.6 Password-reset workflow limitations

**Current Vue limitation:** the backend has password-reset endpoints, but this Vue frontend does not yet include forgot-password/reset-password pages. Configuring email does not add those screens. Do not tell users the emailed reset link completes a self-service browser workflow on this Vue deployment. The legacy React interface has those pages, but installing a second interface is not part of this guide.

To test the backend reset delivery and completion for an account you control, run this on the server, replacing the hostname. It asks for the emailed token privately and submits the reset over HTTPS. Copy only the `token` query value from the received link; do not share the full link or token. This changes that test account's password:

```bash
python3 -c '
import getpass, json, urllib.request
base = "https://docs.example.org"
def post(path, body):
    request = urllib.request.Request(base + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        print(json.load(response).get("message", "Request completed"))
email = input("Test account email: ").strip()
post("/api/auth/forgot-password", {"email": email})
token = getpass.getpass("Token from the received email: ")
password = getpass.getpass("New password (18+ characters; include upper/lowercase, number, and @): ")
if password != getpass.getpass("Repeat new password: "):
    raise SystemExit("Passwords do not match; reset not submitted")
post("/api/auth/reset-password", {"token": token, "password": password})
'
```

Sign in with the new password and verify the old one fails.

The first request prints the generic “If an account exists...” message; pause at the hidden token prompt until the test mailbox receives the email. Successful completion prints `Password has been reset.` A Python `HTTPError` is a failed request, not a completed reset: 400 commonly indicates an invalid/expired token or a password rejected by validation; 429 means wait for the reset rate-limit window. If the token expired, request a new one rather than repeatedly submitting the old token. Do not paste tokens or new passwords into troubleshooting messages. Keep an operator-assisted account-recovery process until the Vue reset screens are implemented and tested. A password reset clears the refresh token in the current implementation; do not treat it as proof that every previously issued access token has been immediately revoked.

## 17. Set up backups and scheduled checks

Before starting this section, verify its tools:

```bash
restic version
ssh -V
mongodump --version
mongorestore --version
flock --version
```

Each command must print its version without a missing-command error. Install missing `restic`, `openssh-client`, or `util-linux` with apt as in section 4.3. If MongoDB backup tools are missing, install `mongodb-database-tools` from the MongoDB repository configured in section 7, then repeat the checks. The separate backup host still requires section 17.2's setup; installed tools alone do not establish a working backup.

A database backup alone is insufficient: file bytes live on disk. A copied uploads directory alone is insufficient: permissions, versions, and users live in MongoDB. Back up a consistent pair, the deployed commit, configuration, and recovery credentials. The method below briefly stops DocMan while taking a local snapshot, starts it again, and then transfers an encrypted backup off the server.

### 17.1 Create a read-only database backup identity

Choose a backup database password of **at least 18 characters** and save it privately. Connect as the MongoDB administrator:

```bash
mongosh --host 127.0.0.1 --username docman_db_admin --authenticationDatabase admin --password
```

Inside mongosh:

```javascript
use admin
```

Wait for `admin>` before running this separate command:

```javascript
db.createUser({user: "docman_backup", pwd: passwordPrompt(), roles: [{role: "backup", db: "admin"}]})
```

Enter the new backup password and wait for `{ ok: 1 }`. Only then run:

```javascript
exit
```

Create a root-only configuration directory and file:

```bash
sudo install -d -m 0700 /etc/docman /var/backups/docman
sudo install -m 0600 /dev/null /etc/docman/mongodump.yml
sudo nano /etc/docman/mongodump.yml
```

Contents, using the quoted configuration form of your chosen backup password from section 1:

```yaml
uri: "mongodb://docman_backup@127.0.0.1:27017/docman?authSource=admin"
password: "CHANGE_ME_BACKUP_DB_PASSWORD"
```

This credential can back up data; it is not the application credential or the root database credential.

At the initial `mongosh` login, enter the **MongoDB administrator password**. At `passwordPrompt()` inside `db.createUser`, enter the **new backup database password**. Expect `{ ok: 1 }` before typing `exit`. The configuration directory/file commands normally print nothing. Create the empty `mongodump.yml` only once; when editing existing credentials, use nano without rerunning `install /dev/null`.

After saving, run `sudo stat -c '%U %G %a %n' /etc/docman/mongodump.yml`. Expect `root root 600` and the filename. Never use `cat` on that file for a public support transcript. Keeping it in a protected file avoids exposing it in command arguments. The YAML options follow the [MongoDB Database Tools configuration format](https://www.mongodb.com/docs/database-tools/mongodump/).

### 17.2 Prepare the separate backup server

Provision another Ubuntu server using section 3 and establish administrator access as in sections 4.1–4.2. This is the **backup server**, not the DocMan server. Do not apply the DocMan package list in section 4.3 to this host; it does not need Node, MongoDB, Redis, or Apache. On the backup server, install and verify its own prerequisites, one command at a time:

```bash
sudo apt update
sudo apt install -y openssh-server nano
sudo systemctl enable --now ssh
systemctl is-active ssh
df -h /home
```

The package commands must finish without errors; the service check must print `active`. The disk report must show enough available space for the retained backups. If SSH fails, inspect `sudo journalctl -u ssh -n 50 --no-pager` and correct it before proceeding. Then create the backup account and directories:

```bash
sudo adduser docmanbackup
sudo install -d -o docmanbackup -g docmanbackup -m 0700 /home/docmanbackup/repository
sudo install -d -o docmanbackup -g docmanbackup -m 0700 /home/docmanbackup/.ssh
sudo nano /home/docmanbackup/.ssh/authorized_keys
```

`adduser` asks for that backup account's password twice, optional profile fields, and confirmation. The password belongs to the backup host account, not MongoDB. `install -d` normally prints nothing. Keep nano open while you obtain the public key in the next step using a **separate terminal connected to the DocMan server**. This prevents accidentally creating a key on the wrong machine.

Before filling that file, on the **DocMan server** generate a separate key for unattended backups:

```bash
sudo install -d -m 0700 /root/.ssh
sudo ssh-keygen -t ed25519 -f /root/.ssh/docman_backup -N '' -C docman-backup
sudo cat /root/.ssh/docman_backup.pub
```

Expect key-saved/fingerprint messages followed by one public-key line starting `ssh-ed25519`. The `-N ''` option deliberately creates this automation key without a passphrase. If asked to overwrite an existing key, answer `n` and use the existing key unless you are intentionally rotating it. After copying its public line to the backup server's nano window, save and exit before setting permissions there.

Copy only the public-key line into the backup server's `authorized_keys`. You can prefix that line with `restrict ` to disable forwarding and terminal allocation while still allowing the SFTP subsystem. On the **backup server**:

```bash
sudo chown docmanbackup:docmanbackup /home/docmanbackup/.ssh/authorized_keys
sudo chmod 0600 /home/docmanbackup/.ssh/authorized_keys
```

These commands normally print nothing. On the backup server, run `sudo stat -c '%U %G %a %n' /home/docmanbackup/.ssh /home/docmanbackup/.ssh/authorized_keys`: expect `docmanbackup docmanbackup 700` for the directory and `docmanbackup docmanbackup 600` for the file. If they differ, fix the ownership/permissions before testing SFTP.

Allow SSH to that server from the DocMan server's actual egress IP and your administrator network in its firewalls. If enabling UFW there, first allow the administrator SSH connection as in section 5; do not copy the DocMan HTTP rules unnecessarily. Keep backups on storage separate from the DocMan machine; two directories on the same disk do not protect against losing that disk.

On the **DocMan server**, edit `/root/.ssh/config` with `sudo nano` and add:

```sshconfig
Host docman-backup
    HostName CHANGE_ME_BACKUP_SERVER_IP_OR_NAME
    User docmanbackup
    IdentityFile /root/.ssh/docman_backup
    IdentitiesOnly yes
```

Save and close the config file, replacing `CHANGE_ME_BACKUP_SERVER_IP_OR_NAME` with the actual reachable backup address. Run `sudo chmod 0600 /root/.ssh/config` (normally silent). Connect once with `sudo sftp docman-backup`; success shows `Connected to ...` and the `sftp>` prompt, not a shell prompt. Verify the host fingerprint against the backup server's console, as in section 4, accept it, then enter `bye`. Do not disable host-key checking. Test unattended access:

```bash
sudo sftp -o BatchMode=yes -b /dev/null docman-backup
```

That must exit successfully without prompting. The unattended key has no passphrase, so root-only storage and restricted backup-host access matter. An administrator of the DocMan server can still use its backup credentials; for stronger deletion resistance, have the backup platform maintain protected snapshots/retention outside this account's control.

### 17.3 Initialize encrypted backup storage

Choose a backup-repository password of **at least 18 characters** and save it in your password manager outside the server. On the DocMan server, create its private password file:

```bash
sudo touch /etc/docman/restic-password
sudo chmod 0600 /etc/docman/restic-password
sudo nano /etc/docman/restic-password
```

Paste your chosen password as a single line **without adding quotes or URL encoding**, save, and exit. If this file/repository already exists, preserve its original password; do not replace it with a new one. The directory `/etc/docman` was created in section 17.1. The touch/chmod commands normally print nothing.

Initialize the new repository:

```bash
sudo restic -r sftp:docman-backup:/home/docmanbackup/repository \
  --password-file /etc/docman/restic-password init
```

**Expected:** restic reports it created a repository and warns you to keep its password. If it says the repository already exists, use its existing password and `snapshots` to inspect it; do not initialize a replacement. A new password does not unlock old backups.

Keep the repository password, backup host address, access recovery procedure, and MongoDB administrator credentials in your approved password manager outside this server. Losing the repository password makes encrypted backups unusable. Restic supports encrypted repositories over SFTP; see [repository setup](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html).

### 17.4 Install the backup script

Run `sudo nano /usr/local/sbin/docman-backup`. Paste the entire script below **into nano**, then save and exit; do not run the script body directly in your terminal:

```bash
#!/bin/bash
set -euo pipefail
umask 077
exec 9>/run/lock/docman-maintenance.lock
flock -n 9 || { echo 'Another DocMan maintenance task is running'; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
snapshot="/var/backups/docman/$stamp"
mkdir -p "$snapshot"
resume=0
cleanup() {
    result=$?
    if [ "$resume" = 1 ]; then
        if ! systemctl start docman-backend; then
            echo 'ERROR: DocMan could not be restarted' >&2
            result=1
        fi
    fi
    exit "$result"
}
trap cleanup EXIT
if systemctl is-active --quiet docman-backend; then
    resume=1
    systemctl stop docman-backend
fi
mongodump --config=/etc/docman/mongodump.yml --archive="$snapshot/database.archive.gz" --gzip
tar -C / -czf "$snapshot/uploads.tar.gz" var/lib/docman/uploads
tar -C / -czf "$snapshot/configuration.tar.gz" \
    var/www/docman/backend/.env.prod \
    var/www/docman/frontend-vue/.env.production \
    etc/systemd/system/docman-backend.service \
    etc/apache2/sites-available/docman.conf \
    etc/mongod.conf etc/redis/redis.conf etc/docman \
    usr/local/sbin/docman-create-user usr/local/sbin/docman-backup
git -c safe.directory=/var/www/docman -C /var/www/docman rev-parse HEAD > "$snapshot/commit.txt"
git -c safe.directory=/var/www/docman -C /var/www/docman bundle create "$snapshot/source.bundle" HEAD
sha256sum "$snapshot/database.archive.gz" "$snapshot/uploads.tar.gz" \
    "$snapshot/configuration.tar.gz" "$snapshot/source.bundle" > "$snapshot/SHA256SUMS"
if [ "$resume" = 1 ]; then
    systemctl start docman-backend
    resume=0
fi
restic -r sftp:docman-backup:/home/docmanbackup/repository \
    --password-file /etc/docman/restic-password backup --tag docman "$snapshot"
echo "Backup completed: $snapshot"
```

```bash
sudo chown root:root /usr/local/sbin/docman-backup
sudo chmod 0700 /usr/local/sbin/docman-backup
sudo bash -n /usr/local/sbin/docman-backup
```

**Expected:** permission commands and `bash -n` return silently. Immediately run `echo $?`: it must print `0`. If bash reports a line number or syntax error, reopen `sudo nano /usr/local/sbin/docman-backup` and correct the pasted script before running it. After the syntax check passes, run the real backup in a window when a short app interruption is acceptable:

```bash
sudo /usr/local/sbin/docman-backup
```

Wait for `Backup completed: ...`. If it errors, follow the failure instructions below and do not report a completed backup. Then check the service and remote snapshot:

```bash
sudo systemctl is-active docman-backend
sudo restic -r sftp:docman-backup:/home/docmanbackup/repository \
  --password-file /etc/docman/restic-password snapshots
```

Stop if any step fails. Check the snapshot is listed remotely.

`bash -n` should produce no output and return status 0; it checks script syntax without taking a backup. The real script should end with `Backup completed: /var/backups/docman/TIMESTAMP`. The backend check should print `active` if it was running before the backup. The restic table must contain the new snapshot, its timestamp, and tag `docman`. Copy that snapshot ID into your backup notes.

If any command fails, do not mark the backup complete. Check the error and `sudo systemctl status docman-backend --no-pager` immediately so a failed restart is not overlooked. “Another DocMan maintenance task is running” means the lock prevented overlap; wait for that task to finish. A remote upload failure can leave a local snapshot but no new remote backup; fix SFTP/repository access and rerun the backup in an appropriate window. This script assumes this server's backend is the only application writer. Stop any extra workers, other backend instances, and scheduled database writers too before using it in a more complex deployment. Local snapshot directories contain plaintext confidential data and secrets and are root-only; use encrypted server storage where required. The remote repository is encrypted by restic.

TLS private keys are intentionally not included in the application backup above. Reissue a public certificate or recover an organization certificate through its separate PKI procedure. SSH private keys should likewise have their own approved recovery procedure. The Git bundle preserves committed source even if the repository becomes unavailable; it does not preserve uncommitted code, so deploy clean commits.

### 17.5 Schedule backups

Run `sudo nano /etc/systemd/system/docman-backup.service`, paste the following, then save and exit:

```ini
[Unit]
Description=Back up DocMan database, uploads, and configuration
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/docman-backup
TimeoutStartSec=infinity
UMask=0077
```

Run `sudo nano /etc/systemd/system/docman-backup.timer`, paste the following, then save and exit:

```ini
[Unit]
Description=Daily DocMan backup

[Timer]
OnCalendar=*-*-* 02:00:00 UTC
Persistent=true
Unit=docman-backup.service

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now docman-backup.timer
sudo systemctl list-timers docman-backup.timer
sudo journalctl -u docman-backup.service -n 50 --no-pager
```

**Expected:** `list-timers` shows a row for `docman-backup.timer`, a `NEXT` date/time, and `docman-backup.service` under the unit it activates. `-- No entries --` in the journal can be normal before this service has run through systemd; the earlier direct script test does not necessarily create service journal entries.

Test the scheduled service itself once:

```bash
sudo systemctl start docman-backup.service
sudo systemctl show docman-backup.service -p Result -p ExecMainStatus
```

Expect `Result=success` and `ExecMainStatus=0`, then verify the new remote snapshot as in section 17.4. A oneshot service may show `inactive (dead)` after successful completion; unlike the backend, it is not supposed to run continuously. A failed result needs `sudo journalctl -u docman-backup.service -n 60 --no-pager`.

Daily backup implies up to a day of data loss after a disaster; shorten the interval if the organization requires less. The brief stop is a maintenance interruption. `Persistent=true` can trigger a missed backup when a machine returns after downtime. Schedule accordingly and monitor successful completion, not just timer activation.

### 17.6 Retention and storage checks

After a successful restore drill, apply your approved retention policy. For example, keep seven daily, four weekly, and twelve monthly remote snapshots:

```bash
sudo restic -r sftp:docman-backup:/home/docmanbackup/repository \
  --password-file /etc/docman/restic-password forget --tag docman \
  --group-by host,tags --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune --dry-run
```

**Expected:** a proposed keep/remove summary, with no repository mutation because `--dry-run` is present. Zero proposed removals is normal for a new backup repository. If snapshots you need are proposed for removal, stop and revise the retention policy before running the real command.

Review the proposed removals, then rerun without `--dry-run` only if that policy is approved. `--group-by host,tags` matters here because each backup uses a differently dated directory; see [restic retention grouping](https://github.com/restic/restic/blob/master/doc/060_forget.rst). Run pruning outside backup/update windows. Local dated snapshots are not automatically removed by this script; review them with `sudo du -h --max-depth=1 /var/backups/docman` and remove only explicitly selected old timestamp directories after confirming their remote backups and retention requirements. Never prune the only known-good recovery point.

For example, to remove one approved old **local** snapshot, substitute its exact timestamp, inspect the listed path, and then use the interactive removal command. It asks before removing the directory:

```bash
sudo ls -ld /var/backups/docman/CHANGE_ME_OLD_TIMESTAMP
sudo rm -rI -- /var/backups/docman/CHANGE_ME_OLD_TIMESTAMP
```

The first command must list exactly the old dated directory you intended. The second asks for confirmation before recursive removal; answer `n` if the path is wrong or you are unsure. After an intentional removal, `sudo test ! -e /var/backups/docman/CHANGE_ME_OLD_TIMESTAMP && echo 'Selected local snapshot removed'` should print its confirmation. Substitute the same exact timestamp. Absence of a removal error is not proof the corresponding remote backup exists; verify that before deletion.

Never shorten that path to `/var/backups/docman`, add a wildcard, or remove a snapshot while a backup/restore is using it. This removes the local plaintext copy only; remote retention is controlled by restic. Assign an operator to this storage review, or implement an approved automated retention policy before unattended long-term operation.

Check remote integrity periodically:

```bash
sudo restic -r sftp:docman-backup:/home/docmanbackup/repository \
  --password-file /etc/docman/restic-password check --read-data
df -h
```

**Expected:** restic completes without errors, typically ending `no errors were found`. Reading all backup data can take time; wait for it to finish. In `df -h`, monitor `Avail` and `Use%` for the filesystem holding `/var/backups/docman`; plan storage/retention before it fills. If restic reports damaged/missing data, preserve existing backups and investigate before pruning anything.

### 17.7 Schedule audit-chain verification

Run `sudo nano /etc/systemd/system/docman-audit-verify.service`, paste the following, then save and exit:

```ini
[Unit]
Description=Verify DocMan audit chain
After=mongod.service

[Service]
Type=oneshot
WorkingDirectory=/var/www/docman/backend
ExecStart=/usr/bin/flock -w 3600 /run/lock/docman-maintenance.lock /usr/sbin/runuser -u docman -- /usr/bin/node --env-file=/var/www/docman/backend/.env.prod /var/www/docman/backend/src/scripts/verifyAuditChain.js
TimeoutStartSec=infinity
UMask=0077
```

Run `sudo nano /etc/systemd/system/docman-audit-verify.timer`, paste the following, then save and exit:

```ini
[Unit]
Description=Daily DocMan audit verification

[Timer]
OnCalendar=*-*-* 04:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start docman-audit-verify.service
sudo journalctl -u docman-audit-verify.service -n 30 --no-pager
sudo systemctl enable --now docman-audit-verify.timer
```

**Expected:** the service log contains `"valid":true`; a failed/false verification is a stop condition, not a reason to edit audit hashes. Run `sudo systemctl show docman-audit-verify.service -p Result -p ExecMainStatus` and expect `Result=success` / `ExecMainStatus=0`. Run `sudo systemctl list-timers docman-audit-verify.timer` and expect a next-run time. Like backups, the verifier is a oneshot service and normally becomes inactive after completing.

Verification writes an audit event itself. The root-owned service acquires the same maintenance lock as the backup script, then runs the actual Node command as `docman`; this prevents those scheduled writes during the snapshot. A verifier waiting over an hour for that lock fails visibly. Disable the timer during manual restores/updates and avoid concurrent account provisioning or other manual database writes during backups. A failed unit requires investigation; systemd does not email an administrator automatically. Have the organization's monitoring system alert on failed units, missing recent backup snapshots, certificate expiry, disk usage, and HTTP availability.

The repository also contains a review-notification script. It is not required for document sharing, and this guide does not enable its scheduler: validate its date-selection behavior and delivery in a separate test environment before enabling it. Configuring SES does not automatically schedule that script.

## 18. Restore and test a backup

### 18.1 Restore drill rules

Perform the first drill before accepting real documents, then repeat periodically and after major changes. Use a **separate recovery VM**, not the production database. Keep the recovery site private, disable outgoing email and timers, and do not point production DNS to it during a drill. A successful backup command alone does not demonstrate recoverability.

On the recovery VM, install Ubuntu, Node, MongoDB, Redis, the `docman` service identity, and directories using the earlier sections. Configure a new MongoDB administrator and application user with their own saved passwords. Install restic. Restore backup-server SSH access using a new recovery key authorized by the backup administrator, and recover the restic password from your password manager into a root-only `/etc/docman/restic-password`. Do not run `restic init` against the existing repository.

On the recovery VM, create its password file without generating a new value:

```bash
sudo install -d -m 0700 /etc/docman
sudo touch /etc/docman/restic-password
sudo chmod 0600 /etc/docman/restic-password
sudo nano /etc/docman/restic-password
```

Paste the **original backup repository password** from your password manager as one line, save, and exit. The silent directory/permission commands do not prove the password is right; the next `restic snapshots` command must successfully unlock and list the existing repository. Complete section 17.2's root SSH config/host-fingerprint/SFTP checks on this recovery VM using its own newly authorized SSH key.

List snapshots and select the **exact ID** to restore; use a known successful backup, not an assumed latest one:

```bash
sudo restic -r sftp:docman-backup:/home/docmanbackup/repository \
  --password-file /etc/docman/restic-password snapshots
```

**Expected:** a table of saved snapshots with ID and time columns. Copy the selected snapshot ID into the restore command below. If the repository cannot be opened or the expected snapshot is absent, stop; do not create a new repository or guess an ID.

```bash
sudo install -d -m 0700 /srv/docman-restore
sudo restic -r sftp:docman-backup:/home/docmanbackup/repository \
  --password-file /etc/docman/restic-password restore CHANGE_ME_SNAPSHOT_ID --target /srv/docman-restore
```

Restic recreates the saved path under the target. Your files will be under `/srv/docman-restore/var/backups/docman/TIMESTAMP/`. Identify that directory with `sudo ls /srv/docman-restore/var/backups/docman`.

**Expected:** restic reports restoration completed with no errors, and the listing shows the selected backup's timestamp directory. Replace every `CHANGE_ME_TIMESTAMP` below with that exact directory name, for example the form `20261117T020000Z`. Do not type the example date unless it is actually your backup. “Wrong password” or “snapshot not found” means stop before any database restore.

### 18.2 Check the recovered artifacts

Open a root shell **on the recovery VM only** and replace the timestamp:

```bash
sudo -i
SNAPSHOT=/srv/docman-restore/var/backups/docman/CHANGE_ME_TIMESTAMP
cd "$SNAPSHOT"
sed 's|  .*/|  |' SHA256SUMS > SHA256SUMS.relative
sha256sum -c SHA256SUMS.relative
tar -tzf uploads.tar.gz | head
tar -tzf configuration.tar.gz
cat commit.txt
```

Expect each checksum to say `OK`.

There should be four successful checksum results: `database.archive.gz`, `uploads.tar.gz`, `configuration.tar.gz`, and `source.bundle`. `FAILED`, missing files, or a checksum parse error means do not restore these artifacts. The tar listings should show expected relative paths such as `var/lib/docman/uploads/...` and configuration paths; listing the archive does not install its contents. `commit.txt` should contain the saved Git hash. Keep this root terminal open through section 18.2; the `SNAPSHOT` variable exists only in this shell. The path adjustment is needed because the original checksum file names refer to the old server's backup directory. Inspect archive names before extracting; the guide-generated archives use known relative paths.

Get the application code from the recorded commit, either from GitHub or the recovered bundle. To recover from the bundle into an **empty** checkout:

```bash
git clone "$SNAPSHOT/source.bundle" /var/www/docman
git -C /var/www/docman checkout --detach "$(cat "$SNAPSHOT/commit.txt")"
chown -R docdeploy:docdeploy /var/www/docman
```

Replace `docdeploy` with the recovery VM's deployment account.

The clone/checkout must complete without `fatal:`. Verify `git -C /var/www/docman rev-parse HEAD` matches the hash in `commit.txt`; `chown` normally prints nothing. After `exit`, confirm your personal login with `whoami` before running npm. Also recreate the log symlink from section 9.3; it is a local deployment file and is not stored in the Git bundle. If you already cloned the repository, select that recorded commit instead; do not clone over it. Exit the root shell with `exit`, then run the normal `npm ci` commands as the deployment account.

### 18.3 Restore database and files

Only on the isolated recovery VM, ensure no backend or scheduled job is running. A new VM may not yet have those units; skip a unit command only when it is not installed:

```bash
sudo systemctl stop docman-backend
sudo systemctl stop docman-backup.timer docman-audit-verify.timer
sudo systemctl stop docman-audit-verify.service
```

For a service that is installed, `stop` normally prints nothing. Check `systemctl is-active docman-backend`: expect `inactive` before restoring. On a fresh recovery machine where the unit has not been created, `Unit ... not found` is expected only for those not-yet-installed units. Do not mistake an unrelated stop failure for permission to restore into a running app.

Use an empty `docman` database. The following restores the backed-up `docman` data and indexes, authenticating as the **recovery VM's** database administrator; `--password` prompts without putting the secret in history:

```bash
sudo mongorestore --host 127.0.0.1 --username docman_db_admin \
  --authenticationDatabase admin --password \
  --archive=/srv/docman-restore/var/backups/docman/CHANGE_ME_TIMESTAMP/database.archive.gz \
  --gzip --nsInclude='docman.*' --stopOnError
```

**Expected:** the restore summary reports **zero failed documents**. Its successful-document count should match the size of the chosen backup. If it errors or is unexpectedly empty, stop before extracting files. After it passes, restore the uploaded files:

```bash
sudo tar -C / -xzf /srv/docman-restore/var/backups/docman/CHANGE_ME_TIMESTAMP/uploads.tar.gz
sudo chown -R docman:docman /var/lib/docman/uploads
```

Run these commands individually. The database restore must finish with **zero failed documents** before extracting uploads. The restored-document count should be consistent with the chosen backup; an unexpectedly empty restore of a used installation is not success. A duplicate-key error commonly means the target was not empty. Stop and use a fresh recovery database rather than deleting records blindly. Tar extraction and ownership changes normally print nothing; check `sudo ls -la /var/lib/docman/uploads` for the expected recovered files before starting the app.

Do not add `--drop` against a live database to get past duplicate-record errors. A drill requires a fresh target. This application-scoped dump is not a substitute for recreating the MongoDB administrative/app/backup login identities on a replacement server.

Extract configuration into a **staging directory**, not directly over the recovery VM's system configuration:

```bash
sudo install -d -m 0700 /srv/docman-restore/config
sudo tar -C /srv/docman-restore/config -xzf /srv/docman-restore/var/backups/docman/CHANGE_ME_TIMESTAMP/configuration.tar.gz
```

**Expected:** silent completion. Run `sudo test -f /srv/docman-restore/config/var/www/docman/backend/.env.prod && echo 'Recovered configuration exists'`; expect that message. This file contains recovered secrets: inspect/edit it privately with `sudo nano`, never post its contents.

Use the staged `.env.prod` as a reference to recreate the backend configuration with `sudo nano`. Preserve the restored data's intended settings, but set the recovery VM's MongoDB password, Redis password, upload path, and private test hostname. Remove AWS access-key lines for the drill and keep frontend Authentik disabled. Restore file ownership `root:docman` and mode `0640`. Do not blindly copy the old MongoDB/Redis service configuration or credentials over the freshly secured services.

The exact file commands, on the **recovery VM only**, are:

```bash
sudo install -o root -g docman -m 0640 /srv/docman-restore/config/var/www/docman/backend/.env.prod /var/www/docman/backend/.env.prod
sudo nano /var/www/docman/backend/.env.prod
sudo stat -c '%U %G %a %n' /var/www/docman/backend/.env.prod
```

The first command deliberately copies the recovered settings over the recovery VM's application settings. Before starting any service, make the replacements described above in nano, save, and exit. Expect `root docman 640` from the last command. Create `.env.production` as in section 10.2 with `VITE_AUTHENTIK_ENABLED=false` for this drill. Do not run section 11's user/category bootstrap on this restored database: those records came from the backup.

Rebuild the frontend, install the systemd unit, and configure Apache with a valid certificate for the test name using sections 12–14. Use local test accounts rather than an organization's live SSO callback. Do not run a new migration merely to make a same-version restore work; first verify the exact backed-up release and indexes. For an upgrade after restoration, follow section 19 separately.

### 18.4 Prove the recovery works

Run audit verification first:

```bash
cd /var/www/docman/backend
sudo -u docman env NODE_ENV=production node src/scripts/verifyAuditChain.js
```

Confirm `"valid":true`. If verification fails, leave the recovery application stopped and investigate the restored data/commit. Only after a successful check:

```bash
sudo systemctl start docman-backend
systemctl is-active docman-backend
```

Expect `active`. Sign in, inspect permissions/history, and download representative documents, including older versions and a recently replaced file. Download integrity checking must remain enabled. Compare the recovered file contents with known originals. Repeat the restricted-user checks from section 15. Record the snapshot ID, date, restored commit, checks performed, and elapsed recovery time.

For an actual disaster recovery, use this same procedure on the replacement production server, then restore approved email/SSO settings, obtain its production TLS certificate, adjust DNS/firewalls, verify external access, and enable backup/audit timers only after testing. Check the old server is fenced off so it cannot accept writes after the replacement becomes authoritative. Keep old backups until the replacement has made and successfully tested its own backups.

## 19. Existing installations and updates

**Guided standard-layout updater:** [`update.sh` and its walkthrough](automated-updates.md) automate staged builds, an encrypted pre-update backup, migration/publication and service checks. Read its validation status, prerequisite checks and recovery procedure first. On an older server, obtain the updater in a separate tools clone; do not pull the live checkout before its old commit is recorded/backed up. Custom layouts and major platform upgrades continue to use the manual procedure below. Updater snapshots have their own documented artifact layout.

For installations created by `install.sh`, the checkout owner is the non-login `docman-build` account. Prefix this section's Git and npm commands with `sudo -u docman-build -H`; keep backup, service, environment and publication commands under your normal administrator login with sudo where shown. For example: `sudo -u docman-build -H git -C /var/www/docman status --short --branch`. Do not grant the build account sudo privileges or change protected environment-file ownership. Existing manually installed NMDOH deployments retain their established deployment account.

### 19.1 Inventory before touching an existing server

Record its actual service name, working directory, Git commit, frontend choice, database location/name, upload path, environment-file locations, Apache configuration, and scheduled writers. Inspect `systemctl cat docman-backend` and the relevant configuration privately. Existing deployments may use `backend/uploads`, a different Node path, Atlas, or old scripts; do not assume this guide's paths already apply.

For old uploads stored inside the checkout, first back up both database and files while writes are stopped. To move them outside the checkout, copy them to `/var/lib/docman/uploads`, preserve their subdirectory structure, set ownership to `docman`, configure `UPLOAD_DIR`, and verify existing stored paths resolve with the application's file-resolution code. Older records can contain absolute paths: simply moving directories does not guarantee those records remain valid. Run migration dry-run and test historical downloads before removing any old copy. Do not rewrite database paths by guesswork.

### 19.2 Safe routine update for the layout in this guide

Read the release notes and obtain the approved new commit. Test that release against a restored copy first. Tell users about the maintenance window. On production:

1. Stop timers and finish/stop other database writers.
2. Take a successful off-server backup with the current release still installed.
3. Stop the backend and keep it stopped through migration and checks.
4. Select the approved source commit, install its locked dependencies, and build the frontend.
5. Apply required migrations, verify the audit chain, publish static files, and restart.
6. Test login, permissions, upload/approval/download, and then reenable timers.

Concrete commands for this guide's installation:

```bash
sudo systemctl stop docman-backup.timer docman-audit-verify.timer
sudo systemctl stop docman-audit-verify.service
sudo systemctl status docman-backup.service --no-pager
```

If a backup service is still running, let it finish and verify success before continuing.

A completed backup oneshot can be `inactive (dead)`; that is normal. `active (running)` or `activating` means wait. `failed` means investigate the journal and take a good backup before updating. Check stopped timers with `systemctl is-active docman-backup.timer docman-audit-verify.timer`: both should be `inactive`. Do not run an update concurrently with a backup. Then:

```bash
sudo /usr/local/sbin/docman-backup
```

**Checkpoint:** expect `Backup completed: ...` and confirm the corresponding snapshot ID with section 17.4's restic command. If that fails, stop the update here. After the backup is safely available:

```bash
sudo systemctl stop docman-backend
systemctl is-active docman-backend
```

**Expected:** `inactive`. Keep it stopped until migration and frontend publication succeed. Now inspect the checkout:

```bash
cd /var/www/docman
git status --short
git rev-parse HEAD
```

**Expected:** `git status --short` prints no changed/untracked files, and `rev-parse` prints the old deployed commit. Record that hash. If status lists files, preserve and review those changes before switching code; do not discard them with a force-reset command. Then fetch and select the approved new commit:

```bash
git fetch --tags origin
git switch --detach CHANGE_ME_NEW_APPROVED_COMMIT_HASH
git rev-parse HEAD
```

**Expected:** no fetch/switch errors and the new approved hash. Then install/build, checking each command before the next:

```bash
cd /var/www/docman/backend
npm ci
cd /var/www/docman/frontend-vue
npm ci
npm run build
```

Dependency-only updates still require both installs when both lockfiles change. Rebuilding the frontend alone leaves old backend packages installed. The [November 18 dependency review](../dependency-security-review.md) records the remaining unpatched Picomatch findings; installation success does not mean the audit is clean. Do not run `npm audit fix --force` on this server. From `/var/www/docman/backend`, `npm audit --omit=dev` should report `found 0 vulnerabilities` for that reviewed dependency set; if it reports new findings or cannot reach the registry, stop and review the result before continuing. The repository-wide audit deliberately exits nonzero for the documented remaining findings and is not a clean-audit claim.

**Expected:** both npm installs finish successfully, then a successful Vite build as in section 12. If either fails, do not run migration or publish stale assets. Run migration preflight separately:

```bash
cd /var/www/docman/backend
sudo -u docman env NODE_ENV=production node src/scripts/migrateComplianceFields.js --dry-run
```

**Expected:** `Dry run complete.` with zero missing files and no conflicts. The update counts can be nonzero for an existing database. After that passes:

```bash
sudo -u docman env NODE_ENV=production node src/scripts/migrateComplianceFields.js
```

**Expected:** `Migration complete.` with no missing files or errors. Only then:

```bash
sudo -u docman env NODE_ENV=production node src/scripts/verifyAuditChain.js
```

**Expected:** `"valid":true`. If any install, build, or migration command fails, leave the service stopped and resolve or use the tested recovery procedure. Do not continue just because later commands can still run.

After all checks pass:

```bash
sudo rsync -a --delete /var/www/docman/frontend-vue/dist/ /var/www/html/docman/public_html/
sudo chown -R root:root /var/www/html/docman/public_html
sudo find /var/www/html/docman/public_html -type d -exec chmod 0755 {} +
sudo find /var/www/html/docman/public_html -type f -exec chmod 0644 {} +
sudo apache2ctl configtest
```

**Expected:** the file operations finish without errors and Apache prints `Syntax OK`. If not, leave the backend stopped and fix the reported configuration/file problem. After this checkpoint passes:

```bash
sudo systemctl daemon-reload
sudo systemctl start docman-backend
sudo systemctl reload apache2
curl -i https://docs.example.org/api/docs
```

**Expected:** service commands return without errors and the unauthenticated API returns HTTP `401`. Check `systemctl is-active docman-backend apache2` for two `active` lines. A 502, connection failure, or failed service means investigate before allowing users back in. Replace `docs.example.org` with the actual site name as in the installation steps.

Perform section 15's browser checks, then:

```bash
sudo systemctl start docman-backup.timer docman-audit-verify.timer
```

**Expected:** no error. Run `systemctl is-active docman-backup.timer docman-audit-verify.timer` and expect two `active` lines, then `sudo systemctl list-timers --all` to confirm their next runs. Record the deployed commit and the pre-update backup snapshot ID. Do not declare an update complete solely because the service starts; repeat the document permission/version/download tests.

The publication-audit fix requires its unique database index before writes resume. Update every backend process, not just one instance behind a load balancer. The migration preserves historical audit hashes; it must not be replaced with ad hoc index deletion or history cleanup.

### 19.3 Rollback and system updates

A code checkout alone is not a general rollback after a database migration. Keep the old commit and a paired pre-update database/uploads backup. If the new release fails, prefer a tested forward fix or restore the **matching code, database, and uploads snapshot** using section 18. Restoring a backup loses writes made after that backup; make that explicit in the recovery decision. Never silently combine old metadata with newer file state.

For Ubuntu security maintenance, review `sudo apt update` and `apt list --upgradable`, take a backup, schedule downtime, apply `sudo apt upgrade`, reboot when required, and rerun the health/workflow checks. Treat Node and MongoDB major-version upgrades as separate tested changes. Keep MongoDB 9.0 and Node 22 unless a separate tested upgrade is planned. Use package sources for the installed Ubuntu release.

## 20. Optional organization sign-in

The completed installation already works with local accounts; Authentik is optional infrastructure. Use an **existing organization-managed Authentik service** only when its administrator has provided a working OAuth2/OIDC provider. Building and operating that independent identity service is not a hidden prerequisite of this installation.

For integration, the provider must support a public browser client using authorization code flow with PKCE, the exact HTTPS callback URL used by DocMan, appropriate scopes/claims, and signed tokens accepted by the backend. Never embed a client secret in Vue. Obtain the exact issuer, audience/client ID, authorization endpoint, token endpoint, JWKS URL, and callback from the identity administrator; do not reuse another deployment's URLs. See [Authentik's OAuth2 provider documentation](https://docs.goauthentik.io/add-secure-apps/providers/oauth2).

Configure backend `AUTHENTIK_ISSUER`, `AUTHENTIK_AUDIENCE`, and `AUTHENTIK_JWKS_URL` (or the supported signing public key), plus frontend `VITE_AUTHENTIK_ENABLED=true`, `VITE_AUTHENTIK_CLIENT_ID`, `VITE_AUTHENTIK_AUTHORIZATION_URL`, `VITE_AUTHENTIK_TOKEN_URL`, `VITE_AUTHENTIK_REDIRECT_URI`, and `VITE_AUTHENTIK_SCOPE`. Set scope to the provider-approved `openid profile email` value. Registration is optional; do not expose an enrollment link unless the organization intends it.

For the JWKS option, open `sudo nano /var/www/docman/backend/.env.prod` and add these **new settings**, using the exact values supplied by the identity administrator:

```dotenv
AUTHENTIK_ISSUER=CHANGE_ME_EXACT_ISSUER_URL
AUTHENTIK_AUDIENCE=CHANGE_ME_CLIENT_ID
AUTHENTIK_JWKS_URL=CHANGE_ME_JWKS_URL
```

Save and exit. As your normal deployment account, open `nano /var/www/docman/frontend-vue/.env.production` and replace the original disabled setting with:

```dotenv
VITE_AUTHENTIK_ENABLED=true
VITE_AUTHENTIK_CLIENT_ID=CHANGE_ME_SAME_CLIENT_ID
VITE_AUTHENTIK_AUTHORIZATION_URL=CHANGE_ME_AUTHORIZATION_URL
VITE_AUTHENTIK_TOKEN_URL=CHANGE_ME_TOKEN_URL
VITE_AUTHENTIK_REDIRECT_URI=https://docs.example.org/auth/callback
VITE_AUTHENTIK_SCOPE="openid profile email"
```

Replace the hostname with your real HTTPS website name and have the identity administrator register that **exact** `/auth/callback` URL. These public-client values are not client secrets. If you have not been given the required values, keep local sign-in enabled as configured earlier and leave this optional section incomplete; do not guess the endpoints.

The frontend exchanges its authorization code with the provider. Add that provider's exact HTTPS origin to Apache's CSP `connect-src`, ensure the provider permits the frontend origin for the browser token exchange, rebuild the frontend, republish, and restart the backend. The standalone Apache CSP in this guide initially allows only `'self'`; enabling the button alone is insufficient.

In `sudo nano /etc/apache2/sites-available/docman.conf`, change only the `connect-src 'self';` portion of the Content-Security-Policy line to `connect-src 'self' https://YOUR_ACTUAL_IDENTITY_HOST;`, keeping the rest of the policy intact. An origin is the scheme plus hostname and optional port, without the endpoint path. Save, run `sudo apache2ctl configtest` (expect `Syntax OK`), and reload Apache only after that passes. Rebuild and publish using section 12, then run `sudo systemctl restart docman-backend` and `systemctl is-active docman-backend` (expect `active`).

**Success checkpoint:** the login page shows the organization sign-in button; clicking it reaches the expected provider, sign-in returns to your site's `/auth/callback`, and the correct account can access only its permitted documents. Also test sign-out and a denied-access case. A button appearing alone does not prove SSO works. If it fails, preserve the local recovery account and use section 21's SSO checks; do not weaken token validation or invent verified-email claims.

Validate signed-token issuer/audience, verified email behavior, account linking, assigned roles, sign-out/revocation, and denied access with test users. Do not fabricate an `email_verified=true` claim for unverified addresses to bypass checks. Keep a controlled local recovery administrator account. Refer to the [README's Authentik configuration and linking notes](../../README.md) for existing users. Treat successful local login as separate from a tested SSO deployment.

## 21. Troubleshooting

| Symptom | Check and action |
| --- | --- |
| SSH times out | Confirm IP, provider firewall, UFW, VPN, and SSH service through the console. Keep a working session while changing rules. |
| SSH host key changed | Verify through the console whether the server was intentionally rebuilt. Do not blindly remove the known host entry. |
| `sudo` denied | Your Ubuntu account needs sudo membership; resolve with the server administrator/console. This is unrelated to DocMan roles. |
| MongoDB illegal instruction | Check CPU AVX exposure and supported architecture. Changing the database password will not fix CPU incompatibility. |
| MongoDB authentication failed | Check the correct user/password and `authSource`: app user is in `docman`, administrator/backup users in `admin`. |
| MongoDB service will not start | `sudo journalctl -u mongod -n 80 --no-pager`; check YAML indentation and `/var/log/mongodb/mongod.log`. |
| Redis `NOAUTH` or fallback to memory | Check `requirepass`, REDIS_URL, runtime provider setting, and `sudo journalctl -u redis-server`. Test authenticated `PING`. |
| `npm ci` fails | Check Node version, network/package access, free disk/RAM, and lockfile consistency. Do not substitute an unreviewed `npm install` to hide a lockfile mismatch. |
| Build is killed | Check `free -h`, `df -h`, and kernel OOM messages. Increase VM memory; do not repeatedly run several builds together. |
| Service reports `EACCES` | Check environment-file group/read permission and upload-directory ownership. Do not use `chmod -R 777`. |
| Service restarts repeatedly | `sudo journalctl -u docman-backend -n 100 --no-pager`; fix missing secret, database/Redis connection, syntax, or port conflict. |
| Backend says port already in use | `sudo ss -lntp`; stop the unintended duplicate process/service. Do not run `npm run dev` beside the production backend on port 5001. |
| Apache 502 | Backend is down/unreachable. Test `curl -i http://127.0.0.1:5001/api/docs` and inspect backend logs. |
| Website loads, API fails | Check `/api/` proxy rules, HTTPS origin, backend status, and browser Network panel. Do not open port 5001 publicly as a workaround. |
| Nested page returns 404 | Check Apache rewrite module and the SPA directory rules. |
| Login returns 401 | Check the DocMan account credentials and token secret configuration. The Ubuntu/DB administrator account cannot log into DocMan. |
| Request returns 403 | Check the user's role and document owner/stakeholder/approver membership. A working login does not grant every document. |
| Request returns 429 | Rate limit reached. Wait for the configured window; check real client IP forwarding and Redis. Do not disable all limits to test repeated bad passwords. |
| Upload returns 413 | The file exceeds either the application limit (**System Settings → Document storage**, default 50 MB) or Apache's `LimitRequestBody`. The application's message names its limit; if Apache rejects first, raise `LimitRequestBody` as in section 15.1. |
| Replacement awaits approval | Expected with APPROVAL_REQUIRED=true. Use a different authorized approver with the configured threshold. |
| Publication returns 409 or remains publishing | Check active-version conflicts and logs. Use Retry publication for interrupted authorized publication; preserve existing records. |
| Download says missing/corrupt file | Verify UPLOAD_DIR, stored path, permissions, and matching backup. Do not turn off checksum verification to hide corruption. |
| Certificate request fails | Check public A/AAAA records, inbound port 80, challenge path, and any organization proxy/CAA restrictions. |
| Email does not arrive | Check SES region, verified sender, sandbox recipient restrictions, IAM key/policy, logs, and recipient quarantine. |
| SSO callback/token request fails | Check exact redirect URI, provider CORS, Apache connect-src, issuer/audience, signing key, and server clock. Rebuild after VITE changes. |
| `/api-docs` returns HTML | Disabled documentation may fall through to SPA handling depending on serving path. A 200 HTML response is not proof Swagger is enabled. |
| Backup reports permission denied | Check root's dedicated backup SSH key, remote directory ownership, known host, and noninteractive SFTP test. |
| Restic cannot decrypt | Recover the correct repository password from the password manager. Creating a new password file does not decrypt old backups. |
| Audit verification fails | Preserve logs/database/backups, stop unexplained modifications, and investigate the reported sequence. Do not rewrite hashes to make verification pass. |

Useful commands (run on the server):

```bash
sudo systemctl status docman-backend mongod redis-server apache2 --no-pager
sudo journalctl -u docman-backend -n 100 --no-pager
sudo tail -n 80 /var/log/apache2/docman-error.log
sudo systemctl --failed
sudo systemctl list-timers --all
df -h
free -h
timedatectl status
```

Before sharing logs, remove credentials, tokens, email addresses, document names, and other confidential contents as appropriate.

How to read these diagnostics: the four continuous services should each be `active (running)`; `systemctl --failed` should list no failed units; timers should have future run times; disk should have free space; and the clock should be synchronized. Logs show timestamps and messages, not a universal “pass” line. Look for the first error at the time your command failed. If a check remains unexplained, stop that stage and provide its exact command, non-secret output, OS version, and guide section to the responsible administrator/maintainer. Do not keep running later steps against an unknown state. Never share `.env.prod`, backup password files, or private keys.

## 22. Daily operation and handover checklist

### Configure file-log retention

DocMan writes date-named error logs under `/var/log/docman`; optional file debugging also writes `app.log`. Those files are not automatically bounded by the application's code. They are separate from the audit records in MongoDB. Establish retention before operational handover so logs do not fill the disk.

The example below rotates nonempty logs daily, retains 14 rotations per filename, and allows cleanup of inactive files after 90 days. Confirm that these example periods match the organization's retention policy before enabling cleanup; longer retention requires storage capacity or an approved log archive.

Install the tool if section 4.3 was not completed:

```bash
sudo apt install -y logrotate
sudo nano /etc/logrotate.d/docman
```

Paste:

```text
/var/log/docman/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    nocreate
    su docman docman
}
```

Save with Ctrl+O, Enter, and exit with Ctrl+X. The current logger opens the file for each append, so it can create its next log without a service restart. `nocreate` avoids leaving an empty file for every date-named log. Check the rule without rotating files:

```bash
sudo logrotate --debug /etc/logrotate.d/docman
```

Expect diagnostic output without errors; missing logs are allowed before any errors have occurred. Do not use `--force` just to make this check look active. Then enable the schedule:

```bash
sudo systemctl enable --now logrotate.timer
systemctl is-active logrotate.timer
```

Expect `active`. This timer also runs package-provided log rules, such as Apache's; do not replace those rules with the DocMan rule.

Because each date-named error log is a separate filename, rotation counts alone do not retire all old dates. If the example 90-day inactive-file retention is approved, open `sudo nano /etc/tmpfiles.d/docman-logs.conf` and paste:

```text
e /var/log/docman - - - 90d -
```

Save and exit. This applies age-based cleanup only to this existing log directory, not uploads or MongoDB audit records. Recent file access/modification can postpone cleanup; it is not a guarantee of deletion exactly 90 days after creation. Preview configuration without deleting files:

```bash
systemd-tmpfiles --cat-config | grep -F 'e /var/log/docman'
sudo systemctl enable --now systemd-tmpfiles-clean.timer
systemctl is-active systemd-tmpfiles-clean.timer
```

Expect the saved rule and `active`. The scheduled cleanup will delete eligible old files; preserve required archives before enabling it. For timer errors inspect `sudo journalctl -u logrotate.service -u systemd-tmpfiles-clean.service -n 50 --no-pager`. Check disk use with `df -h /` and `sudo du -sh /var/log/docman /var/log/journal`; journald has separate system-managed limits. Assign someone to monitor disk capacity and service failures. See Ubuntu's [logrotate reference](https://manpages.ubuntu.com/manpages/resolute/man8/logrotate.8.html) and [tmpfiles retention reference](https://manpages.ubuntu.com/manpages/resolute/man5/tmpfiles.d.5.html).

### Operator command reference

| Task | Command/location |
| --- | --- |
| Restart after backend settings change | `sudo systemctl restart docman-backend` |
| Check backend logs | `sudo journalctl -u docman-backend -n 100 --no-pager` |
| Create another local user | `sudo docman-create-user` |
| Back up now | Stop conflicting scheduled writers, then `sudo /usr/local/sbin/docman-backup` |
| Check audit chain | From backend directory: `sudo -u docman env NODE_ENV=production node src/scripts/verifyAuditChain.js` |
| Validate Apache before reload | `sudo apache2ctl configtest` |
| Reload Apache | `sudo systemctl reload apache2` |
| Show deployed commit | `git -C /var/www/docman rev-parse HEAD` |
| Backend secrets | `/var/www/docman/backend/.env.prod` |
| Frontend build settings | `/var/www/docman/frontend-vue/.env.production` |
| Uploaded files | `/var/lib/docman/uploads` |
| Public website only | `/var/www/html/docman/public_html` |
| Database storage (do not manually edit) | `/var/lib/mongodb` |
| Root-only local backup snapshots | `/var/backups/docman` |

### Before handing the service to users

- [ ] Exact deployed commit recorded and available for recovery.
- [ ] SSH key access and emergency console access tested.
- [ ] MongoDB/Redis authenticated and loopback-only; backend/database ports blocked externally.
- [ ] Backend secrets root-owned and not in Git or the public website directory.
- [ ] HTTPS trusted by intended external users; certificate renewal tested or assigned to PKI operations.
- [ ] Service runs as `docman`, uploads outside checkout, automatic reboot startup tested.
- [ ] Real administrator and ordinary user accounts created; no sample credentials/data used.
- [ ] Permission-denial, authenticated download, replacement, approval, history, and logout checks passed.
- [ ] Compliance migration succeeded and audit chain is valid.
- [ ] Redis is actually being used, including any database-stored provider setting.
- [ ] Email delivery and backend reset tested if offered; the missing Vue self-service reset pages and operator-assisted recovery process are documented.
- [ ] Off-server encrypted backup completed, credentials recoverable, separate-machine restore drill passed.
- [ ] Backup/audit schedules do not overlap; failure, disk, certificate, and availability alerts have an owner.
- [ ] Update, rollback, account provisioning, retention, and recovery responsibilities assigned.

This guide was written against the repository's actual configuration, models, scripts, and routes. Its Bash, Python, embedded JavaScript, JSON, relative links, and section anchors were checked; both Apache examples passed an isolated syntax check with temporary certificates. The documentation site build passed. Systemd parsing was checked, with missing target-installation services/script paths reported in the verification environment rather than installed there.

Existing application verification is recorded in [HANDOFF](../../HANDOFF.md). That earlier Linux application verification used an isolated Ubuntu 22.04 environment with MongoDB 8.0 and Redis 7. The NMDOH Ubuntu 26.04 installation has separately confirmed only the dependency/startup checks listed at the top of this guide. Neither record claims that a complete Ubuntu 26.04 LTS application deployment, certificate setup, AWS configuration, and backup-host recovery has been executed together. Run the checkpoints on the target installation and retain the results as its acceptance record.


### Activity email notifications after an update

Deploy the backend and Vue frontend together. With outgoing email tested and APP_BASE_URL set to the real HTTPS application address, open **System Settings → Activity notifications**. Delivery defaults on. Assign a synthetic document to a real test account, check its Activity page and inbox, and refresh queue counts. Pending should become Sent after a worker poll (15 seconds plus queue/provider time). Sent is provider acceptance, so check actual receipt. If Failed counts increase, correct outgoing email/connectivity and use Retry failed emails. Pausing activity email preserves pending messages and does not disable invitations or password resets. No additional cron/service is required; see the [full notification setup and acceptance checklist](../activity-notifications.md).

### Global public-sharing controls
Superadmins can use System Settings → Public document sharing:
- **Allow public document sharing**: off prevents creating or replacing public links.
- **Disable existing public links while sharing is off**: on also blocks anonymous public pages and downloads while the first switch is off. Off preserves existing links.
Both switches default to on (existing documents still remain private unless individually shared). Re-enabling global sharing restores existing links; this is a suspension, not permanent token deletion. Individual document revocation remains available regardless of global policy and permanently invalidates that link. Requests already authorized/in progress and downloaded copies cannot be recalled. Policy reads are uncached and failures deny public access. Only superadmins can read/write the global settings endpoint; authorized document editors receive policy status with their own sharing settings.
