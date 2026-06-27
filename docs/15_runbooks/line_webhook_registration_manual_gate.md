# LINE Webhook Registration Manual Gate

## Purpose

This runbook explains the manual LINE Developers Console registration gate for the production candidate webhook URL.

Codex does not operate LINE Developers Console. A human operator registers the URL, toggles Webhook usage, and records the result without exposing secrets.

## Candidate URL Pattern

```txt
candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>
actual_webhook_secret_path_recorded=no
line_webhook_registration=manual_only_not_done_by_codex
```

The real `webhookSecretPath` is not written in repository docs, tests, commits, terminal output, or reports. It is entered only by the human operator in LINE Developers Console.

## Pre-registration Checklist

Confirm these items before a human edits LINE Developers Console:

```txt
https_ready_for_review=true
line_webhook_ready_for_registration=true
https_api_health=200
route_path=/api/line/webhook/:webhookSecret
webhook_secret_path_real_value_managed_outside_docs=true
line_channel_secret_displayed=no
line_access_token_displayed=no
production_readiness=production_no_go
```

Additional checks:

- `https://admin.taiyolabel.site/api/health` is reachable.
- Route shape is `POST /api/line/webhook/:webhookSecret`.
- Signature verification uses `x-line-signature` and raw request body.
- The real `webhookSecretPath` is available through approved secret handling.
- LINE real push remains disabled until separately approved.

## Manual Registration Steps

The human operator performs these steps:

1. Open LINE Developers Console.
2. Select the target Provider and Messaging API Channel.
3. Open Messaging API settings.
4. Register `https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>` in the Webhook URL field.
5. Turn Webhook usage ON.
6. Press Verify if needed.
7. Check existing response, greeting, and auto-response settings.
8. Do not perform real LINE send testing until a separate approval Loop.

## Post-registration Checklist

After the human registration, record only non-secret outcomes:

```txt
line_developers_console_verification_result=record_without_secret
api_log_webhook_arrival=confirm_if_secret_safe
invalid_signature_or_secret_mismatch=none_expected
webhook_5xx=none_expected
line_real_push_triggered=no
```

Do not paste request bodies, signatures, LINE user IDs, channel secret, access token, or real customer information into docs or reports.

## Post-registration Verification Plan

Run this only in a separately approved verification Loop:

```txt
sudo nginx -t
direct_api_health=/health
https_api_health=https://admin.taiyolabel.site/api/health
log_check=secret_safe_only
```

Log locations can differ by deployment. Confirm actual log paths in the future verification Loop, and copy only secret-safe summaries.

## Safety Boundary

Not performed in Loop 142:

- LINE Developers Console changes.
- LINE webhook URL registration by Codex.
- Webhook usage toggle by Codex.
- LINE API calls.
- LINE production sends.
- LINE channel secret display.
- LINE access token display.
- OpenAI real API.
- Supabase real connection.
- Supabase migration.
- RLS changes.
- Production secret injection.
- `.env` display or mutation.
- DNS changes.
- certbot execution or certificate renewal.
- Nginx config changes.
- Nginx reload or restart.
- VPS command execution.
- API/Auth/RLS/runtime/migration/UI changes.
- production Go decision.

## Production Readiness

```txt
production_readiness=production_no_go
https_ready_for_review=true
line_webhook_ready_for_registration=true
line_webhook_registration=manual_only_not_done_by_codex
line_real_push_status=disabled
```

No-Go reasons:

- LINE webhook registration still requires human action.
- LINE real push is not approved.
- Supabase real connection has not executed.
- OpenAI real API has not executed.
- Production secret injection has not executed.

## Loop 143 Runtime Secret Injection Update

Loop 143 attempted to connect LINE runtime secrets to the API service through a root-only EnvironmentFile. The API service direct health failed after the drop-in, so the drop-in was removed and the API service recovered.

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

Do not use LINE Developers verification until the API can read the LINE runtime EnvironmentFile while keeping `/health` healthy.

## Next

Proceed only through the next explicit Loop gate:

1. Loop 143: LINE webhook post-registration verification.
2. Loop 144: Supabase staging secret injection checklist.
3. Loop 145: OpenAI provider production gate.
4. Loop 146: production Go/No-Go review.
