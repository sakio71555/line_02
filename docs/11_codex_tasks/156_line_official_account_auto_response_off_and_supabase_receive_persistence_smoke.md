# Loop 156: LINE Official Account auto-response OFF and Supabase receive persistence smoke

## Goal

Confirm that LINE Official Account automatic response is off, keep Webhook on, keep app-side LINE real push/reply disabled, and verify that a real inbound LINE message is persisted through the Supabase-backed runtime and still readable after an API service restart.

## Scope

- Human-confirm LINE Official Account response settings.
- Send one non-sensitive user message from LINE to the official account.
- Confirm Webhook POST reaches the API with `200`.
- Infer signature verification success from accepted LINE POST plus saved message.
- Confirm Supabase-backed read smoke after the event.
- Restart only the API service and confirm health/runtime/read smoke remain valid.
- Confirm invalid LINE signature still returns `401`.
- Update docs, runbook, dev log, and integration tests.

## Out Of Scope

- `LINE_REAL_PUSH_ENABLED=true`.
- LINE real reply/push.
- LINE access token, channel secret, webhook path, LINE userId, or message body display/recording.
- OpenAI real API.
- Supabase migration apply.
- RLS changes.
- Supabase write smoke.
- Nginx / DNS / certbot changes.
- `.env` display or mutation.
- Production Go.

## Human Confirmation

```txt
webhook_usage=on
official_account_response_message=off
official_account_ai_response_message=not_available_in_manager_screen
official_account_auto_response_ready=true
line_test_sent_by_operator=true
line_test_auto_reply_observed=false
```

The LINE Official Account screen did not show a separate AI response message setting in this account UI. The response message setting was OFF and Webhook was ON.

## Receive Smoke

```txt
line_real_receive_event_smoke=success
linebot_webhook_post_200_recent_count=7
linebot_webhook_post_5xx_recent_count=0
signature_verification_result=success_inferred_from_webhook_200_and_saved_message
event_type_received=message
message_type_received=text
message_body_recorded=no
line_user_id_recorded=no
webhook_path_values_recorded=no
line_real_push_reply=not_performed
line_real_push_enabled=false
```

## Supabase Persistence Smoke

```txt
repository_runtime_final=supabase
api_direct_health_after_event=200
https_api_health_after_event=200
customers_no_header_after_event=401
customers_safe_header_after_event=200
customers_after_event_tenant_scoped=true
supabase_messages_after_event_status=200
supabase_messages_after_event_customer_text_rows=10
supabase_messages_after_event_with_line_message_id=10
supabase_messages_after_event_tenant_scoped=true
supabase_messages_latest_recent_within_30min=true
```

Only counts and booleans were recorded. Concrete customer rows, message bodies, LINE identifiers, Supabase host values, and keys were not recorded.

## API Restart Persistence Check

```txt
api_restart_performed=yes
api_service_after_restart=active
api_direct_health_after_restart=200
https_api_health_after_restart=200
repository_runtime_after_restart=supabase
customers_no_header_after_restart=401
customers_safe_header_after_restart=200
customers_after_restart_tenant_scoped=true
supabase_messages_after_restart_status=200
supabase_messages_after_restart_customer_text_rows=10
supabase_messages_after_restart_with_line_message_id=10
supabase_messages_after_restart_tenant_scoped=true
supabase_messages_after_restart_latest_recent_within_30min=true
```

## Safety

```txt
line_invalid_signature_loop156=401
secret_token_path_userid_body_displayed=no
env_display_or_mutation=no
openai_real_api=no
line_real_push_reply=no
nginx_change=no
nginx_reload_restart=no
dns_change=no
certbot_rerun=no
go_promotion=no
```

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
