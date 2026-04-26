---
sidebar_position: 3
---

# Cloudflare Routing

Recommended target hostnames:

| Hostname | Origin |
| --- | --- |
| `docman.resonancedesigns.dev` | Linode |
| `docman.render.resonancedesigns.dev` | Render |

For Render custom domains:

1. Add the custom domain in Render.
2. Point the Cloudflare DNS record to the Render `*.onrender.com` hostname.
3. Use DNS-only while Render verifies the domain and issues the certificate.
4. After the certificate is issued, proxying can be enabled if desired.

Cloudflare SSL/TLS mode should be:

```text
Full (strict)
```

once the origin has a valid certificate.
