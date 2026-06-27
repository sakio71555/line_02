# LINE Webhook Production URL Dry-Run Checklist

## Purpose

Prepare the future LINE webhook production URL checklist without touching LINE Developers settings.

## Existing Route

Read-only repo inspection confirms:

```txt
method=POST
route=/api/line/webhook/:webhookSecret
unknown_webhook_path=404
missing_channel_secret=line_channel_secret_not_configured
signature_header=x-line-signature
signature_verification=verifyLineSignature
signature_body=raw request body
invalid_signature=401
parser=parseLineWebhookPayload
malformed_body=400
tenant_id_source=webhookSecret path resolved by app config
```

## Candidate URL

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
candidate_url_status=approved_for_future_dry_run_planning_not_registered
line_webhook_approver=Project owner / requestor
```

This candidate URL is a planning value only.

## Real Push Gate

Real LINE push remains gated by:

- `LINE_MESSAGING_ENABLED=true`.
- `LINE_REAL_PUSH_ENABLED=true`.
- authenticated staff runtime.
- selected tenant validation.
- customer tenant match.
- explicit confirmation value.
- idempotency key.

Current status:

```txt
line_real_push_status=disabled
line_webhook_registration=not_done
line_api_call=not_done
line_channel_secret_injected=no
production_readiness=production_no_go
```

## Required Before Registration

- HTTPS enabled and reviewed.
- External HTTPS smoke completed and reviewed.
- LINE webhook approver recorded.
- LINE channel secret injected through approved secret handling.
- Webhook secret path confirmed.
- Signature verification smoke with safe fixture or approved LINE test.
- Rollback plan for LINE Developers setting.
- Final Go / No-Go owner recorded.

## Forbidden Now

- LINE Developers Console changes.
- Webhook URL registration.
- LINE API calls.
- LINE production sends.
- LINE channel secret display.
- LINE channel access token display.
- Real-domain Nginx enablement.
- certbot / HTTPS.
- external smoke.
- `.env` display or mutation.

## Go / No-Go

```txt
line_webhook_production_url_status=dry_run_ready_not_registered
line_webhook_approver=Project owner / requestor
line_webhook_registration=not_done
line_webhook_ready_for_registration=true
production_readiness=production_no_go
```

Reasons:

- Candidate URL pattern has passed the Loop 141 dummy dry-run gate.
- LINE Developers Console registration has not been performed.
- LINE channel secret handling has not been completed for production registration.
- LINE real push remains disabled.

## Loop 137-139 HTTPS Update

The candidate HTTPS origin is now reachable for review, but LINE registration remains No-Go.

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
https_ready_for_review=true
LINE webhook is not registered
line_webhook_registration=not_done
line_api_call=not_done
production_readiness=production_no_go
```

Do not put the real webhook secret path in docs. Do not register the URL in LINE Developers until the dedicated LINE dry-run Loop is approved.

## Loop 140 HTTPS Review Update

The review/admin URL is HTTPS-reachable, but LINE registration remains No-Go.

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
https_ready_for_review=true
https_api_health=200
LINE webhook is not registered
line_webhook_registration=not_done
line_api_call=not_done
production_readiness=production_no_go
```

## Loop 141 Production Dry-run Update

The candidate HTTPS webhook route was checked without using or recording the real webhook secret path.

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
actual_webhook_secret_path_recorded=no
https_api_health=200
dummy_invalid_signature_post_status=404
dummy_get_status=404
dummy_empty_post_status=404
dummy_invalid_signature_accepted_2xx=no
dummy_invalid_signature_5xx=no
line_webhook_ready_for_registration=true
LINE webhook is not registered
line_webhook_registration=not_done
line_api_call=not_done
line_real_push_status=disabled
production_readiness=production_no_go
```

`line_webhook_ready_for_registration=true` only means the dummy dry-run gate passed. Registration in LINE Developers Console remains a separate manual gate.

## Loop 142 Manual Registration Gate

The dedicated manual gate is documented in [line_webhook_registration_manual_gate.md](line_webhook_registration_manual_gate.md).

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
actual_webhook_secret_path_recorded=no
webhook_secret_path_real_value_managed_outside_docs=true
line_webhook_registration=manual_only_not_done_by_codex
line_developers_console_change_by_codex=no
line_webhook_registration_by_codex=no
line_webhook_usage_toggle_by_codex=no
line_api_call=no
line_real_push=no
production_readiness=production_no_go
```

Manual operator steps:

1. Open LINE Developers Console.
2. Select the target Provider and Messaging API Channel.
3. Open Messaging API settings.
4. Register the candidate URL pattern in the Webhook URL field.
5. Turn Webhook usage ON.
6. Press Verify if needed.
7. Check existing response, greeting, and auto-response settings.
8. Do not perform real LINE send testing until a separate approval Loop.

## Loop 143 Runtime Secret Injection No-Go

LINE runtime secrets were entered outside Codex and confirmed by redacted key names only. The API service drop-in was then tested and rolled back because direct health failed.

```txt
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
api_direct_health_after_line_runtime=000
dropin_removed=yes
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
actual_webhook_invalid_signature_dry_run_result=not_performed
line_developers_verification_result=not_performed
production_readiness=production_no_go
```

Do not press LINE Developers Console Verify until a later Loop confirms the API stays healthy with the LINE runtime EnvironmentFile connected.
