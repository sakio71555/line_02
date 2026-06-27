# Loop 141: LINE webhook production dry-run

## Goal

Confirm the production candidate LINE webhook URL path and the HTTPS reverse proxy path before changing LINE Developers Console settings.

This Loop does not register the URL in LINE Developers and does not send real LINE messages.

## Scope

- Read-only LINE webhook route inspection.
- Production candidate URL pattern confirmation.
- HTTPS API health check.
- HTTPS dummy webhook POST dry-run.
- GET and empty POST rejection check.
- VPS read-only Nginx and local service check.
- Docs, dev log, and static integration test updates.
- Commit and push.

## Out of Scope

- LINE Developers Console changes.
- LINE webhook URL registration.
- LINE production sends.
- LINE push/reply API calls.
- LINE channel secret display.
- LINE access token display.
- OpenAI real API.
- Supabase real connection or migration.
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

## Route Inspection

```txt
method=POST
route=/api/line/webhook/:webhookSecret
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
actual_webhook_secret_path_recorded=no
tenant_resolution=webhookSecret path checked against app config
signature_header=x-line-signature
signature_verification=verifyLineSignature
signature_body=raw request body
invalid_signature=401 for known path with configured channel secret
unknown_webhook_path=404
malformed_body=400 after valid signature
missing_channel_secret=line_channel_secret_not_configured
line_real_push_gate=separate flags and confirmation boundary
```

Notes:

- The actual webhook secret path value was not used or recorded.
- The dry-run used only a non-secret dummy path and recorded only status outcomes.
- Because the dummy path is unknown, the request is rejected before signature verification.

## HTTPS Dry-run Result

```txt
https_api_health=200
dummy_invalid_signature_post_status=404
dummy_get_status=404
dummy_empty_post_status=404
dummy_invalid_signature_accepted_2xx=no
dummy_invalid_signature_5xx=no
line_webhook_ready_for_registration=true
```

Interpretation:

- HTTPS reverse proxy reaches the API.
- Dummy webhook requests are not accepted as 2xx.
- Dummy webhook requests do not produce 5xx.
- `line_webhook_ready_for_registration=true` means only that this dry-run gate passed.
- LINE Developers registration still requires a separate manual gate.

## VPS Read-only Result

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

```txt
line_developers_console_change=no
line_webhook_registration=no
line_api_call=no
line_real_push=no
line_channel_secret_displayed=no
line_access_token_displayed=no
openai_real_api=no
supabase_real_connection=no
supabase_migration=no
rls_change=no
production_secret_injection=no
env_display_or_mutation=no
private_key_content_displayed=no
dns_change=no
certbot_rerun=no
nginx_config_change=no
nginx_reload_restart=no
production_readiness=production_no_go
https_ready_for_review=true
```

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

## Test

- Static integration test checks the Loop 141 task doc, LINE dry-run runbook, candidate URL pattern, dummy rejection statuses, No-Go readiness, safety boundary, and secret/token/private key exclusion.

## Next Loop Candidates

1. Loop 142: LINE webhook registration manual gate.
2. Loop 143: Supabase staging secret injection checklist.
3. Loop 144: OpenAI provider production gate.
4. Loop 145: production Go/No-Go review.
