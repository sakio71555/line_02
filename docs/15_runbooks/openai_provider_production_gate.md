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

## Loop 157-160 Update

Loop 157-160 confirmed the current OpenAI implementation from code and VPS runtime state.

```txt
openai_implementation_classification=A_real_provider_fully_wired_but_not_smoke_tested
provider_boundary_exists=true
real_http_transport_wired=true
runtime_ai_provider_switch=implemented
api_default_provider=mock
openai_runtime_env=absent
openai_runtime_helper=/root/bin/amami-line-set-openai-runtime-secrets.sh
openai_real_api_smoke=not_performed
openai_real_api_smoke_reason=pending_human_input_or_missing_approval
openai_ready=false
production_readiness=production_no_go
```

No OpenAI API key value, model value, request body, response body, or billing detail is recorded. The next OpenAI step remains a dedicated controlled smoke Loop with explicit operator approval.

## Loop 161 Update

Loop 161 rechecked the production OpenAI boundary and VPS runtime state.

```txt
openai_provider_classification=B_real_provider_wired_but_no_safe_external_smoke_route
provider_boundary_exists=true
real_http_transport_wired=true
runtime_ai_provider_switch=implemented
api_default_provider=mock
startup_openai_call=false
openai_helper_status=exists
openai_runtime_env=absent
openai_format_check=skipped_absent
openai_environment_file_connection=skipped_absent
openai_real_api_smoke=not_performed
openai_real_api_smoke_reason=openai_runtime_env_absent_pending_human_input
openai_response_body_recorded=no
openai_api_key_recorded=no
openai_ready=false
production_readiness=production_no_go
```

The available external AI routes still depend on customer timeline or tenant RAG source context. A future real API smoke should use operator-provided runtime env plus a safe non-customer provider-level smoke path, or explicitly approved dummy-only data.

## Loop 162 Update

Loop 162 added the safe non-customer provider-level smoke command and deployed it to the VPS review runtime.

```txt
openai_provider_classification=A_real_provider_fully_wired_and_safe_local_internal_smoke_added
provider_boundary_exists=true
real_http_transport_wired=true
runtime_ai_provider_switch=implemented
api_default_provider=mock
openai_smoke_command_added=true
openai_real_api_smoke=performed_once
openai_real_api_smoke_status=failed
openai_smoke_error_class=OpenAiProviderError
openai_response_body_recorded=no
openai_prompt_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
openai_ready=false
production_readiness=production_no_go
```

Because the controlled smoke failed, OpenAI is still not ready for production. The next OpenAI Loop should diagnose the failure without recording secrets or raw provider responses.

## Loop 163 Update

Loop 163 added status-only OpenAI smoke diagnostics and deployed the patch to the VPS review runtime.

```txt
openai_provider_classification=A_real_provider_fully_wired_with_sanitized_failure_diagnostics
provider_boundary_exists=true
real_http_transport_wired=true
runtime_ai_provider_switch=implemented
api_default_provider=mock
openai_diagnostic_smoke=performed_once
openai_diagnostic_smoke_status=failed
openai_diagnostic_error_class=OpenAiProviderError
openai_diagnostic_error_classification=I_unknown_sanitized
openai_key_replacement_smoke=performed_once
openai_key_replacement_smoke_status=failed
openai_key_replacement_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
openai_ready=false
production_readiness=production_no_go
```

Replacing the API key did not change the sanitized classification. Do not repeat paid smoke calls blindly; the next step should be a secret-safe unknown-error remediation Loop.

## Loop 164 Update

Loop 164 tried one approved model fallback smoke after the operator changed the configured model outside recorded output.

```txt
openai_provider_classification=A_real_provider_wired_but_model_fallback_smoke_failed
provider_boundary_exists=true
real_http_transport_wired=true
runtime_ai_provider_switch=implemented
api_default_provider=mock
openai_model_fallback_smoke=performed_once
openai_model_fallback_smoke_status=failed
openai_model_fallback_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
openai_ready=false
production_readiness=production_no_go
```

The next OpenAI Loop should remediate request-shape or provider transport behavior without recording raw upstream output.
