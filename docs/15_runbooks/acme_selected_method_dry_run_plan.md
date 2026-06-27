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
DNS owner=Project owner / requestor
DNS change owner=Project owner / requestor
DNS rollback owner=Project owner / requestor
ACME method=HTTP-01
Fallback ACME method=DNS-01 if HTTP-01 fails or operational blockers appear
Certificate target hostname=admin.taiyolabel.site
Wildcard certificate=not required
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
http_01_status=selected_for_future_gate
nginx_enable_approver=Project owner / requestor
dns_rollback_owner=Project owner / requestor
maintenance_window=now / approved by Project owner
external_smoke_approver=Project owner / requestor
real_domain_enable_approver=Project owner / requestor
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
dns_01_status=fallback_only
dns_owner=Project owner / requestor
dns_provider_access=not_used_for_HTTP_01
dns_rollback_owner=Project owner / requestor
dns_api_token_policy=not_used_for_HTTP_01
manual_renewal_policy=not_used_for_HTTP_01
txt_record_change_approval=only_if_DNS_01_fallback_is_approved_later
```

## Decision

```txt
acme_method=HTTP-01
recommended_method=HTTP-01
fallback_method=DNS-01 if HTTP-01 fails or operational blockers appear
certificate_target=admin.taiyolabel.site
wildcard_certificate=not_required
```

Reason:

- Single subdomain `admin.taiyolabel.site` does not require a wildcard certificate.
- DNS TXT record addition is not required for the preferred path.
- The setup is simpler for this review/admin hostname.
- HTTP-01 is suitable for confirming HTTPS on the review/admin environment.

HTTP-01 Go conditions:

- A record points to the VPS.
- Port 80 is reachable.
- Real-domain HTTP Nginx server block can be enabled.
- `/.well-known/acme-challenge/` route is available.
- Nginx enable approver is confirmed.
- Certificate approver is confirmed.
- Maintenance window is approved.
- Rollback owner is confirmed.
- External smoke approver is confirmed.

DNS-01 fallback conditions:

- HTTP-01 challenge fails.
- Port 80 cannot be used.
- Wildcard certificate becomes required.
- Nginx public enable must be delayed.
- DNS TXT workflow is approved.
- DNS API or manual TXT owner is confirmed.

## Forbidden Until Separate Execution Loop

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
acme_method_decision_status=recorded
http_01_execution_status=not_executed
dns_01_fallback_status=documented
production_readiness=production_no_go
```

## Next

Proceed to a separate real-domain HTTP-01 bootstrap controlled smoke Loop only after the execution gate is rechecked. This document does not execute certbot, Nginx reload/restart, HTTPS enablement, external smoke, LINE webhook registration, or Supabase connection.

## Loop 137-139 Execution Update

HTTP-01 was executed successfully after owner approval.

```txt
acme_method=HTTP-01
certbot_http01_executed=yes
certbot_http01_result=success
certificate_path=/etc/letsencrypt/live/admin.taiyolabel.site/fullchain.pem
certificate_subject=CN=admin.taiyolabel.site
certificate_issuer=Let's Encrypt YE1
certificate_not_before=Jun 27 03:56:29 2026 GMT
certificate_not_after=Sep 25 03:56:28 2026 GMT
https_ready_for_review=true
production_readiness=production_no_go
Project owner email configured; value not recorded
```

DNS-01 remains the documented fallback only. It was not executed.

Remaining No-Go reasons:

- LINE webhook is not registered.
- LINE real push is not approved.
- Supabase real connection has not executed.
- OpenAI real API has not executed.
- Production secret injection has not executed.
