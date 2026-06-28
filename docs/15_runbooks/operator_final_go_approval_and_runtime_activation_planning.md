# Operator Final Go Approval and Runtime Activation Planning

## Purpose

This runbook records the Loop 176 planning state before any final production activation.

The application is review-ready in several areas, but final operator production Go remains unapproved. This runbook intentionally does not change runtime state.

## Current Decision

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO
ALLOW_RUNTIME_ACTIVATION_CHANGES=NO
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
```

## Current Runtime State

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI drop-in absent
Nginx/DNS/certbot changes=none
Nginx reload/restart=not_performed
runtime_activation_changes=not_performed
production_readiness=production_no_go
```

## Read-Only Evidence

```txt
api_direct_health_loop176_planning=200
https_api_health_loop176_planning=200
https_admin_root_loop176_planning=200
https_admin_customers_loop176_planning=200
https_admin_api_no_header_customers_loop176_planning=401
https_line_invalid_signature_loop176_planning=401
```

These checks were read-only. No LINE send, OpenAI request, Supabase write, migration, RLS change, Nginx change, DNS change, certbot action, reload, or restart was performed.

## Option A: Safe Mode

Keep the current state:

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
final_operator_go=false
production_readiness=production_no_go
```

This option requires no runtime change and remains the default.

## Option B: LINE Real Push Final Activation

Only a future explicitly approved Loop may enable LINE real push.

Required future approval:

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=YES
ALLOW_RUNTIME_ACTIVATION_CHANGES=YES
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=YES
```

Execution requirements:

- Use the approved LINE enable helper.
- Restart only the API service if required.
- Do not retry, bulk-send, multicast, broadcast, group-send, or room-send.
- Keep webhook path values, LINE identifiers, reply tokens, inbound bodies, and outbound bodies out of logs and docs.
- Confirm API direct health, HTTPS health, Admin route health, no-header Admin API rejection, and invalid-signature rejection after activation.

Rollback:

- Run the approved LINE disable helper.
- Confirm `LINE_REAL_PUSH_ENABLED=false`.
- Confirm health and invalid-signature checks.

## Option C: OpenAI Runtime Final Activation

Only a future explicitly approved Loop may enable OpenAI runtime.

Required future approval:

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=YES
ALLOW_RUNTIME_ACTIVATION_CHANGES=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
```

Execution requirements:

- Use operator-entered runtime env without displaying values.
- Add only the approved OpenAI runtime drop-in.
- Restart only the API service if required.
- Do not record API key, model value, prompt text, request body, response body, customer message body, or provider output.
- Use sanitized provider error classification only.

Rollback:

- Remove the OpenAI runtime drop-in.
- Confirm `AI_PROVIDER=mock`.
- Confirm OpenAI drop-in absent.
- Confirm health checks.

## Option D: Combined Activation

Avoid combined activation unless explicitly approved.

If approved, activate one subsystem at a time:

1. Enable and verify LINE real push, or roll it back.
2. Enable and verify OpenAI runtime, or roll it back.
3. Do not skip the health and safety checkpoints between subsystems.

## No-Go Conditions

- Any approval token remains `NO`.
- A secret, webhook path value, LINE identifier, reply token, message body, bearer token, OpenAI model value, Supabase endpoint, DB URL, or key material would need to be displayed.
- API direct health or HTTPS health fails.
- No-header Admin API access is not rejected.
- Invalid-signature webhook request is not rejected.
- Rollback owner is unavailable.
- The action requires unapproved Nginx, DNS, certbot, reload, restart, migration, RLS, Auth/JWT, or UI changes.

## First-Hour Monitoring Plan

Use only after explicit future activation.

1. API direct health.
2. HTTPS API health.
3. Admin root and customers routes.
4. Sanitized LINE webhook result pattern.
5. LINE send error count and retry count.
6. Supabase read/write errors.
7. OpenAI provider sanitized errors, if enabled.
8. Logs contain no secret values, identifiers, webhook path values, exact message bodies, prompts, or provider responses.
9. Rollback owner remains available.

## Final Planning Result

```txt
final_operator_go=false
go_ready_but_operator_go_pending=true
production_readiness=production_no_go
runtime_activation_changes=not_performed
line_real_push_final_activation=not_performed
openai_runtime_final_activation=not_performed
nginx_dns_certbot_changes=not_performed
```

## Next Loop

```txt
Loop 177: explicit production activation with operator approval
```

## Loop 177 Decision Update

Loop 177 evaluated the explicit operator tokens. They remained in the safe `NO` state, so runtime activation was not performed.

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO
ALLOW_RUNTIME_ACTIVATION_CHANGES=NO
ACTIVATION_MODE=review_only
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO
ALLOW_ADDITIONAL_LINE_SEND_SMOKE=NO
activation_performed=false
activation_result=not_performed
runtime_activation_changes=not_performed
rollback_performed=false
production_readiness=production_no_go
```

Final runtime remained:

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
OpenAI drop-in absent
```
