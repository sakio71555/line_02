# Loop 129: ACME selected-method dry-run plan

## Goal

Plan how to choose between ACME HTTP-01 and DNS-01 for `admin.taiyolabel.site` before any HTTPS work.

No certbot command, ACME challenge, DNS mutation, Nginx real-domain enablement, or external smoke is executed in this Loop.

## Scope

- Record the current domain state from existing docs.
- Compare HTTP-01 and DNS-01 readiness.
- Keep `acme_method=undecided`.
- Keep production readiness as `production_no_go`.
- Add static tests that preserve the No-Go boundary.

## Out of Scope

- certbot execution.
- ACME challenge execution.
- certificate issuance.
- DNS provider API calls.
- DNS TXT/CNAME/CAA/NS changes.
- real-domain Nginx enablement.
- Nginx reload/restart.
- HTTPS enablement.
- external HTTP/HTTPS smoke.
- LINE/OpenAI/Supabase real connections.
- `.env` creation, mutation, or display.

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

Required before HTTP-01 can be selected:

- A record points to the VPS.
- Port 80 is reachable externally.
- A real-domain Nginx HTTP server block can be enabled.
- `/.well-known/acme-challenge/` can be handled safely.
- External reachability is approved.
- DNS owner, DNS rollback owner, Nginx enable approver, certificate approver, and maintenance window are confirmed.

Current HTTP-01 status:

```txt
http_01_status=no_go
real_domain_nginx_enable=not_approved
external_reachability=not_approved
nginx_enable_approver=unknown
dns_rollback_owner=unknown
maintenance_window=unknown
```

## DNS-01 Readiness

Required before DNS-01 can be selected:

- DNS provider access is confirmed.
- TXT record workflow is approved.
- DNS API token policy or manual TXT workflow is documented.
- Renewal workflow is documented.
- Secret management owner is confirmed.
- DNS rollback owner is confirmed.

Current DNS-01 status:

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
```

Reasons:

- DNS owner unknown.
- DNS rollback owner unknown.
- Nginx enable approver unknown.
- Certificate approver unknown.
- Maintenance window unknown.
- ACME method approver unknown.

## Test Content

Static tests verify:

- Loop 129 docs exist.
- `acme_method=undecided` is recorded.
- HTTP-01 and DNS-01 are both No-Go.
- DNS/certbot/Nginx reload/external smoke remain forbidden.
- `production_no_go` remains present.

## Next

- Loop 134: owner approval values intake.
- Loop 135: ACME method decision after owner approval.
