# Real Domain Decision Packet

## Purpose

Loop 117 kept the project in a safe planning state before real DNS, HTTPS, LINE webhook registration, or public Nginx enablement. Loop 118 then approved `admin.taiyolabel.site` for read-only DNS confirmation only.

## Current Status

```text
production_readiness=production_no_go
canonical_hostname=admin.taiyolabel.site
production_hostname=admin.taiyolabel.site
base_domain=taiyolabel.site
hostname_role=verification / admin management hostname, not the client final URL
host_purpose=review/admin hostname
client_facing_final_hostname=undecided
expected_vps_ipv4=160.251.174.201
admin_public_origin=https://admin.taiyolabel.site
api_public_origin=https://admin.taiyolabel.site/api
dns_provider=dnsv.jp / GMO DNS inferred from NS, account owner unconfirmed
domain_owner=unknown
dns_change_owner=unknown
dns_rollback_owner=unknown
acme_method=undecided
certificate_names=unknown
line_webhook_public_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
auth_callback_url=unknown
nginx_enable_approver=unknown
certificate_approver=unknown
line_webhook_approver=unknown
external_smoke_approver=unknown
maintenance_window=unknown
final_go_no_go_owner=unknown
```

Loop 118 retry approves `admin.taiyolabel.site` / `taiyolabel.site` for read-only DNS confirmation only. This does not approve DNS changes, Nginx active config changes, HTTPS issuance, external HTTP/HTTPS smoke, LINE webhook registration, LINE/OpenAI/Supabase real connection, or `.env` changes.

## Candidate Hostname Inventory

| candidate | classification | current evidence | decision status |
| --- | --- | --- | --- |
| `<production-host>` | placeholder for future approved host | Loop 115/116 single-host `/api/` routing shape works with placeholder templates | recommended topology target, not approved |
| `admin.taiyolabel.site` | approved verification / admin management hostname | Loop 118 retry human approval for read-only DNS confirmation | DNS owner / rollback owner / provider confirmation pending |
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

This is approval for read-only DNS confirmation only. DNS owner, rollback owner, certificate names, ACME method, Nginx enablement, and LINE webhook registration remain unapproved.

## Loop 118 Read-only DNS Inventory

Summary:

```text
dns_query_executed=yes_non_txt_only
txt_query_executed=no
a_record_match=yes
a_record_expected=160.251.174.201
a_record_actual=160.251.174.201
aaaa_present=no
cname_conflict=no
caa_present=no
ds_dnssec_present=no
inferred_dns_provider=dnsv.jp / GMO DNS
```

Details are recorded in [approved_domain_dns_inventory.md](approved_domain_dns_inventory.md).

## Loop 119 Approval Owner Record

Loop 119 added the human ownership and rollback responsibility records:

- [domain_and_release_approval_record.md](domain_and_release_approval_record.md)
- [dns_nginx_rollback_owner_checklist.md](dns_nginx_rollback_owner_checklist.md)

All human owner / approver fields remain `unknown` / `pending`. `admin.taiyolabel.site` is a review/admin hostname, and the client-facing final hostname is still undecided.

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
- DNS change owner.
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
- Nginx enable approver.
- Certificate approver.
- LINE webhook approver.
- Rollback command owner.
- Final Go / No-Go owner.

## Go / No-Go

Current judgment:

```text
production_no_go
```

Reasons:

- `admin.taiyolabel.site` is approved only as a verification / admin management hostname, not the client final URL.
- Read-only DNS A record matches `160.251.174.201`, but DNS owner and rollback owner are still unknown.
- DNS provider is inferred from NS as `dnsv.jp / GMO DNS`, but account ownership is not confirmed.
- ACME method and certificate names are unknown.
- Nginx enable approver, certificate approver, LINE webhook approver, and maintenance window are unknown.
- Final Go / No-Go owner and rollback command owner are unknown.
- Client-facing final hostname is undecided.
- Nginx active config, reload/restart, certbot, DNS change, external smoke, and LINE webhook registration were not executed.
