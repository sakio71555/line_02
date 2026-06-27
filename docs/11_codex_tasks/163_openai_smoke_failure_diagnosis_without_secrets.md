# Loop 163: OpenAI smoke failure diagnosis without secrets

## Goal

Diagnose the failed OpenAI provider smoke from Loop 162 without recording secrets, prompt bodies, raw OpenAI response bodies, model values, bearer tokens, LINE identifiers, Supabase endpoint values, or webhook path values.

## Scope

- Preserve the existing server-side OpenAI provider boundary.
- Improve sanitized OpenAI smoke diagnostics.
- Keep the internal smoke command status-only.
- Deploy the diagnostic patch to the VPS review runtime with copy-based deployment.
- Run at most one operator-approved diagnostic OpenAI smoke per operator input event.
- Remove the OpenAI systemd `EnvironmentFile` drop-in after each smoke.
- Record only sanitized status and readiness.

## Out of Scope

- OpenAI always-on runtime.
- Recording API keys, model values, prompts, response bodies, or authorization headers.
- LINE real push/reply.
- Supabase migration, write smoke, or RLS changes.
- Nginx, DNS, certbot, or HTTPS changes.
- Production Go.

## Implementation Summary

- Added sanitized `OpenAiProviderError` diagnostics with status/code/type/classification fields.
- Updated the provider smoke command to print status-only diagnostic fields:
  - `request_sent`
  - `response_received`
  - `response_body_recorded=false`
  - `prompt_body_recorded=false`
  - `api_key_recorded=false`
  - `error_status`
  - `error_code`
  - `error_type`
  - `error_classification`
- Added tests for sanitized classification and smoke output.

## VPS Result

```txt
release_candidate=086f849b610adbeb39ae5087ac7c7f736d5c9b31
vps_staging_validation=success
active_deploy=success
openai_runtime_env_present=true
openai_runtime_env_mode=root_only
openai_format_check=passed
openai_environment_file_connection=temporary
openai_diagnostic_smoke=performed_once
openai_diagnostic_smoke_status=failed
openai_diagnostic_error_class=OpenAiProviderError
openai_diagnostic_error_status=unavailable
openai_diagnostic_error_code=unavailable
openai_diagnostic_error_type=unavailable
openai_diagnostic_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
production_readiness=production_no_go
```

The operator then replaced the OpenAI API key through the root-only helper and approved one follow-up key-replacement smoke. That follow-up smoke also failed with the same sanitized classification:

```txt
openai_key_replacement_smoke=performed_once
openai_key_replacement_smoke_status=failed
openai_key_replacement_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
production_readiness=production_no_go
```

## Safety Checks

```txt
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
https_customers_page=200
admin_customers_no_header=401
line_invalid_signature=401
```

## Test Coverage

- OpenAI provider error classification unit coverage.
- Internal smoke command sanitized output coverage.
- Loop 163 docs/runbook static coverage.
- Secret-pattern regression coverage for docs and logs.

## Remaining Risk

- The provider still fails with `I_unknown_sanitized`, which means the sanitized transport did not receive a provider status/code/type. A follow-up should inspect environment/network/runtime behavior without recording raw OpenAI responses.
- OpenAI remains `openai_ready=false`.

## Next

```txt
Loop 164: OpenAI smoke unknown error remediation
```
