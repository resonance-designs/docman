---
sidebar_position: 1
---

# Complete Ubuntu Server Installation

The repository contains the [complete Ubuntu installation and operations guide](https://github.com/resonance-designs/docman/blob/master/docs/deployment/ubuntu-server-installation.md).

It starts with a fresh Ubuntu Server 26.04 LTS machine and covers:

- Server provisioning, SSH, DNS, and firewalls.
- Node.js, authenticated MongoDB, Redis, and application dependencies.
- Local user creation, configuration, database migration, and frontend build.
- Apache, HTTPS certificates, systemd services, and reboot checks.
- Amazon SES email setup and end-to-end document workflow checks.
- Encrypted off-server backups, recovery drills, updates, and troubleshooting.

This is a native-services installation with local accounts. Docker and an external identity provider are not prerequisites. Uploaded files are stored outside the application checkout.

Use the guide from the same reviewed commit as the application release you deploy. The repository Markdown is the canonical document; this page links to it rather than maintaining a second copy of installation commands.
