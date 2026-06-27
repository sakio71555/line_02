# LINE Webhook Secret Path Single-Segment Remediation

## Purpose

Record the Loop 145A remediation for the LINE webhook route mismatch diagnosed in Loop 144.

Loop 145A replaces the runtime webhook secret path shape with a one-segment value and verifies that the existing route is reachable. It does not authorize LINE real push/reply, OpenAI, Supabase, Nginx changes, DNS changes, certbot, or production Go.

## Safety Rules

- Do not display or record LINE secret values.
- Do not display or record the actual `webhookSecretPath`.
- Do not paste secret values into Codex chat, docs, tests, commit messages, or final reports.
- Do not print `secret file cat`, `.env cat`, raw `systemctl show -p Environment`, or raw journal output.
- Keep `LINE_REAL_PUSH_ENABLED=false`.
- Treat any value pasted into the wrong channel as exposed and rotate it again.

## Root Cause From Previous Loop

```txt
classification=B_API_route_path_mismatch
root_cause=LINE_WEBHOOK_SECRET_PATH_contains_slash_and_does_not_match_single_segment_route
route_path=/api/line/webhook/:webhookSecret
```

The API route expects a single path segment after `/api/line/webhook/`.

## Remediation Result

```txt
line_runtime_env_file=/etc/amami-line-crm/line-runtime.env
line_runtime_env_file_permissions=root_only
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
format_check=passed
LINE_WEBHOOK_SECRET_PATH: single-segment; value not displayed
```

The actual webhook path value is not recorded.

An intermediate value was treated as exposed after being pasted outside the intended secret channel. The operator rotated the value again before final verification.

## API Restart And Health

```txt
api_restart=success
api_service=active
direct_health_http_code=200
https_api_health_http_code=200
```

Only the API service was restarted. Nginx was not reloaded or restarted.

## Route Verification

```txt
direct_api_prefixed_invalid_signature=401
direct_non_api_prefixed_invalid_signature=404
https_api_prefixed_invalid_signature=401
https_current_path_valid_signature_dry_run=400
https_known_wrong_path_valid_signature=404
```

Interpretation:

- `401` for invalid signature means the request reaches the webhook handler and fails safely.
- `404` for the non-API or known-wrong path means URL/path mismatch still fails closed.
- `400` for the local valid-signature dummy body came from a minimal non-LINE platform payload and was not the final LINE Developers verification result.

## LINE Developers Verification

```txt
line_developers_console_url_updated_by_operator=yes
line_developers_verification_result=success
line_real_push_reply=not_performed
line_messaging_api_send=not_performed
```

Codex did not operate LINE Developers Console. The human operator updated the Webhook URL and pressed Verify.

## Not Performed

- LINE real push/reply.
- LINE Messaging API send call.
- LINE real customer receive smoke.
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

LINE Developers Console verification is now successful, but production remains No-Go until at least LINE real receive smoke, LINE real push gate review, Supabase/OpenAI production gates, and final Go / No-Go review are complete.

## Next

1. Loop 146: LINE real receive event smoke
2. Loop 147: Supabase staging secret injection checklist
3. Loop 148: OpenAI provider production gate
4. Loop 149: production Go/No-Go review

## Loop 146 Update

Loop 146 confirmed the real receive path.

```txt
webhook_usage=on_by_operator
line_real_receive_event_smoke=success
linebot_webhook_post_status=200
signature_verification_result=success
event_type_received=message
message_type_received=text
customer_saved=true
message_saved=true
line_real_push_reply=not_performed
production_readiness=production_no_go
```

The actual webhook path value, LINE userId, and message body are not recorded.

## Loop 147-150 Follow-Up

Loop 147-150 confirmed that webhook receiving remains good, but production integration is still No-Go:

```txt
line_receive_ready=true
line_real_push_reply=not_performed
line_real_push_enabled=false
line_real_client_runtime_wiring_incomplete=true
production_readiness=production_no_go
```

The next production-facing work should not change the webhook path. It should address runtime wiring for Supabase/OpenAI/LINE gates in small remediation Loops.
