# ACME Selected-Method Dry-Run Plan

## Purpose

This runbook prepares the decision between ACME HTTP-01 and DNS-01 for `admin.taiyolabel.site`.

It does not run certbot, start an ACME challenge, mutate DNS, enable HTTPS, reload Nginx, or perform external smoke.

## Current Domain State

```txt
approved_review_admin_host=admin.taiyolabel.site
base_domain=taiyolabel.site
A=160.251.174.201
AAAA=no answer
CAA=no answer
NS=dnsv.jp / GMO DNS inferred
DNS owner=unknown
DNS rollback owner=unknown
ACME method=undecided
production_readiness=production_no_go
```

## HTTP-01 Readiness

HTTP-01 requires:

- `admin.taiyolabel.site` A record continues pointing to `160.251.174.201`.
- Port 80 is externally reachable.
- A real-domain HTTP Nginx server block is approved and can serve `/.well-known/acme-challenge/`.
- Nginx candidate backup and rollback commands are reviewed.
- External smoke is approved.
- DNS owner, DNS rollback owner, Nginx enable approver, certificate approver, maintenance window, and final Go/No-Go owner are confirmed.

Current status:

```txt
http_01_status=no_go
nginx_enable_approver=unknown
dns_rollback_owner=unknown
maintenance_window=unknown
external_smoke=not_approved
real_domain_enable=not_approved
```

## DNS-01 Readiness

DNS-01 requires:

- DNS provider account access is confirmed.
- TXT record workflow is approved.
- DNS API token or manual TXT workflow is selected.
- Renewal workflow is documented.
- DNS secret handling is approved.
- DNS rollback owner and rollback evidence owner are confirmed.

Current status:

```txt
dns_01_status=no_go
dns_owner=unknown
dns_provider_access=unconfirmed
dns_rollback_owner=unknown
dns_api_token_policy=undecided
manual_renewal_policy=undecided
txt_record_change_approval=not_approved
```

## Decision

```txt
acme_method=undecided
recommended_method=undecided
```

Reason:

- DNS owner unknown.
- DNS rollback owner unknown.
- Nginx enable approver unknown.
- Certificate approver unknown.
- ACME method approver unknown.
- Maintenance window unknown.

## Forbidden Until Approval

- DNS changes.
- DNS provider API calls.
- TXT record query/change for ACME.
- CAA changes.
- certbot execution.
- ACME challenge execution.
- certificate issuance.
- HTTPS enablement.
- real-domain Nginx enablement.
- Nginx reload/restart.
- external HTTP/HTTPS smoke.
- LINE webhook registration.
- LINE/OpenAI/Supabase real connections.
- `.env` display or mutation.

## Go / No-Go

```txt
acme_dry_run_status=no_go
production_readiness=production_no_go
```

## Next

Collect owner approvals first. Then decide between HTTP-01 and DNS-01 in a separate Loop.
