# LINE Real Receive Event Smoke

## Purpose

Record the Loop 146 receive-only smoke for LINE webhook production registration.

The goal is to confirm that a real inbound LINE event reaches the app and is logged. This runbook does not authorize app-side LINE reply/push.

## Safety Rules

- Do not display or record LINE access token, channel secret, webhook path value, LINE userId, or message body.
- Keep `LINE_REAL_PUSH_ENABLED=false`.
- Send only one non-sensitive test message from the user to the official account.
- Do not call LINE Messaging API send endpoints.
- Do not change Nginx, DNS, certbot, OpenAI, Supabase, Auth, RLS, migration, or UI.

## Preflight

```txt
line_developers_verification_result=success
api_service=active
admin_service=active
line_runtime_environmentfile=connected
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false configured; value not displayed
api_direct_health_before=200
https_api_health_before=200
current_runtime_storage_mode=in_memory
```

## Human Operation

The human operator confirmed:

```txt
webhook_usage=on_by_operator
official_account_auto_response_observed=true
```

The LINE Official Account automatic response is a LINE-side setting, not an app-side real push/reply. It should be turned off later before production operation.

Before a future real reply/push smoke, the operator should confirm:

- Response message: OFF.
- AI response message: OFF.
- Webhook: ON.
- Test recipient and one-message text approved outside Codex.

## Real Receive Result

```txt
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

The `200` webhook result plus tenant-scoped stored customer/message confirms that the event passed the webhook path and signature checks.

## API / Admin Result

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

## Not Performed

- LINE real push/reply.
- LINE Messaging API send call.
- OpenAI real API.
- Supabase real connection.
- Nginx config change.
- Nginx reload/restart.
- DNS change.
- certbot rerun.
- API/Auth/RLS/runtime/migration/UI code change.
- production Go decision.

## Production Readiness

```txt
production_readiness=production_no_go
```

No-Go remains because LINE real reply/push is still disabled and untested, the current receive storage is in-memory, Supabase/OpenAI production gates are incomplete, and final Go / No-Go is not approved.

## Next

1. Loop 147: Supabase staging secret injection checklist
2. Loop 148: OpenAI provider production gate
3. Loop 149: LINE real reply/push controlled gate
4. Loop 150: production Go/No-Go review

Loop 147-150 later confirmed that these gates are still No-Go until runtime wiring remediation is complete. See [Production Integration Fast Lane](production_integration_fast_lane.md).
