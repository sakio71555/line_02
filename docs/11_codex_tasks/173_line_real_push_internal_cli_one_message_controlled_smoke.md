# Loop 173: LINE Real Push Internal CLI One-Message Controlled Smoke

## Goal

Use a VPS-internal CLI to send exactly one real LINE push smoke message to the fresh tenant-scoped test target, then immediately roll back `LINE_REAL_PUSH_ENABLED=false`.

This Loop does not promote production. Final production readiness remains `production_no_go`.

## Scope

- Add a send-capable internal CLI at `scripts/smoke/line-real-push-single-message-smoke.ts`.
- Keep default mode as dry-run.
- Require explicit execute flags, approval env, `LINE_REAL_PUSH_ENABLED=true`, one-send lock creation, and exactly one fresh tenant-scoped target before any send.
- Execute one real LINE push smoke after dry-run and VPS staging validation.
- Retry zero times.
- Roll back to `LINE_REAL_PUSH_ENABLED=false` immediately after the attempt.
- Record only sanitized status fields.
- Add fake-client tests for the CLI and docs tests for the Loop result.

## Out of Scope

- More than one LINE send.
- Retry, bulk, multicast, broadcast, group, or room send.
- Public smoke route.
- Staff auth relaxation.
- Recording LINE token, channel secret, webhook path value, LINE user identifier, reply token, inbound body, outbound body, target mapping, OpenAI secret/model value, or Supabase secret/URL.
- OpenAI real API rerun.
- Supabase migration/write smoke/RLS changes.
- Nginx, DNS, certbot, reload, or restart changes.
- Production Go.

## Implementation

```txt
internal_cli_script=scripts/smoke/line-real-push-single-message-smoke.ts
internal_cli_default_mode=dry_run
internal_cli_execute_mode_implemented=true
one_send_lock_directory=/var/lib/amami-line-crm/smoke/line-real-single-message/loop173
one_send_lock_file=send-attempted.lock
```

The CLI creates the send-attempt lock immediately before the LINE push attempt. If the lock already exists, execute mode refuses to send.

## Execute Gate

```txt
LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED=YES
NO_RETRY_NO_BULK_NO_BROADCAST_ACK=YES
ONE_SEND_LOCK_READY=YES
LINE_REAL_PUSH_ENABLED_required=true
target_user_selected_required=true
```

## Dry-Run Result

```txt
line_push_smoke_mode=dry_run
target_user_selected=true
distinct_target_count=1
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
would_send=false
line_send_attempted_once=false
line_send_result=not_performed
retry_performed=false
bulk_multicast_broadcast_group_room=false
send_attempt_lock_present=false
send_attempt_count=0
duplicate_send_detected=false
```

## Execute Result

```txt
LINE_REAL_PUSH_ENABLED_temporarily_enabled=true
line_push_smoke_mode=execute
target_user_selected=true
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
would_send=true
line_send_attempted_once=true
line_send_result=success
retry_performed=false
bulk_multicast_broadcast_group_room=false
send_attempt_lock_present=true
send_attempt_count=1
duplicate_send_detected=false
```

Exactly one LINE push request was attempted. No retry was performed.

## Rollback and Safety

```txt
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
api_direct_health_loop173_final=200
https_api_health_loop173_final=200
customers_no_header_loop173=401
line_invalid_signature_loop173=401
AI_PROVIDER=mock
OpenAI systemd drop-in absent
openai_real_api_rerun=false
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
production_readiness=production_no_go
```

## Readiness Result

```txt
line_reply_push_ready=true
final_operator_go=false
production_readiness=production_no_go
```

LINE reply/push readiness is true because exactly one send was attempted, the result was success, rollback completed, final `LINE_REAL_PUSH_ENABLED=false` was confirmed, health/safety checks passed, and no secrets, identifiers, or message bodies were recorded.

## Test Coverage

- CLI default dry-run does not send.
- Execute mode fails without approval, no-retry acknowledgement, real-push flag, unique target, or lock availability.
- Existing lock blocks execute.
- Success path calls the fake LineClient once and records sanitized success fields.
- Failure path records one attempt, no retry, and no identifiers/body in output.
- Docs tests assert Loop 173 result, final disabled state, one-send lock, no production promotion, and secret-safe docs.

## Remaining Risks

- Production Go is not recorded.
- Real LINE push succeeded once, but broader production monitoring and operator Go/No-Go review are still pending.

## Next Loop Candidate

```txt
Loop 175: final production Go/No-Go review
```
