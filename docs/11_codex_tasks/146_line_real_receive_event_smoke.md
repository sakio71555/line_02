# Loop 146: LINE real receive event smoke

## Goal

Confirm that a real inbound LINE event from the official account reaches the HTTPS webhook, passes signature verification, and is logged as an in-memory customer/message for `tenant_amamihome`.

This Loop is receive-only. It does not send LINE replies or push messages.

## Scope

- Confirm the repository starts clean on `main...origin/main`.
- Run local baseline checks before the real receive smoke.
- Confirm VPS API/Admin services are active.
- Confirm `LINE_REAL_PUSH_ENABLED=false` without displaying values.
- Confirm direct and HTTPS health.
- Confirm current runtime storage mode.
- Ask the human operator to send one non-sensitive test message from LINE.
- Confirm Nginx saw a real `LineBotWebhook/2.0` POST with HTTP `200`.
- Confirm API/admin in-memory state has a tenant-scoped customer and text message.
- Confirm no real LINE reply/push was sent by the app.
- Update docs, runbook, dev log, production readiness, and static integration tests.

## Out of Scope

- LINE real push/reply.
- `LINE_REAL_PUSH_ENABLED=true`.
- LINE access token display.
- LINE channel secret display.
- Actual `webhookSecretPath` display.
- LINE userId display.
- Message body display.
- OpenAI real API.
- Supabase real connection.
- Nginx config changes.
- Nginx reload/restart.
- certbot rerun.
- DNS changes.
- `.env` display or change.
- API/Auth/RLS/runtime/migration/UI code changes.
- production Go decision.

## Preflight Result

```txt
api_service=active
admin_service=active
line_runtime_environmentfile=connected
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false configured; value not displayed
api_direct_health_before=200
https_api_health_before=200
```

## Storage Mode

```txt
current_runtime_storage_mode=in_memory
expected_message_persistence=in_memory_api_process
```

The real receive smoke verifies persistence only inside the current API process. Data is not durable across API restarts in this mode.

## Real Receive Result

```txt
line_developers_verification_result=success
webhook_usage=on_by_operator
line_real_receive_event_smoke=success
linebot_webhook_post_status=200
signature_verification_result=success
event_type_received=message
message_type_received=text
customer_saved=true
message_saved=true
message_body_recorded=no
line_user_id_recorded=no
```

Signature verification success is inferred from the real LINE webhook POST returning `200` and the customer/message being stored. Invalid signatures return `401` in the existing route.

## Admin/API Result

```txt
admin_customers_status=200
admin_customers_count=1
admin_customers_tenant_scoped=true
admin_timeline_status=200
admin_timeline_message_count=1
admin_timeline_tenant_scoped=true
admin_timeline_roles=customer
admin_timeline_message_types=text
api_direct_health_after_event=200
https_api_health_after_event=200
https_admin_customers_status=200
```

## LINE Reply / Push Boundary

```txt
LINE_REAL_PUSH_ENABLED=false configured; value not displayed
line_real_push_reply=not_performed
line_messaging_api_send=not_performed
official_account_auto_response_observed=true
official_account_auto_response_action=turn_off_later
```

The observed automatic response came from LINE Official Account settings, not from this application. It should be turned off before production operation.

## Safety Boundary

```txt
secret_values_recorded=no
actual_webhookSecretPath_recorded=no
line_user_id_recorded=no
message_body_recorded=no
nginx_change=no
nginx_reload_restart=no
dns_change=no
certbot_rerun=no
openai_real_api=no
supabase_real_connection=no
production_readiness=production_no_go
```

## Remaining Risks

- In-memory storage is not durable across API restarts.
- LINE Official Account automatic response was observed and should be disabled later.
- LINE real reply/push remains disabled and untested.
- Supabase real connection and OpenAI real API remain outside this Loop.
- final production Go / No-Go remains unapproved.

## Next Loop Candidates

1. Loop 147: Supabase staging secret injection checklist
2. Loop 148: OpenAI provider production gate
3. Loop 149: LINE real reply/push controlled gate
4. Loop 150: production Go/No-Go review
