# LINE Real Push Internal CLI One-Message Controlled Smoke

## Purpose

This runbook records the Loop 173 internal CLI smoke for exactly one LINE real push attempt. It is a controlled readiness check, not a production Go.

## Safety Boundary

```txt
one_message_only=true
retry_allowed=false
bulk_send_allowed=false
multicast_allowed=false
broadcast_allowed=false
group_send_allowed=false
room_send_allowed=false
public_smoke_route_added=false
staff_auth_relaxed=false
production_readiness=production_no_go
```

Never record LINE token, channel secret, webhook path value, LINE user identifier, reply token, inbound body, outbound body, target mapping, OpenAI secret/model value, Supabase URL/key/DB URL, or bearer token.

## Internal CLI

```txt
internal_cli_script=scripts/smoke/line-real-push-single-message-smoke.ts
internal_cli_default_mode=dry_run
internal_cli_execute_mode_implemented=true
execution_path=internal_cli_smoke_command
preferred_smoke_mode=push
```

Execute mode requires:

```txt
LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED=YES
NO_RETRY_NO_BULK_NO_BROADCAST_ACK=YES
ONE_SEND_LOCK_READY=YES
LINE_REAL_PUSH_ENABLED_required=true
target_user_selected_required=true
```

## One-Send Lock

```txt
one_send_lock_directory=/var/lib/amami-line-crm/smoke/line-real-single-message/loop173
one_send_lock_file=send-attempted.lock
send_attempt_lock_present=true
send_attempt_count=1
duplicate_send_detected=false
```

The CLI creates `send-attempted.lock` immediately before the LINE push attempt. If that file already exists, execute mode must stop before calling LINE.

## VPS Validation

```txt
vps_staging_install=success
vps_staging_lint=success
vps_staging_typecheck=success
vps_staging_test=success
vps_staging_test_integration=success
vps_staging_build=success
active_deploy=success
api_restart_performed=true
admin_restart_performed=true
nginx_reload_restart_performed=false
nginx_dns_certbot_change_performed=false
```

## Dry-Run Output

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

## Execute Output

```txt
LINE_REAL_PUSH_ENABLED_temporarily_enabled=true
line_push_smoke_mode=execute
target_user_selected=true
distinct_target_count=1
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

## Immediate Rollback

```txt
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI systemd drop-in absent
```

## Post-Smoke Safety

```txt
api_direct_health_loop173_final=200
https_api_health_loop173_final=200
customers_no_header_loop173=401
line_invalid_signature_loop173=401
line_reply_push_ready=true
production_readiness=production_no_go
```

## Not Performed

```txt
openai_real_api_rerun=false
supabase_migration_apply_performed=false
supabase_write_smoke_performed=false
rls_change_performed=false
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
final_operator_go=false
```

## Rollback Checklist

If any future LINE real send smoke fails or becomes uncertain:

1. Do not retry.
2. Run the LINE real push disable helper.
3. Restart the API service only.
4. Confirm direct API health and HTTPS API health.
5. Confirm `LINE_REAL_PUSH_ENABLED=false`.
6. Preserve the send-attempt lock.
7. Record the sanitized result as `line_send_result=failed` or `line_send_result=unknown`.

## Next

```txt
Loop 175: final production Go/No-Go review
```
