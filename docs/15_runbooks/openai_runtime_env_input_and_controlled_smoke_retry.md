# OpenAI Runtime Env Input and Controlled Smoke Retry

## Purpose

Record Loop 162: adding a safe internal OpenAI provider smoke command, deploying it to the VPS review runtime, and running one controlled non-customer smoke after operator approval.

This runbook intentionally records only status. It does not record OpenAI keys, model values, prompts, response bodies, bearer tokens, LINE identifiers, webhook path values, Supabase endpoint values, or DB URLs.

## Preconditions

Required before an OpenAI real API smoke:

- VPS OpenAI runtime env file exists.
- OpenAI API key is configured; value is not displayed.
- OpenAI model is configured; value is not displayed.
- `OPENAI_REAL_API_SMOKE_APPROVED=YES`.
- Prompt is fixed and non-personal.
- Exactly one OpenAI provider call is attempted.
- No retry is performed.
- The API is returned to mock AI after the smoke.

## Internal Smoke Command

```txt
scripts/smoke/openai-provider-smoke.ts
```

The command is internal only. It is not exposed as an HTTP route.

Sanitized output fields:

```txt
openai_smoke=success|failed|not_performed
provider=openai|not_openai
model=configured; value not displayed
response_received=true|false
response_body_recorded=false
prompt_recorded=false
api_key_recorded=false
error_class=OpenAiProviderError
```

## Loop 162 Result

```txt
release_candidate=62e9712212b4c1aea2d158279aabc8cca5e46c35
archive_sha256=346bf0b0918dc0ccaec33acae6bbf0f28de273b67915fc7e640fa4d06f56c691
vps_staging_validation=success
active_deploy=success
api_restart=success
admin_restart=success
openai_runtime_env_exists=true
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
api_direct_health_after_openai_rollback=200
https_api_health_after_openai_rollback=200
openai_ready=false
production_readiness=production_no_go
```

## Notes

- The first smoke script run returned `not_performed` because an ad-hoc SSH command does not inherit the API service `EnvironmentFile`.
- That first run did not call OpenAI.
- The approved run loaded the root-only runtime env in the command process and made exactly one OpenAI provider call.
- The call failed with sanitized `OpenAiProviderError`.
- The API systemd OpenAI drop-in was removed after the smoke.
- The root-only runtime env file remains present on the VPS for future operator-controlled use, but it is not attached to the API service.

## Final Runtime State

```txt
ai_provider_final=mock
openai_ready=false
line_real_push_enabled=false
line_real_push_reply=not_performed
api_direct_health=200
https_api_health=200
admin_root=200
customers_page=200
admin_customers_no_header=401
line_unknown_webhook=404
production_readiness=production_no_go
```

## Next

```txt
Loop 163: OpenAI smoke failure diagnosis without recording secrets
```

## Loop 163 Follow-up

Loop 163 improved sanitized diagnostics and reran operator-approved smoke checks without recording secrets.

```txt
openai_diagnostic_smoke=performed_once
openai_diagnostic_smoke_status=failed
openai_diagnostic_error_classification=I_unknown_sanitized
openai_key_replacement_smoke=performed_once
openai_key_replacement_smoke_status=failed
openai_key_replacement_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
openai_ready=false
production_readiness=production_no_go
```

The API service was returned to mock AI after each smoke. The root-only runtime env file remains operator-controlled on the VPS but is not attached to the API service.

## Loop 164 Follow-up

Loop 164 reused the root-only runtime env after the operator changed the model value outside the repository. The value was not displayed or recorded.

```txt
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
openai_environment_file_connection=temporary
openai_model_fallback_smoke=performed_once
openai_model_fallback_smoke_status=failed
openai_model_fallback_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
openai_ready=false
production_readiness=production_no_go
```

The API service was returned to mock AI after the smoke. Further OpenAI calls require a separate approval and a remediation Loop.

## Loop 165 Follow-up

Loop 165 remediated the smoke tooling so raw diagnostic and provider smoke can be separated.

```txt
raw_diagnostic_script=scripts/smoke/openai-raw-responses-smoke.ts
provider_boundary_only_script=scripts/smoke/openai-provider-boundary-smoke.ts
raw_responses_smoke_status=success
provider_boundary_smoke_status=failed
provider_retry_performed=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
production_readiness=production_no_go
```

Do not rerun provider smoke until the next provider output contract remediation Loop.

## Loop 166 Follow-up

OpenAI runtime env remains a temporary smoke-only attachment. Loop 166 used it for one provider-boundary smoke, then removed the drop-in and returned to mock AI.

```txt
provider_boundary_smoke=performed_once
provider_output_text_extracted=true
provider_boundary_error_classification=G_response_parse_bug
openai_systemd_dropin_present_final=false
ai_provider_final=mock
production_readiness=production_no_go
```

## Loop 167 Follow-up

The root-only OpenAI runtime env remains smoke-only. Loop 167 attached it temporarily, ran one provider-boundary smoke, then removed the drop-in and returned the API to mock AI.

```txt
raw_diagnostic_rerun=no
provider_boundary_smoke=performed_once
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=false
parse_stage=schema_validation
classification=G_response_parse_bug
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
openai_ready=false
production_readiness=production_no_go
```

Do not attach the OpenAI runtime env for steady-state production until schema validation succeeds in a separately approved Loop.

## Loop 168 Follow-up

The same controlled-smoke and rollback rules were used for Loop 168. The provider-boundary smoke succeeded, and the runtime was returned to mock AI.

```txt
provider_boundary_smoke_status=success
json_contract_schema_valid=true
schema_missing_fields=none
schema_invalid_fields=none
response_body_recorded=false
prompt_body_recorded=false
api_key_recorded=false
model_value_recorded=false
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
production_readiness=production_no_go
```
