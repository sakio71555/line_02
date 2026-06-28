# LINE Real Reply/Push Controlled Smoke Planning

## Purpose

Prepare a future one-message LINE real reply/push smoke without sending a message in Loop 169.

This runbook is the safety plan for Loop 170. It records only sanitized status and boolean readiness.

## Current State

```txt
https_ready_for_review=true
line_receive_ready=true
official_account_auto_response_ready=true
supabase_ready=true
supabase_receive_persistence_ready=true
openai_provider_controlled_smoke_ready=true
openai_runtime_final=mock
AI_PROVIDER=mock
LINE_REAL_PUSH_ENABLED=false
line_real_reply_push_performed=false
line_reply_push_ready=false
line_reply_push_plan_ready=true
production_readiness=production_no_go
```

## Implementation Classification

```txt
outbound_implementation_classification=A_real_line_push_client_fully_wired_but_disabled_by_flag
preferred_smoke_mode=push
recommended_target_selection=operator_sends_fresh_test_message_before_smoke
recommended_execution_path=existing_staff_reply_route
reply_smoke_preferred=false
push_smoke_preferred=true
reply_token_persisted=false
```

Reason:

- The real LINE client can push through an injected transport when enabled.
- The API runtime falls back to mock while `LINE_REAL_PUSH_ENABLED=false`.
- The staff reply route uses guarded push-like delivery to the stored customer LINE target.
- A later reply smoke would need a short-lived reply token, and that is not the current safe staff reply path.

## Reply vs Push Safety Comparison

| item | reply smoke | push smoke |
| --- | --- | --- |
| Required LINE field | Short-lived reply token | Stored tenant-scoped LINE target |
| Current runtime path | Real client has a reply method, but staff reply route does not use it | Staff reply route uses `pushMessage` |
| Timing | Must happen during the webhook reply window | Can happen after operator selects a fresh test customer |
| Target selection | Harder without recording token/body | Safer if operator sends a fresh test message and the LINE user identifier is never recorded |
| Recommended for Loop 170 | no | yes |

## Human Gate Before Loop 170

Loop 170 must not start until the operator confirms all items:

1. LINE Official Account Manager:
   - Webhook ON.
   - Response message OFF.
   - AI response message OFF or not available in the manager screen.
2. Operator will send one fresh test LINE message.
3. One real LINE reply/push smoke is approved.
4. No retry, no bulk, no broadcast, no multicast, no group send, no room send.

## Target Selection Rule

```txt
target_user_selected=false
target_user_id_recorded=false
target_message_body_recorded=false
recommended_target_selection=operator_sends_fresh_test_message_before_smoke
```

Do not paste LINE user identifier values into chat, terminal output, docs, dev logs, tests, screenshots, or final reports.

If the latest tenant-scoped test customer cannot be confidently tied to the operator's fresh test message without exposing a LINE user identifier value or body, Loop 170 must stop.

## Outgoing Message Rule

```txt
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
openai_generated_message_allowed=false
customer_message_reuse_allowed=false
```

The smoke text must be fixed and non-personal, but the exact value must not be recorded.

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

Loop 169 did not run the enable helper.

## Loop 170 Execution Plan

1. Confirm the Official Account settings with the operator.
2. Ask the operator to send one fresh test LINE message.
3. Confirm receive path using sanitized status only:
   - webhook event observed.
   - tenant-scoped customer/message found.
   - LINE user identifier value not recorded.
   - message body not recorded.
4. Confirm line runtime with redacted output:
   - token configured; value not recorded.
   - secret configured; value not recorded.
   - webhook path configured; value not recorded.
   - `LINE_REAL_PUSH_ENABLED=false`.
5. Enable real push only inside the approved smoke window.
6. Restart API only inside the approved smoke window.
7. Send exactly one staff reply through the existing route.
8. Do not retry on failure.
9. Roll back immediately:
   - disable helper.
   - API restart.
   - health checks.
10. Record only sanitized result fields.

## Success Conditions for Loop 170

```txt
single_line_send_attempt_count=1
line_api_send_status=success
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
customers_no_header_after_rollback=401
line_invalid_signature_after_rollback=safe_non_2xx
duplicate_send_detected=false
LINE_REAL_PUSH_ENABLED=false
target_user_id_recorded=false
outgoing_message_body_recorded=false
```

## No-Go Conditions

- The operator cannot confirm Official Account settings.
- The target cannot be selected without recording LINE user identifier value or message body.
- `LINE_REAL_PUSH_ENABLED` is already true before the smoke window.
- Health is not 200 before enabling.
- Invalid-signature webhook returns 2xx, 404, or 5xx.
- The first send attempt fails and retry is requested.
- Any secret, webhook path value, LINE userId, replyToken, or body would need to be displayed.

## Loop 169 Sanitized Check

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
line_real_reply_push_performed=false
```

## Not Performed in Loop 169

```txt
line_real_reply_push_performed=false
openai_real_api_rerun=false
supabase_write_migration_rls_performed=false
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
production_promotion=false
```

## Secret Rule

Do not record:

- LINE access token.
- LINE channel secret.
- Webhook path value.
- LINE userId.
- replyToken.
- Message body.
- OpenAI API key, model value, prompt body, or response body.
- Supabase URL, keys, DB URL, or postgres connection strings.
- Authorization bearer token.
- Private key.

## Final State for Loop 169

```txt
AI_PROVIDER=mock
LINE_REAL_PUSH_ENABLED=false
OpenAI systemd drop-in absent
LINE real push/reply not performed
production_readiness=production_no_go
line_reply_push_ready=false
line_reply_push_plan_ready=true
```

## Next

```txt
Loop 170: LINE real reply/push single-message controlled smoke
```

## Loop 170 Update

Loop 170 did not perform the real send because the human approval gate was not satisfied.

```txt
human_approval_gate_satisfied=false
human_gate_not_satisfied=true
preferred_smoke_mode=push
execution_path=existing_staff_reply_route
target_user_selected=false
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```

No LINE token, channel secret, webhook path value, LINE user identifier, reply token, or message body was recorded.

## Loop 171 Update

Loop 171 satisfied the human approval gate and selected exactly one recent tenant-scoped target, but the live authenticated staff route dry check returned `401`. The smoke stayed not-performed.

```txt
human_approval_gate_satisfied=true
fresh_test_target_selected=true
target_user_selected=true
target_user_id_recorded=false
target_message_body_recorded=false
authenticated_staff_route_status=401
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
reason=authenticated_staff_route_unavailable
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```
