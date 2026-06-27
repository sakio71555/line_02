# OpenAI Provider Production Gate

## Purpose

Record the OpenAI provider production gate after Loop 147-150 fast-lane review.

This runbook does not execute OpenAI real API calls and does not record API keys.

## Current Status

```txt
openai_implementation_classification=B_provider_gate_exists_real_runtime_transport_incomplete
provider_boundary_exists=true
openai_gate_exists=true
api_default_provider=mock
real_http_transport_wired=false
openai_secret_helper_created=no
openai_real_api_smoke=not_performed
production_readiness=production_no_go
```

## Non-Secret Names

```txt
AI_PROVIDER
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_REAL_API_ENABLED
```

Do not record values.

## Go Conditions Before Real API Smoke

- `AI_PROVIDER=openai` is wired through a server-side runtime factory.
- Real HTTP transport is implemented and redacts request/response errors.
- One paid smoke call is explicitly approved.
- Tenant AI settings allow the specific feature.
- AI output is draft-only and never auto-sent to LINE.
- Cost/rate-limit and rollback to mock are documented.

## Current No-Go Reasons

- API startup default is `MockAiProvider`.
- Real HTTP transport is not wired into deployed runtime.
- Paid OpenAI smoke is not approved in this Loop.
- `OPENAI_API_KEY` is not injected or displayed.

## Next

Plan a small remediation Loop before paid smoke:

```txt
Loop 151: production runtime wiring remediation plan
Loop 154: OpenAI real transport runtime wiring
Loop 155: OpenAI one-call controlled smoke
```

## Loop 151 Update

OpenAI runtime wiring and the server-side fetch transport boundary are now implemented.

```txt
openai_implementation_classification=C_runtime_switch_wired_real_api_smoke_pending
ai_provider_runtime_switch=implemented
real_http_transport_wired=true
api_default_provider=mock
openai_real_api_smoke=not_performed
production_readiness=production_no_go
```

The next OpenAI Loop must still be a controlled real API smoke with explicit approval, redacted logs, draft-only output, and rollback to `AI_PROVIDER=mock`.
