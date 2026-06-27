# LINE Official Account Auto-response OFF and Supabase Receive Persistence Smoke

## Purpose

Record Loop 156: the LINE Official Account automatic response OFF confirmation plus a real inbound LINE receive smoke through the Supabase-backed VPS review runtime.

This runbook records only sanitized status, counts, and booleans. It does not record secrets, concrete webhook path values, LINE userIds, message bodies, Supabase endpoints, DB URLs, or keys.

## Preconditions

```txt
https_ready_for_review=true
line_developers_verify=success
line_receive_ready=true
repository_runtime_final=supabase
supabase_ready=true
line_real_push_enabled=false
production_readiness=production_no_go
```

## LINE Official Account Settings

The operator confirmed the following in LINE Official Account Manager:

```txt
webhook_usage=on
official_account_response_message=off
official_account_ai_response_message=not_available_in_manager_screen
official_account_auto_response_ready=true
```

The manager screen for this account did not expose a separate AI response message setting. The response message setting was OFF, and Webhook stayed ON.

## Human Test Message

The operator sent one non-sensitive user message to the official account and confirmed no LINE-side automatic reply was observed.

```txt
line_test_sent_by_operator=true
line_test_auto_reply_observed=false
line_test_message_body_recorded=no
line_user_id_recorded=no
```

## Sanitized Receive Evidence

```txt
webhook_post_recent_count=27
webhook_post_200_recent_count=7
webhook_post_5xx_recent_count=0
linebot_user_agent_recent_count=9
webhook_path_values_recorded=no
signature_verification_result=success_inferred_from_webhook_200_and_saved_message
event_type_received=message
message_type_received=text
line_real_push_reply=not_performed
line_real_push_enabled=false
```

The accepted `200` webhook POST and the Supabase-backed customer text message rows together confirm the receive path and signature gate without recording the raw webhook body.

## Supabase-backed Read Smoke After Event

```txt
api_direct_health_after_event=200
https_api_health_after_event=200
customers_no_header_after_event=401
customers_safe_header_after_event=200
customers_after_event_count=5
customers_after_event_tenant_scoped=true
supabase_messages_after_event_status=200
supabase_messages_after_event_customer_text_rows=10
supabase_messages_after_event_with_line_message_id=10
supabase_messages_after_event_tenant_scoped=true
supabase_messages_latest_recent_within_30min=true
```

Only counts and status values are recorded. Concrete response rows are intentionally omitted.

## API Restart Persistence Check

The API service was restarted once to confirm the runtime remains Supabase-backed and the received data is still readable.

```txt
api_restart_performed=yes
api_service_after_restart=active
api_direct_health_after_restart=200
https_api_health_after_restart=200
repository_runtime_after_restart=supabase
customers_no_header_after_restart=401
customers_safe_header_after_restart=200
customers_after_restart_count=5
customers_after_restart_tenant_scoped=true
supabase_messages_after_restart_status=200
supabase_messages_after_restart_customer_text_rows=10
supabase_messages_after_restart_with_line_message_id=10
supabase_messages_after_restart_tenant_scoped=true
supabase_messages_after_restart_latest_recent_within_30min=true
```

## Invalid Signature Safety

```txt
line_invalid_signature_loop156=401
line_invalid_signature_safe=true
```

## Not Performed

- LINE real reply/push.
- LINE Messaging API send call.
- `LINE_REAL_PUSH_ENABLED=true`.
- OpenAI real API.
- Supabase migration apply.
- RLS change.
- Supabase write smoke.
- Nginx config change.
- Nginx reload/restart.
- DNS change.
- certbot rerun.
- `.env` display or mutation.
- production Go promotion.

## Readiness

```txt
https_ready_for_review=true
line_receive_ready=true
official_account_auto_response_ready=true
supabase_ready=true
supabase_receive_persistence_ready=true
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

## Remaining No-Go Reasons

- Supabase write smoke is not performed.
- OpenAI real API controlled smoke is not performed.
- LINE real reply/push single-message smoke is not performed.
- Final operator Go/No-Go is not complete.

## Next

Loop 157: OpenAI real API controlled smoke.
