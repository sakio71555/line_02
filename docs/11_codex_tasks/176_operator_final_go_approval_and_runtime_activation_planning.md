# Loop 176: Operator Final Go Approval and Runtime Activation Planning

## Goal

Plan the final operator Go approval and runtime activation sequence without changing runtime state.

Loop 175 confirmed that the system is review-ready, but final operator production Go is not approved. Loop 176 keeps that decision intact and documents how a future activation Loop must proceed.

## Scope

- Record the final operator decision tokens.
- Record the current runtime state from read-only checks.
- Plan activation options for safe mode, LINE real push, OpenAI runtime, and combined activation.
- Record rollback and first-hour monitoring steps.
- Update the final readiness, handoff, dev loop, README, and dev log docs.
- Add static tests for the planning docs.

## Out of Scope

- Runtime activation.
- LINE real push/reply send.
- OpenAI real API call or provider rerun.
- Supabase write smoke, migration apply, RLS changes, or Auth/JWT changes.
- Nginx, DNS, certbot, reload, or restart changes.
- `.env` display or mutation.
- API, UI, repository, migration, or domain model changes.

## Operator Decision Tokens

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO
ALLOW_RUNTIME_ACTIVATION_CHANGES=NO
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
```

These tokens mean that no runtime activation can be inferred from readiness status. A future Loop must receive explicit operator approval before changing the final runtime.

## Current Runtime State

Read-only checks confirmed the review runtime is stable and still not activated for final autonomous operation.

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

Sanitized read-only evidence:

```txt
api_direct_health_loop176_planning=200
https_api_health_loop176_planning=200
https_admin_root_loop176_planning=200
https_admin_customers_loop176_planning=200
https_admin_api_no_header_customers_loop176_planning=401
https_line_invalid_signature_loop176_planning=401
```

No secret values, webhook path values, LINE identifiers, message bodies, bearer tokens, OpenAI model values, Supabase endpoints, DB URLs, or key material are recorded.

## Activation Options

### Option A: Safe Mode

Keep the current runtime as-is.

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=false
AI_PROVIDER=mock
final_operator_go=false
production_readiness=production_no_go
```

This is the current state and remains the default until an explicit future approval changes it.

### Option B: LINE Real Push Final Activation

Requires a future dedicated Loop with explicit approval.

Required approval tokens:

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=YES
ALLOW_RUNTIME_ACTIVATION_CHANGES=YES
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=YES
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
```

Execution outline for a future Loop:

1. Confirm final operator Go in writing.
2. Confirm rollback owner is available.
3. Confirm current API/Admin health and invalid-signature rejection.
4. Enable LINE real push using the approved helper.
5. Restart only the API service if required by the helper.
6. Verify health and sanitized logs.
7. Do not retry, bulk-send, multicast, broadcast, group-send, or room-send.
8. Monitor first-hour send errors.

Rollback:

1. Run the approved LINE real push disable helper.
2. Restart only the API service if required.
3. Confirm `LINE_REAL_PUSH_ENABLED=false`.
4. Confirm API direct health and HTTPS health return `200`.
5. Confirm invalid-signature webhook request returns `401`.

### Option C: OpenAI Runtime Final Activation

Requires a future dedicated Loop with explicit approval.

Required approval tokens:

```txt
FINAL_OPERATOR_PRODUCTION_GO_APPROVED=YES
ALLOW_RUNTIME_ACTIVATION_CHANGES=YES
ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO
ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES
ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO
```

Execution outline for a future Loop:

1. Confirm final operator Go in writing.
2. Confirm OpenAI runtime env has already been entered by the operator outside Codex.
3. Do not display or record key, model, request, response, prompt, or customer message contents.
4. Add the approved OpenAI runtime drop-in.
5. Restart only the API service if required.
6. Verify API/Admin health.
7. Run only the explicitly approved minimal smoke path, if the future Loop authorizes it.
8. Monitor provider errors with sanitized classification only.

Rollback:

1. Remove the OpenAI runtime drop-in.
2. Restart only the API service if required.
3. Confirm `AI_PROVIDER=mock`.
4. Confirm OpenAI drop-in absent.
5. Confirm API direct health and HTTPS health return `200`.

### Option D: LINE and OpenAI Together

This is the highest-risk option and should be avoided unless the operator explicitly approves it.

Preferred sequence:

1. Activate LINE real push in one Loop, then monitor.
2. Activate OpenAI runtime in a separate Loop, then monitor.

If both are approved together, the future Loop must still activate and verify one subsystem at a time, with rollback checkpoints between them.

## No-Go Conditions

- Final operator Go token is not `YES`.
- Runtime activation token is not `YES`.
- LINE final true token is not `YES` when enabling LINE real push.
- OpenAI final true token is not `YES` when enabling OpenAI runtime.
- Any secret, webhook path value, LINE identifier, reply token, message body, bearer token, OpenAI model value, Supabase endpoint, DB URL, or key material would need to be displayed.
- API health, HTTPS health, no-header Admin API rejection, or invalid-signature rejection fails.
- Rollback owner is unavailable.
- The requested action requires Nginx, DNS, certbot, reload, or restart changes not explicitly approved for that future Loop.

## First-Hour Monitoring Plan

Use only after a future Loop records final operator Go and performs explicit activation.

1. API direct health.
2. HTTPS API health.
3. Admin root and customers route health.
4. Sanitized LINE webhook 2xx/4xx pattern.
5. LINE send error count without automatic retry.
6. Supabase read/write error count.
7. OpenAI provider error classification, if OpenAI runtime is enabled.
8. No secret, identifier, webhook path value, exact message body, prompt, provider response, or token appears in logs.
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

## Test Coverage

- Static docs test ensures Loop 176 task/runbook exist.
- Static docs test ensures decision tokens remain `NO`.
- Static docs test ensures current runtime is safe.
- Static docs test ensures LINE/OpenAI activation options, rollback, and first-hour monitoring are documented.
- Static docs test ensures secret-shaped values and exact promotion strings are not recorded.

## Next Loop

```txt
Loop 177: explicit production activation with operator approval
```
