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

- HTTPS enabled.
- External HTTPS smoke completed.
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
line_webhook_production_url_status=no_go
line_webhook_approver=Project owner / requestor
line_webhook_registration=not_done
production_readiness=production_no_go
```

Reasons:

- Candidate URL is approved for future dry-run planning only, not registered.
- HTTPS not enabled.
- External smoke not completed.
- LINE channel secret not injected.
- LINE real push disabled.
