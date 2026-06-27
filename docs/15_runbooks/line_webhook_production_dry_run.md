# LINE Webhook Production Dry-run

## Purpose

Record the Loop 141 dry-run for the production candidate LINE webhook URL before any LINE Developers Console registration.

This runbook confirms route shape and rejection behavior only. It does not register a webhook URL and does not send LINE messages.

## Candidate URL Pattern

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
actual_webhook_secret_path_recorded=no
line_webhook_registration=not_done
line_api_call=not_done
```

Do not record the real webhook secret path in docs, tests, commits, or reports.

## Route Boundary

Read-only repo inspection confirms:

```txt
method=POST
route=/api/line/webhook/:webhookSecret
unknown_webhook_path=404
signature_header=x-line-signature
signature_verification=verifyLineSignature
signature_body=raw request body
invalid_signature=401 for known path with configured channel secret
parser=parseLineWebhookPayload
malformed_body=400 after valid signature
tenant_id_source=webhookSecret path resolved by app config
```

The actual webhook secret path value was not used. The dry-run used only a non-secret dummy path, and the status result was recorded without storing the dummy path itself.

## HTTPS API Health

```txt
https_api_health=200
```

This confirms the HTTPS reverse proxy can reach the API health route.

## Dummy Webhook Dry-run

```txt
dummy_invalid_signature_post_status=404
dummy_get_status=404
dummy_empty_post_status=404
dummy_invalid_signature_accepted_2xx=no
dummy_invalid_signature_5xx=no
```

Interpretation:

- Dummy invalid-signature POST was rejected safely.
- GET was rejected safely.
- Empty POST was rejected safely.
- No dummy request returned 2xx.
- No dummy request returned 5xx.
- The dummy path is intentionally unknown, so this verifies safe rejection and proxy reachability without using the real webhook secret path.

## Registration Readiness

```txt
line_webhook_ready_for_registration=true
line_webhook_registration=not_done
```

`line_webhook_ready_for_registration=true` means:

- HTTPS API health returned 200.
- Dummy invalid-signature POST returned a safe non-2xx / non-5xx status.
- Dummy GET and empty POST returned safe non-2xx / non-5xx statuses.

It does not mean the system is production-ready.

## VPS Read-only Review

```txt
vps_host=vm-227d8253-eb
nginx_test=success
public_nginx_listeners=80,443
local_app_listeners=127.0.0.1:3002,127.0.0.1:8788
sites_enabled=present
api_direct_health=200
admin_direct_login=200
nginx_reload_restart=no
```

## Safety Boundary

Not performed in Loop 141:

- LINE Developers Console changes.
- LINE webhook URL registration.
- LINE API calls.
- LINE production sends.
- LINE channel secret display.
- LINE channel access token display.
- OpenAI real API.
- Supabase real connection.
- Supabase migration.
- RLS changes.
- Production secret injection.
- `.env` display or mutation.
- Private key display.
- DNS changes.
- certbot execution or certificate renewal.
- Nginx config changes.
- Nginx reload or restart.
- Firewall changes.
- API/Auth/RLS/runtime/migration/UI changes.
- production Go decision.

## Production Readiness

```txt
production_readiness=production_no_go
https_ready_for_review=true
line_webhook_ready_for_registration=true
line_webhook_registration=not_done
```

No-Go reasons:

- LINE webhook is not registered.
- LINE real push is not approved.
- Supabase real connection has not executed.
- OpenAI real API has not executed.
- Production secret injection has not executed.

## Next

Proceed only through the next explicit Loop gate:

1. Loop 142: LINE webhook registration manual gate.
2. Loop 143: Supabase staging secret injection checklist.
3. Loop 144: OpenAI provider production gate.
4. Loop 145: production Go/No-Go review.
