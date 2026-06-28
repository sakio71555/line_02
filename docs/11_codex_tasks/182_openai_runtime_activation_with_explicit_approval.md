# Loop 182: OpenAI Runtime Activation With Explicit Approval

## Purpose

Enable OpenAI runtime for the production API service after Loop 181 planning, while keeping LINE runtime unchanged and avoiding any OpenAI real API smoke.

This Loop activates the runtime boundary only. It does not send additional LINE messages, does not perform an OpenAI paid smoke, and does not change Nginx, DNS, certbot, Supabase schema, Supabase RLS, or application code.

## Scope

- Confirm the repository starts clean on `main...origin/main`.
- Run local baseline validation.
- Confirm OpenAI runtime env exists using redacted output only.
- Add the approved OpenAI systemd drop-in.
- Restart only `amami-line-crm-api.service`.
- Confirm `AI_PROVIDER=openai`.
- Confirm `LINE_REAL_PUSH_ENABLED=true` remains unchanged.
- Confirm health and safety routes.
- Confirm LINE invalid-signature request is rejected.
- Record rollback plan and monitoring checklist.
- Update docs, dev log, and static docs tests.

## Out of Scope

- OpenAI real API smoke.
- Additional LINE send.
- LINE runtime change.
- Nginx config change, reload, or restart.
- DNS change.
- Certbot execution.
- Supabase migration, write smoke, schema change, or RLS change.
- `.env` display or modification.
- Secret file display.
- API/UI/runtime code change.

## Operator Approval Tokens

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
ALLOW_OPENAI_REAL_API_SMOKE=NO
ALLOW_LINE_RUNTIME_CHANGE=NO
ALLOW_ADDITIONAL_LINE_SEND=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO
```

## Pre-Activation State

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

Pre-activation health:

```txt
api_direct_health_loop182_pre=200
https_api_health_loop182_pre=200
https_admin_root_loop182_pre=200
https_admin_customers_loop182_pre=200
https_admin_api_no_header_customers_loop182_pre=401
```

## Activation Action

The approved systemd drop-in was added:

```txt
OpenAI systemd drop-in=present
```

Only the API service was restarted. Nginx, DNS, certbot, Supabase schema/RLS, LINE runtime, and Admin service were not changed.

Activation result:

```txt
OpenAI runtime activation performed
activation_result=activated
rollback_performed=false
OpenAI real API smoke=not performed
additional_line_send_performed=false
```

## Post-Activation Runtime State

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

## Post-Activation Health And Safety Evidence

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

## Safety Boundary

- Secret values were not displayed or recorded.
- OpenAI API key and model values were not displayed or recorded.
- OpenAI prompt and response bodies were not recorded.
- OpenAI real API smoke was not performed.
- Additional LINE send was not performed.
- Webhook path values were not displayed or recorded.
- LINE user identifiers, reply tokens, inbound bodies, and outbound bodies were not recorded.
- Supabase endpoints, keys, DB URLs, and SQL connection strings were not recorded.
- Nginx, DNS, and certbot were not changed.
- Supabase schema/RLS/write changes were not performed.

## Rollback Plan

Rollback trigger:

- API service inactive.
- API direct health is not `200`.
- HTTPS API health is not `200`.
- `AI_PROVIDER=openai` cannot be confirmed.
- `LINE_REAL_PUSH_ENABLED=true` is not maintained.
- OpenAI systemd drop-in is missing or malformed.
- OpenAI runtime causes operational errors.

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

Rollback was not performed in Loop 182 because the activation health gates passed.

## Monitoring Checklist

After Loop 182:

1. Confirm API direct health.
2. Confirm HTTPS API health.
3. Confirm Admin root/customers routes.
4. Confirm Admin API no-header customers rejection.
5. Confirm LINE invalid-signature rejection.
6. Review sanitized OpenAI error classification.
7. Review OpenAI usage and cost dashboard without recording values.
8. Watch provider latency and timeout trend.
9. Review AI draft quality with staff before relying on output.
10. Confirm AI output is not automatically sent to LINE.
11. Confirm logs do not contain prompts, responses, API keys, model values, LINE identifiers, or message bodies.

## Test Coverage

- Static docs tests confirm Loop 182 task doc and runbook exist.
- Static docs tests confirm explicit approval tokens are recorded.
- Static docs tests confirm OpenAI runtime activation is recorded as performed.
- Static docs tests confirm OpenAI real API smoke and additional LINE send are recorded as not performed.
- Static docs tests confirm final runtime state and health evidence.
- Static docs tests confirm rollback and monitoring checklists.
- Static docs tests confirm secret-shaped values are not recorded.

## Next Loop

```txt
Loop 183: OpenAI runtime first-hour monitoring
```
