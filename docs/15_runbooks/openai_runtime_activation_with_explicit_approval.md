# OpenAI Runtime Activation With Explicit Approval

## Purpose

Record the approved OpenAI runtime activation performed in Loop 182.

This runbook is the operational record for switching the production API runtime from mock AI to OpenAI runtime after explicit approval. It does not authorize OpenAI real API smoke, additional LINE send, Nginx changes, DNS changes, certbot execution, or Supabase schema/RLS changes.

## Approval Tokens

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
ALLOW_OPENAI_REAL_API_SMOKE=NO
ALLOW_LINE_RUNTIME_CHANGE=NO
ALLOW_ADDITIONAL_LINE_SEND=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO
```

## Pre-Activation Snapshot

```txt
production_readiness=production_go
activation_mode=line_only
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
openai-runtime.env=exists
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
```

Pre-check evidence:

```txt
api_direct_health_loop182_pre=200
https_api_health_loop182_pre=200
https_admin_root_loop182_pre=200
https_admin_customers_loop182_pre=200
https_admin_api_no_header_customers_loop182_pre=401
```

## Activation Summary

```txt
OpenAI runtime activation performed
activation_result=activated
rollback_performed=false
OpenAI real API smoke=not performed
additional_line_send_performed=false
OpenAI systemd drop-in=present
```

Only the API service was restarted. LINE runtime stayed enabled and unchanged.

## Final Runtime State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
```

## Final Verification

```txt
api_direct_health_loop182_openai_activated=200
https_api_health_loop182_openai_activated=200
api_direct_health_loop182_final=200
https_api_health_loop182_final=200
https_admin_root_loop182_final=200
https_admin_customers_loop182_final=200
https_admin_api_no_header_customers_loop182_final=401
https_line_invalid_signature_loop182_final=401
```

## Rollback Procedure

Rollback target:

```txt
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
activation_mode=line_only
```

Rollback steps:

1. Remove the OpenAI systemd drop-in.
2. Run daemon reload.
3. Restart only the API service.
4. Confirm API direct health returns `200`.
5. Confirm HTTPS API health returns `200`.
6. Confirm Admin root/customers routes return `200`.
7. Confirm Admin API no-header customers returns `401`.
8. Confirm LINE invalid-signature request is rejected.
9. Confirm `AI_PROVIDER=mock`.
10. Confirm `OpenAI systemd drop-in=absent`.

Rollback was not performed in Loop 182 because all activation checks passed.

## Monitoring Checklist

1. API direct health.
2. HTTPS API health.
3. Admin root/customers routes.
4. Admin API no-header customers rejection.
5. LINE invalid-signature rejection.
6. Sanitized OpenAI error classification.
7. OpenAI usage and cost review without recording values.
8. Provider latency and timeout trend.
9. Staff review of AI draft quality.
10. Confirmation that AI output is not automatically sent to LINE.
11. Confirmation that logs do not contain prompts, responses, API keys, model values, LINE identifiers, or message bodies.

## Safety Boundary

- Secret values were not displayed or recorded.
- OpenAI API key and model values were not displayed or recorded.
- OpenAI prompt and response bodies were not recorded.
- OpenAI real API smoke was not performed.
- Additional LINE send was not performed.
- Webhook path values were not displayed or recorded.
- LINE user identifiers, reply tokens, inbound bodies, and outbound bodies were not recorded.
- Supabase endpoints, keys, DB URLs, and SQL connection strings were not recorded.
- Nginx/DNS/certbot changes were not performed.
- Supabase schema/RLS changes were not performed.

## Next Loop

```txt
Loop 183: OpenAI runtime first-hour monitoring
```

## Loop 183 Monitoring Follow-up

Loop 183 completed read-only first-hour monitoring after activation.

```txt
monitoring_status=healthy
rollback_recommended=false
critical_errors_detected=false
openai_runtime_errors_detected=false
line_send_errors_detected=false
webhook_errors_detected=false
supabase_errors_detected=false
runtime_changes_performed=false
OpenAI real API smoke=not performed
additional_line_send_performed=false
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

Continue operator observation and use [openai_runtime_first_hour_monitoring.md](openai_runtime_first_hour_monitoring.md) as the monitoring evidence.
