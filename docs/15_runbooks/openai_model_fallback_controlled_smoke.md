# OpenAI Model Fallback Controlled Smoke

## Purpose

Record Loop 164: a single operator-approved OpenAI provider smoke after the operator changed the configured model value outside Git and outside Codex output.

This runbook keeps OpenAI as a controlled external boundary. It does not promote OpenAI to steady-state runtime.

## Secret and Data Rules

Never record:

- OpenAI API key values.
- OpenAI model values.
- Authorization or bearer tokens.
- Prompt body.
- Raw OpenAI response body.
- Customer timeline, LINE message body, or RAG source content.
- LINE webhook path values.
- LINE user identifiers.
- Supabase endpoint values, keys, DB URLs, or Postgres URLs.

Allowed phrases:

```txt
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
```

## Preconditions

```txt
openai-runtime.env=exists
openai_runtime_env_mode=root_only
openai_format_check=passed
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
OPENAI_REAL_API_SMOKE_APPROVED=YES
api_direct_health_before_smoke=200
https_api_health_before_smoke=200
openai_smoke_command=exists
```

## Procedure Summary

1. Confirm the API and Admin services are active.
2. Confirm `/health` over direct localhost API and HTTPS.
3. Confirm the OpenAI runtime env has required keys without displaying values.
4. Temporarily attach the OpenAI runtime `EnvironmentFile`.
5. Restart the API and confirm `/health`.
6. Run exactly one internal provider smoke with fixed non-personal input.
7. Remove the OpenAI runtime drop-in.
8. Restart the API and confirm final mock runtime.
9. Check HTTPS health, admin unauthorized behavior, and LINE invalid-signature behavior.

## Loop 164 Result

```txt
openai_environment_file_connection=temporary
openai_model_fallback_smoke=performed_once
openai_model_fallback_smoke_status=failed
openai_model_fallback_error_class=OpenAiProviderError
openai_model_fallback_error_status=unavailable
openai_model_fallback_error_code=unavailable
openai_model_fallback_error_type=unavailable
openai_model_fallback_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_smoke_command_exit=1
```

## Rollback Result

```txt
openai_systemd_dropin_present_final=false
repository_runtime_final=supabase
ai_provider_final=mock
line_real_push_enabled=false
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
api_direct_health_loop164_final=200
https_api_health_loop164_final=200
admin_customers_no_header_loop164=401
line_invalid_signature_loop164=401
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

## Interpretation

The model fallback did not resolve the provider smoke failure. The classification remains `I_unknown_sanitized`, with no provider status/code/type available through the sanitized boundary.

Do not repeat paid smoke calls blindly. The next Loop should inspect request shape, provider transport, and network/runtime behavior using secret-safe probes and tests. Any future OpenAI API call still requires a separate explicit one-call approval.

## Next

```txt
Loop 165: OpenAI request-shape/provider transport remediation
```

## Loop 165 Follow-up

Loop 165 separated raw Responses API diagnostics from provider-boundary smoke.

```txt
raw_responses_smoke=performed_once
raw_responses_smoke_status=success
raw_responses_http_status=200
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=failed
provider_boundary_error_classification=I_unknown_sanitized
provider_boundary_retry_performed=no
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
openai_api_connectivity_ready=true
openai_provider_runtime_ready=false
production_readiness=production_no_go
```

The next OpenAI step should remediate provider output contract/parse behavior without another blind paid retry.

## Loop 166 Follow-up

Loop 166 confirmed that provider text extraction now succeeds, but the expected JSON output contract still fails.

```txt
provider_output_text_extracted=true
provider_boundary_error_classification=G_response_parse_bug
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
ai_provider_final=mock
openai_ready=false
production_readiness=production_no_go
```

Next focus: OpenAI provider JSON output contract remediation.

## Loop 167 Follow-up

OpenAI provider JSON parsing now succeeds, but schema validation still fails.

```txt
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=false
parse_stage=schema_validation
classification=G_response_parse_bug
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
ai_provider_final=mock
openai_ready=false
production_readiness=production_no_go
```

Do not treat model fallback as the remaining blocker unless a later smoke reclassifies the failure.

## Loop 168 Follow-up

The model fallback is no longer the active blocker. Loop 168 fixed schema-specific prompt/output alignment and the provider-boundary smoke succeeded.

```txt
provider_boundary_smoke_status=success
json_contract_schema_valid=true
schema_missing_fields=none
schema_invalid_fields=none
response_body_recorded=false
prompt_body_recorded=false
api_key_recorded=false
model_value_recorded=false
ai_provider_final=mock
openai_ready=true
production_readiness=production_no_go
```

OpenAI remains rollback-to-mock after smoke. Production remains No-Go until LINE real reply/push and final operator Go are complete.
