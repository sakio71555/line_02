# Loop 169: LINE Real Reply/Push Controlled Smoke Planning

## Purpose

Plan the next LINE real reply/push smoke so that only one controlled message can be sent in a later Loop.

Loop 169 is planning and preflight only. It does not send a LINE real reply or push message.

## Scope

- Review the current LINE outbound implementation from code.
- Classify whether reply or push is the safer one-message smoke path.
- Confirm `LINE_REAL_PUSH_ENABLED=false` stays in effect.
- Confirm the VPS enable/disable helper paths exist.
- Record redacted VPS health and safety status.
- Define the Loop 170 human gate, one-message rule, rollback, and no-secret logging rules.
- Update docs, runbooks, dev log, and static tests.

## Out of Scope

- LINE real reply send.
- LINE real push send.
- Changing `LINE_REAL_PUSH_ENABLED` to `true`.
- Recording LINE token, channel secret, webhook path value, LINE userId, replyToken, or message body.
- OpenAI real API rerun or permanent enablement.
- Supabase migration, write smoke, or RLS change.
- Nginx config change, reload, restart, DNS change, or certbot rerun.
- `.env` display or mutation.
- Production Go promotion.

## Starting State

```txt
start_commit=bb079e8
start_branch=main...origin/main
start_worktree=clean
https_ready_for_review=true
line_receive_ready=true
official_account_auto_response_ready=true
supabase_ready=true
supabase_receive_persistence_ready=true
openai_provider_controlled_smoke_ready=true
openai_runtime_final=mock
line_real_push_enabled=false
line_real_reply_push_performed=false
line_reply_push_ready=false
production_readiness=production_no_go
```

## Outbound Implementation Classification

```txt
outbound_implementation_classification=A_real_line_push_client_fully_wired_but_disabled_by_flag
real_line_client_boundary_exists=true
line_client_runtime_switch=implemented
staff_reply_route_uses_push_like_delivery=true
reply_token_persisted=false
line_real_reply_push_performed=false
line_reply_push_ready=false
line_reply_push_plan_ready=true
```

Code review notes:

- `RealLineClient` supports both push and reply transports.
- The runtime creates `MockLineClient` when `LINE_REAL_PUSH_ENABLED=false`.
- `POST /api/admin/customers/:customerId/reply` calls `pushMessage` after the staff reply gate passes.
- The staff reply route requires explicit real push flags, authenticated staff context, selected tenant, permission, confirmation, and idempotency for real send.
- Webhook `replyToken` is normalized for inbound events, but it is not persisted for a later smoke. Reply smoke would need a short-lived webhook-time path and is not the current safe path.

## Reply vs Push Smoke Comparison

| mode | Requirement | Current fit | Risk | Decision |
| --- | --- | --- | --- | --- |
| reply | Short-lived `replyToken` from a fresh webhook event | Not suitable because the token is not persisted for later staff action smoke | Higher timing risk and harder rollback | Not preferred |
| push | Stored LINE user identifier for a tenant-scoped customer | Fits the existing staff reply route and real push gate | Requires strict target selection and no LINE user identifier logging | Preferred |

```txt
preferred_smoke_mode=push
preferred_smoke_reason=existing_staff_reply_route_uses_guarded_push_path_and_replyToken_is_not_persisted
```

## Target Selection

The next Loop must not display or record a LINE userId.

```txt
recommended_target_selection=operator_sends_fresh_test_message_before_smoke
target_user_selected=false
target_user_id_recorded=false
target_message_body_recorded=false
```

Preferred process:

1. Operator confirms Official Account settings.
2. Operator sends one fresh test LINE message from the target account.
3. Codex verifies only sanitized receive status and tenant-scoped row counts.
4. The one-message smoke uses that tenant-scoped customer without recording the LINE user identifier value or message body.

## Execution Path

```txt
recommended_execution_path=existing_staff_reply_route
execution_path_reason=it_exercises_the_same_staff_reply_gate_push_delivery_message_persistence_and_tenant_checks_as_runtime
new_public_route_required=false
```

The later smoke should use the existing staff reply route only after all human gates are met. It must not add a new public route.

## Loop 170 Human Gate

Before Loop 170, the operator must confirm:

1. LINE Official Account Manager:
   - Webhook ON.
   - Response message OFF.
   - AI response message OFF or not available in the manager screen.
2. Operator sends one fresh test LINE message.
3. One real LINE reply/push smoke is explicitly approved.
4. No retry, no bulk, no multicast, no broadcast, no group, and no room send.

## One-Message Smoke Rules

```txt
one_message_only=true
retry_allowed=false
bulk_send_allowed=false
multicast_allowed=false
broadcast_allowed=false
group_send_allowed=false
room_send_allowed=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
```

The message body must be short, fixed, non-personal, and not generated from OpenAI. The body value must not appear in docs, logs, terminal output, or the final report.

## Helper Status

```txt
line_real_push_enable_helper=/root/bin/amami-line-set-line-real-push-flag.sh
line_real_push_enable_helper_status=exists
line_real_push_disable_helper=/root/bin/amami-line-disable-line-real-push.sh
line_real_push_disable_helper_status=exists
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_CHANNEL_SECRET configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
```

Loop 169 did not run the enable helper and did not set the flag to true.

## Sanitized VPS Safety Check

```txt
api_service=active
admin_service=active
api_direct_health_loop169=200
https_api_health_loop169=200
admin_route_loop169=200
customers_no_header_loop169=401
line_invalid_signature_loop169=401
openai_systemd_dropin_present=false
AI_PROVIDER=mock
LINE_REAL_PUSH_ENABLED=false
```

No secret values, webhook path values, LINE user identifier values, reply token values, or message bodies are recorded.

## Rollback Plan for Loop 170

If Loop 170 is approved, rollback must happen whether the smoke succeeds or fails:

1. Run the disable helper.
2. Restart only the API service in the approved Loop.
3. Confirm direct `/health` is 200.
4. Confirm HTTPS `/api/health` is 200.
5. Confirm no-header Admin customers is 401.
6. Confirm LINE invalid-signature remains a safe non-2xx response.
7. Record `LINE_REAL_PUSH_ENABLED=false`.

## Not Performed

```txt
line_real_reply_push_performed=false
openai_real_api_rerun=false
supabase_write_migration_rls_performed=false
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
production_promotion=false
```

## Test Coverage

- Static integration test confirms this task doc and the planning runbook exist.
- Static integration test confirms `line_reply_push_ready=false` and `line_reply_push_plan_ready=true`.
- Static integration test confirms one-message-only, no retry, no bulk/multicast/broadcast/group/room send.
- Static integration test confirms secret values, concrete webhook paths, LINE userIds, replyTokens, message bodies, OpenAI values, Supabase endpoints, DB URLs, and bearer tokens are not recorded.

## Readiness

```txt
https_ready_for_review=true
line_receive_ready=true
official_account_auto_response_ready=true
supabase_ready=true
supabase_receive_persistence_ready=true
openai_provider_controlled_smoke_ready=true
openai_runtime_final=mock
line_reply_push_ready=false
line_reply_push_plan_ready=true
production_readiness=production_no_go
```

## Next

```txt
Loop 170: LINE real reply/push single-message controlled smoke
```
