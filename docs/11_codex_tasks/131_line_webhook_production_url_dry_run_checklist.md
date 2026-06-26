# Loop 131: LINE webhook production URL dry-run checklist

## Goal

Prepare the checklist for registering a future LINE webhook production URL without changing LINE Developers settings.

No LINE API call, webhook URL registration, LINE push, secret display, Nginx real-domain enablement, HTTPS enablement, or external smoke is executed in this Loop.

## Scope

- Read-only confirm the existing LINE webhook route.
- Record the candidate URL as unapproved.
- Record signature verification and webhook secret path boundaries.
- Keep LINE real push disabled / gated.
- Keep `production_no_go`.

## Route Confirmation

Read-only repo inspection confirmed:

```txt
method=POST
route=/api/line/webhook/:webhookSecret
signature_header=x-line-signature
signature_verification=verifyLineSignature over raw request body
payload_parser=parseLineWebhookPayload after signature verification
tenant_resolution=webhookSecret path via loadAppConfig
channel_secret_source=LINE_CHANNEL_SECRET env name only
```

Relevant files:

- `apps/api/src/index.ts`
- `packages/line`
- `tests/integration/line-webhook.test.ts`
- `apps/api/src/admin/line-real-push-gate.ts`

## Candidate URL

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
candidate_url_status=not_approved_for_registration
```

## Current Runtime State

```txt
https_enabled=no
external_smoke=not_completed
line_webhook_approver=unknown
line_channel_secret_injected=no
line_real_push_enabled=no
line_messaging_enabled=no
production_readiness=production_no_go
```

## Forbidden

- LINE Developers Console changes.
- Webhook URL registration.
- LINE API call.
- LINE production send.
- LINE channel secret display.
- LINE channel access token display.
- Real-domain Nginx enablement.
- certbot / HTTPS.
- external smoke.

## No-Go Reasons

- HTTPS is not enabled.
- External smoke is not completed.
- LINE webhook approver unknown.
- LINE channel secret not injected.
- LINE real push disabled.
- Candidate URL is not approved for LINE registration.

## Next

- Loop 137: LINE webhook dry-run with approved HTTPS URL.
