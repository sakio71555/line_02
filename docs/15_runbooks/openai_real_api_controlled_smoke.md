# OpenAI Real API Controlled Smoke

## Purpose

Define the safe procedure and Loop 161 result for OpenAI real API smoke on the VPS review runtime.

This runbook is intentionally conservative. It does not record OpenAI keys, prompts with customer data, raw responses, bearer tokens, LINE identifiers, webhook path values, or Supabase endpoint values.

## Preconditions

All of the following are required before a real API smoke may run:

- Root-only OpenAI runtime env file exists on the VPS.
- OpenAI API key is configured; value is not displayed.
- OpenAI model is configured; value is not displayed.
- One paid smoke call is explicitly approved.
- The prompt is short and non-personal.
- The route or provider-level smoke does not use customer timeline or LINE message body.
- The response body is not recorded.

## Loop 161 Result

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
```

## Loop 162 Result

Loop 162 added an internal provider-level smoke command and performed one approved non-customer OpenAI provider smoke.

```txt
openai_provider_classification=A_real_provider_fully_wired_and_safe_local_internal_smoke_added
openai_smoke_command_added=true
openai_runtime_env=present
openai_runtime_env_approval=YES
openai_environment_file_connection=temporary
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

The failure was intentionally recorded only as a sanitized error class. No retry was performed.

## Final Runtime State

```txt
repository_runtime_final=supabase
ai_provider_final=mock
line_real_push_enabled=false
api_direct_health_loop161_final=200
https_api_health_loop161_final=200
customers_no_header_loop161=401
line_invalid_signature_loop161=401
production_readiness=production_no_go
```

Loop 162 final checks:

```txt
api_direct_health_after_openai_rollback=200
https_api_health_after_openai_rollback=200
admin_root=200
customers_page=200
admin_customers_no_header=401
line_unknown_webhook=404
ai_provider_final=mock
line_real_push_reply=not_performed
production_readiness=production_no_go
```

## Allowed Recording Format

Use status-only wording:

```txt
openai_real_api_smoke=success
openai_real_api_smoke=failed
openai_real_api_smoke=not_performed
openai_response_body_recorded=no
openai_api_key_recorded=no
```

Do not record the real prompt, raw response, model value, key value, authorization header, customer content, or LINE body.

## Rollback Rule

After any future OpenAI smoke, return the API to `AI_PROVIDER=mock` unless there is a separate explicit approval to keep OpenAI enabled.

## No-Go Conditions

- OpenAI runtime env is absent.
- One-call paid smoke approval is absent.
- The only available route would include customer timeline or LINE message body.
- `/health` fails after enabling OpenAI.
- Any secret-like value appears in logs or docs.

## Next

```txt
Loop 162: OpenAI runtime env input and controlled smoke retry
```
