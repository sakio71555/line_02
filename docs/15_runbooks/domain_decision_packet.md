# Real Domain Decision Packet

## Purpose

Loop 117 keeps the project in a safe planning state before real DNS, HTTPS, LINE webhook registration, or public Nginx enablement. This packet summarizes the known domain candidates and records what a human must approve later.

## Current Status

```text
production_readiness=production_no_go
canonical_hostname=unknown
production_hostname=unknown
admin_public_origin=unknown
api_public_origin=unknown
dns_provider=unknown
domain_owner=unknown
dns_rollback_owner=unknown
acme_method=unknown
certificate_names=unknown
line_webhook_public_url=unknown
auth_callback_url=unknown
```

No DNS change, DNS provider API call, HTTPS issuance, Nginx active config change, Nginx reload/restart, external HTTP/HTTPS smoke, LINE/OpenAI/Supabase real connection, or `.env` change was performed in Loop 117.

## Candidate Hostname Inventory

| candidate | classification | current evidence | decision status |
| --- | --- | --- | --- |
| `<production-host>` | placeholder for future approved host | Loop 115/116 single-host `/api/` routing shape works with placeholder templates | recommended topology target, not approved |
| `admin.taiyolabel.site` | historical separate Admin host candidate | Loop 106-108 env/template/runbook references | ownership/DNS/provider unknown |
| `api.taiyolabel.site` | historical separate API host candidate | Loop 106-108 env/template/runbook references and old LINE webhook URL shape | ownership/DNS/provider unknown |
| `amamihome.net` | official tenant/reference domain | tenant official domain and Amami Home knowledge URLs | not approved as Admin/API deployment host |
| `amami-line-crm.invalid` | dry-run placeholder | Loop 112-115 local Host-header and Nginx dry-run evidence | never use for public DNS |
| `_CHANGE_ME_` | template placeholder | repo-local Nginx examples | replace only after approval |
| `app.ajnl.net` / `api.ajnl.net` | existing other app host/certificate | VPS inventory notes existing certificate/site | do not reuse for this project |

## Recommended Topology

Recommended pending human approval:

```text
Option A: same-origin production host with /api/ path routing
```

Example shape, not a decision:

```text
Admin: https://<production-host>/
API:   https://<production-host>/api/
Health: https://<production-host>/api/health -> upstream /health
LINE webhook: https://<production-host>/api/line/webhook/<webhookSecretPath>
```

Why Option A is preferred for the next approval discussion:

- It matches the Loop 115 route shape where Admin and API share one server block.
- Browser calls can stay same-origin, reducing CORS complexity.
- A single certificate name is easier to reason about than separate Admin/API hosts.
- It keeps cookie and forwarded-header review smaller.

This is not final approval. The hostname, DNS provider, ownership, certificate names, and LINE webhook URL remain unknown.

## Alternative Topology

```text
Option B: separate Admin and API hostnames
```

Example shape from historical docs:

```text
Admin: https://admin.taiyolabel.site/
API:   https://api.taiyolabel.site/
LINE webhook: https://api.taiyolabel.site/api/line/webhook/<webhookSecretPath>
```

Risks before reuse:

- Ownership, DNS provider, DNS records, and rollback owner are unknown.
- Cross-origin browser access may require explicit CORS review.
- Certificate SAN list and LINE webhook registration would span a separate API host.

## LINE Webhook Candidate

The API route is:

```text
POST /api/line/webhook/:webhookSecret
```

The public URL candidate is:

```text
https://<production-host>/api/line/webhook/<webhookSecretPath>
```

Do not write the real webhook secret path into docs. Do not register the URL in LINE Developers until canonical hostname, HTTPS, and external smoke are approved in later Loops.

## Human Approval Inputs Needed

Before any public enablement Loop, fill the approval sheet:

- Production hostname.
- DNS provider.
- DNS account owner.
- DNS rollback owner.
- A/AAAA target.
- CAA/DNSSEC status.
- ACME method.
- Certificate names.
- Admin public origin.
- API public origin.
- LINE webhook URL.
- Auth callback URL, if Auth is enabled.
- Maintenance window.
- External smoke approver.

## Go / No-Go

Current judgment:

```text
production_no_go
```

Reasons:

- Canonical hostname is unknown.
- DNS provider and domain ownership are unknown.
- DNS records were not queried because multiple candidates exist and no canonical host is approved.
- ACME method and certificate names are unknown.
- LINE webhook public URL is unknown.
- Nginx active config, reload/restart, certbot, DNS change, and external smoke were not executed.
