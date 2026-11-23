---
sidebar_position: 3
---

# Cloudflare Routing

Recommended target hostnames:

| Hostname | Origin |
| --- | --- |
| `docman.resonancedesigns.dev` | Linode |

Point the application DNS record to the intended self-hosted origin and install a valid certificate for its hostname.

Cloudflare SSL/TLS mode should be:

```text
Full (strict)
```

once the origin has a valid certificate.
