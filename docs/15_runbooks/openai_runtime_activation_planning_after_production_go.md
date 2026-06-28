# OpenAI Runtime Activation Planning After Production Go

## Purpose

This runbook plans how to enable OpenAI runtime after line-only production closeout.

Loop 181 is planning-only. It does not enable OpenAI runtime, create an OpenAI systemd drop-in, call OpenAI real API, change LINE runtime, send LINE messages, change Nginx/DNS/certbot, or change Supabase schema/RLS.

## Current Production State

```txt
production_readiness=production_go
activation_mode=line_only
monitoring_status=healthy
rollback_recommended=false
handoff_complete=true
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
OpenAI runtime activation not performed
openai_real_api_performed=false
line_send_performed=false
```

OpenAI provider controlled smoke has succeeded in a prior Loop, but production runtime remains mock until a separate explicit approval Loop.

## Read-Only Evidence

```txt
api_service_active=true
admin_service_active=true
api_direct_health_loop181_planning=200
https_api_health_loop181_planning=200
https_admin_root_loop181_planning=200
https_admin_customers_loop181_planning=200
https_admin_api_no_header_customers_loop181_planning=401
https_line_invalid_signature_loop181_planning=401
openai-dropin=absent
openai-runtime.env=exists
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
```

Only redacted key names and file metadata were checked. Values were not displayed or recorded.

## Required Approval Tokens

Current Loop 181 tokens:

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_OPENAI_REAL_API_SMOKE=NO
ALLOW_LINE_RUNTIME_CHANGE=NO
ALLOW_ADDITIONAL_LINE_SEND=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO
```

Future activation tokens:

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
ACTIVATION_MODE=openai_runtime_only
```

Do not change LINE runtime during OpenAI activation by default.

## Activation Plan For A Future Loop

1. Confirm approval tokens are explicit `YES`.
2. Confirm current production state is still line-only and healthy.
3. Confirm `openai-runtime.env` exists using redacted output only.
4. Confirm `OPENAI_API_KEY configured; value not recorded`.
5. Confirm `OPENAI_MODEL configured; value not recorded`.
6. Add only the approved OpenAI systemd drop-in.
7. Run daemon reload only in the approved activation Loop.
8. Restart only the API service.
9. Confirm API direct health returns `200`.
10. Confirm HTTPS API health returns `200`.
11. Confirm Admin root/customers routes return `200`.
12. Confirm Admin API no-header customers returns `401`.
13. Confirm LINE invalid-signature request is rejected.
14. Do not send additional LINE messages.
15. If explicitly approved, run at most one controlled OpenAI provider smoke using non-customer data.
16. Record only sanitized status/classification values.
17. Keep `AI_PROVIDER=openai` only if health, monitoring, and output contract checks pass.

## Rollback Plan

Rollback target:

```txt
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
activation_mode=line_only
```

Rollback procedure:

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

## Monitoring Checklist

After future activation:

1. API direct health.
2. HTTPS API health.
3. Admin root/customers routes.
4. Admin API no-header customers rejection.
5. LINE invalid-signature rejection.
6. OpenAI sanitized errors.
7. OpenAI usage and cost review without recording secret values.
8. Provider latency and timeout trend.
9. AI draft quality review.
10. Confirmation that AI output is not automatically sent to LINE.
11. Confirmation that logs do not contain prompts, responses, API keys, model values, LINE identifiers, or message bodies.

## Risk Matrix

| Risk | Impact | Mitigation |
| --- | --- | --- |
| API cost unexpected increase | Unexpected bill or quota pressure. | Keep `AI_PROVIDER=mock` until explicit approval and monitor usage after activation. |
| Model output drift | Drafts may change from the reviewed mock behavior. | Keep staff review required and do not auto-send AI output. |
| Response latency increase | Admin AI actions may be slow. | Monitor health and latency; rollback drop-in if needed. |
| Malformed JSON output | AI routes may fail to parse results. | Keep schema tests and parser guard. |
| Provider parsing regression | UI may receive incomplete draft data. | Use controlled smoke and static contract tests. |
| OpenAI API outage | AI actions may fail while CRM stays live. | Keep core LINE receive and Admin timeline independent from OpenAI. |
| Accidental AI-generated reply sent via LINE | Customer could receive unapproved content. | Do not change LINE runtime in OpenAI activation; keep manual staff workflow primary. |
| Secret logging | Sensitive credentials could leak. | Record only redacted key names and sanitized classifications. |

## Future Loop 182 Candidate

```txt
Loop 182: OpenAI runtime activation with explicit approval
```

Safe default:

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_OPENAI_REAL_API_SMOKE=NO
```

Approved future state:

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
ACTIVATION_MODE=openai_runtime_only
```

## Safety Boundary

- OpenAI runtime activation was not performed.
- OpenAI real API was not called.
- Additional LINE send was not performed.
- Nginx/DNS/certbot changes were not performed.
- Supabase schema/RLS changes were not performed.
- Secret values, webhook suffixes, LINE identifiers, reply tokens, message bodies, prompts, responses, OpenAI model values, Supabase endpoints, and DB URLs were not recorded.

## Loop 182 Follow-up

Loop 182 was executed with explicit approval tokens. OpenAI runtime activation was performed by adding the approved systemd drop-in and restarting only the API service.

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
AI_PROVIDER=openai
OpenAI systemd drop-in=present
OpenAI real API smoke=not performed
additional_line_send_performed=false
activation_mode=line_and_openai_runtime
```

Use [openai_runtime_activation_with_explicit_approval.md](openai_runtime_activation_with_explicit_approval.md) as the current OpenAI runtime activation record.
