# Loop 181: OpenAI Runtime Activation Planning After Production Go

## Purpose

Plan how to enable OpenAI runtime after the line-only production closeout.

This Loop is planning, documentation, static test, and read-only verification only. It does not enable OpenAI runtime, create an OpenAI systemd drop-in, call the OpenAI real API, change LINE runtime, send LINE messages, change Nginx/DNS/certbot, or change Supabase schema/RLS.

## Scope

- Record current production state after Loop 180.
- Confirm VPS health and runtime state with read-only checks.
- Confirm OpenAI runtime env presence using redacted output only.
- Define required approval tokens for a future OpenAI activation Loop.
- Define future activation steps.
- Define rollback steps.
- Define monitoring requirements.
- Add OpenAI activation risk matrix.
- Add future Loop 182 candidate.
- Update README, dev loop, production readiness, operator handoff, production closeout, and dev log.
- Add static docs tests.

## Out of Scope

- OpenAI runtime activation.
- OpenAI systemd drop-in creation.
- OpenAI real API call.
- `AI_PROVIDER=openai` runtime change.
- `LINE_REAL_PUSH_ENABLED` change.
- Additional LINE send.
- Supabase migration, write smoke, schema change, or RLS change.
- Nginx setting change, reload, restart, DNS change, or certbot execution.
- `.env` display or modification.
- Secret file display.
- Runtime/API/UI behavior change.

## Operator Tokens

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_OPENAI_REAL_API_SMOKE=NO
ALLOW_LINE_RUNTIME_CHANGE=NO
ALLOW_ADDITIONAL_LINE_SEND=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO
```

Because all approval tokens remain `NO`, OpenAI runtime activation is planning-only in Loop 181.

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

OpenAI provider controlled smoke succeeded in an earlier Loop, but steady-state production runtime still uses mock AI until a separate explicit approval Loop.

## Read-Only Verification

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

The runtime env file was checked only by file existence, metadata, and redacted key names. Values were not displayed or recorded.

## Why OpenAI Activation Is Separate

| Reason | Detail | Boundary |
| --- | --- | --- |
| Cost risk | Production traffic could create unexpected API cost. | Require explicit approval, usage monitoring, and rollback owner. |
| Response behavior risk | Model output may differ from mock provider behavior. | Start with controlled activation and monitor provider errors. |
| Reply quality risk | AI-generated drafts can be incorrect, too confident, or unclear. | Keep staff/manual workflow primary and draft-only. |
| JSON contract risk | Provider output can drift or fail schema validation. | Keep parser tests and rollback to mock on failure. |
| Latency risk | API response time can increase when OpenAI runtime is enabled. | Monitor health and provider latency. |
| Incident scope risk | Combining OpenAI and LINE changes could make diagnosis hard. | Do not change LINE runtime in the OpenAI activation Loop. |

## Future Approval Tokens

Default safe state:

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_OPENAI_REAL_API_SMOKE=NO
ALLOW_LINE_RUNTIME_CHANGE=NO
ALLOW_ADDITIONAL_LINE_SEND=NO
```

Future activation may proceed only if explicitly approved:

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
ACTIVATION_MODE=openai_runtime_only
```

`ALLOW_OPENAI_REAL_API_SMOKE=YES` is optional and must be decided separately. If it remains `NO`, activation must rely on health checks and existing provider readiness evidence without performing a new paid smoke.

## Future Activation Steps

The future Loop must be explicit and separate.

1. Confirm worktree is clean and production state is still line-only.
2. Confirm operator approval tokens.
3. Verify `openai-runtime.env` exists with redacted output only.
4. Confirm `OPENAI_API_KEY configured; value not recorded`.
5. Confirm `OPENAI_MODEL configured; value not recorded`.
6. Add the approved OpenAI systemd drop-in.
7. Run daemon reload only if the drop-in is being changed in that approved Loop.
8. Restart only the API service.
9. Confirm API direct health returns `200`.
10. Confirm HTTPS API health returns `200`.
11. Confirm Admin root/customers routes return `200`.
12. Confirm Admin API no-header customers returns `401`.
13. Confirm LINE invalid-signature request is rejected.
14. Do not send additional LINE messages.
15. If explicitly approved, perform at most one controlled OpenAI provider smoke using non-customer data.
16. Record only status/classification values.
17. Keep final `AI_PROVIDER=openai` only if health and monitoring gates pass.

## Rollback Plan

Rollback target:

```txt
AI_PROVIDER=mock
OpenAI systemd drop-in=absent
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
activation_mode=line_only
```

Rollback steps for a future approved rollback Loop:

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

After any future OpenAI runtime activation:

1. API direct health.
2. HTTPS API health.
3. Admin root/customers routes.
4. Admin API no-header customers rejection.
5. LINE invalid-signature rejection.
6. OpenAI sanitized error classification.
7. OpenAI usage and cost dashboard review without recording secret values.
8. Provider latency and timeout trend.
9. Draft quality review by operator.
10. Confirmation that AI output is not automatically sent to LINE.
11. Confirmation that logs do not contain prompts, responses, API keys, model values, LINE identifiers, or message bodies.

## Risk Matrix

| Risk | Impact | Mitigation |
| --- | --- | --- |
| API cost unexpected increase | Unexpected bill or quota pressure. | Keep `AI_PROVIDER=mock` until explicit approval; monitor usage after activation. |
| Model output drift | Drafts may become less predictable. | Keep staff review required; do not auto-send AI output. |
| Response latency increase | Admin actions may feel slow or timeout. | Monitor health and latency; rollback drop-in if needed. |
| Malformed JSON output | AI routes may fail to parse results. | Keep schema tests and provider parser guard. |
| Provider parsing regression | UI may receive incomplete draft data. | Use controlled smoke and static contract tests. |
| OpenAI API outage | AI actions fail while CRM remains live. | Keep core LINE receive and Admin timeline independent from OpenAI. |
| Accidental AI-generated reply sent via LINE | Customer could receive unapproved content. | Do not change LINE runtime in OpenAI activation; keep staff/manual workflow primary. |
| Secret logging | Sensitive credentials could leak. | Record only redacted key names and sanitized classifications. |

## Future Loop 182 Candidate

```txt
Loop 182: OpenAI runtime activation with explicit approval
```

Default safe tokens:

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_OPENAI_REAL_API_SMOKE=NO
ALLOW_LINE_RUNTIME_CHANGE=NO
ALLOW_ADDITIONAL_LINE_SEND=NO
```

If approved:

```txt
OPENAI_RUNTIME_ACTIVATION_APPROVED=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
ACTIVATION_MODE=openai_runtime_only
```

## Safety Boundary

- Secret values were not displayed or recorded.
- OpenAI API key and model values were not displayed or recorded.
- OpenAI prompt and response bodies were not recorded.
- Webhook path values were not displayed or recorded.
- LINE user identifiers, reply tokens, inbound bodies, and outbound bodies were not recorded.
- Supabase endpoints, keys, and DB URLs were not recorded.
- No OpenAI real API call was performed.
- No additional LINE send was performed.
- No runtime changes were performed.

## Test Coverage

- Static docs tests confirm Loop 181 planning docs exist.
- Static docs tests confirm production Go line-only state remains recorded.
- Static docs tests confirm approval tokens remain `NO`.
- Static docs tests confirm future activation, rollback, monitoring, risk matrix, and future Loop 182 candidate are recorded.
- Static docs tests confirm secret-shaped values, webhook paths, identifiers, bodies, and provider values are not recorded.

## Next Loop

```txt
Loop 182: OpenAI runtime activation with explicit approval
```
