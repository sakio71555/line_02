# Loop 136: ACME HTTP-01 method decision after approval

## Goal

Record the returned owner approval values and select HTTP-01 as the ACME method for `admin.taiyolabel.site`.

This Loop is docs-only. It does not perform DNS, Nginx, certbot, HTTPS, LINE, OpenAI, Supabase, secret injection, API, Auth, RLS, runtime, migration, or UI work.

## Scope

- Reflect approved owner values in public-launch runbooks.
- Record `admin.taiyolabel.site` as the review/admin hostname and current final hostname.
- Record that no separate final hostname is planned now.
- Select `HTTP-01` as the ACME method.
- Keep `DNS-01` as fallback if HTTP-01 fails.
- Keep `production_readiness=production_no_go`.
- Update README, dev loop, production readiness, and dev log.
- Add static integration coverage for the approval decision.

## Out of Scope

- DNS changes.
- DNS provider API calls.
- TXT record query/change.
- certbot execution or ACME challenge.
- Certificate issuance or HTTPS enablement.
- Nginx active config changes, `sites-enabled` changes, reload, or restart.
- real-domain enablement or external HTTP/HTTPS smoke.
- LINE webhook registration, LINE API calls, or LINE production sends.
- OpenAI real API calls.
- Supabase real connection, migration, RLS, or production secret injection.
- `.env` creation, mutation, or display.
- API/Auth/RLS/runtime/migration/UI changes.
- Dependency or lockfile changes.

## Approved Values

```txt
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=admin.taiyolabel.site
separate_final_hostname=no
dns_owner=Project owner / requestor
dns_change_owner=Project owner / requestor
dns_rollback_owner=Project owner / requestor
nginx_enable_approver=Project owner / requestor
certificate_approver=Project owner / requestor
acme_method_approver=Project owner / requestor
acme_method=HTTP-01
fallback_acme_method=DNS-01 if HTTP-01 fails
line_webhook_approver=Project owner / requestor
external_smoke_approver=Project owner / requestor
maintenance_window=now / approved by Project owner
final_go_no_go_owner=Project owner / requestor
supabase_staging_approver=Project owner / requestor
production_secret_injection_approver=Project owner / requestor
```

## ACME Decision

```txt
selected_method=HTTP-01
fallback_method=DNS-01 if HTTP-01 fails
certificate_target=admin.taiyolabel.site
wildcard_certificate=not_required
```

Reasons:

- `admin.taiyolabel.site` is a single subdomain, so wildcard certificate is not required.
- HTTP-01 avoids DNS TXT workflow for the preferred path.
- HTTP-01 is simpler for this review/admin hostname.

## Production Readiness

```txt
production_readiness=production_no_go
```

Reasons:

- Real-domain Nginx enable has not executed.
- certbot has not executed.
- HTTPS is not enabled.
- External smoke has not executed.
- LINE webhook is not registered.
- Supabase real connection has not executed.
- Production secret injection has not executed.
- OpenAI real API has not executed.

## Test

- Static integration test checks approved values, HTTP-01 decision, DNS-01 fallback, production No-Go, and forbidden operation boundaries.

## Next Loop Candidates

1. Loop 137: real-domain Nginx HTTP-01 bootstrap controlled smoke.
2. Loop 138: certbot HTTP-01 certificate issuance gate.
3. Loop 139: HTTPS enable and rollback rehearsal.
4. Loop 140: LINE webhook dry-run with approved HTTPS URL.
5. Loop 141: Supabase staging secret injection checklist.
