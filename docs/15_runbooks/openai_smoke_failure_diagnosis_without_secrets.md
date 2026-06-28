# OpenAI Smoke Failure Diagnosis Without Secrets

## Purpose

Record the Loop 163 procedure for diagnosing OpenAI smoke failures while keeping all secret and sensitive values out of docs, logs, commits, and chat.

## Never Record

- OpenAI API key values.
- OpenAI model values.
- Authorization or bearer tokens.
- Prompt body.
- Raw OpenAI response body.
- LINE webhook path values.
- LINE user identifiers or message bodies.
- Supabase endpoint values, keys, DB URLs, or Postgres URLs.

## Sanitized Diagnostic Fields

The internal smoke command may record only these status-level fields:

```txt
openai_smoke=success|failed|not_performed
provider=openai|not_openai
model=configured; value not displayed
request_sent=true|false
response_received=true|false
response_body_recorded=false
prompt_body_recorded=false
prompt_recorded=false
api_key_recorded=false
error_class=OpenAiProviderError
error_status=unavailable|number
error_code=unavailable|provider_code
error_type=unavailable|provider_type
error_classification=A_env_missing_or_malformed|B_model_missing_or_invalid|C_auth_or_key_rejected|D_quota_or_billing_or_project_access|E_network_or_timeout|F_request_shape_or_provider_mapping_bug|G_response_parse_bug|H_provider_transport_bug|I_unknown_sanitized
```

## Loop 163 Result

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
openai_key_replacement_smoke=performed_once
openai_key_replacement_smoke_status=failed
openai_key_replacement_error_classification=I_unknown_sanitized
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
production_readiness=production_no_go
```

## Final Health Checks

```txt
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
https_customers_page=200
admin_customers_no_header=401
line_invalid_signature=401
```

## Interpretation

The smoke reached the OpenAI provider boundary and sent the request, but the sanitized diagnostics still classified the failure as `I_unknown_sanitized`. Replacing the API key did not change the classification. Because raw response bodies are intentionally not recorded, the next Loop should diagnose network/runtime/provider behavior with secret-safe probes rather than repeating paid smoke calls blindly.

## Required Rollback

After any OpenAI smoke:

```txt
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
production_readiness=production_no_go
```

## Next

```txt
Loop 164: OpenAI smoke unknown error remediation
```

## Loop 164 Follow-up

Loop 164 used the operator-configured model fallback value without recording the value and ran one additional approved provider-level smoke.

```txt
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
openai_systemd_dropin_present_final=false
ai_provider_final=mock
openai_ready=false
production_readiness=production_no_go
```

The fallback did not change the sanitized classification. Do not perform another paid retry until request shape, provider transport, or runtime behavior has been remediated without recording raw provider output.

## Loop 165 Follow-up

Loop 165 added a raw Responses API diagnostic and provider-boundary-only smoke.

```txt
raw_responses_smoke_status=success
raw_responses_http_status=200
provider_boundary_smoke_status=failed
provider_boundary_error_classification=I_unknown_sanitized
provider_boundary_retry_performed=no
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
ai_provider_final=mock
production_readiness=production_no_go
```

Raw API connectivity is available, but provider runtime readiness is still false.

## Loop 166 Follow-up

After Loop 165 raw Responses API HTTP 200 and Loop 166 parser remediation, the failure is no longer classified as unknown.

```txt
provider_output_text_extracted=true
provider_boundary_error_classification=G_response_parse_bug
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
```

Next focus: extracted provider text must satisfy the JSON output contract.

## Loop 167 Follow-up

Loop 167 remediated extracted-text JSON parsing and performed one provider-boundary smoke. The raw diagnostic smoke was not rerun.

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
ai_provider_final=mock
line_real_push_enabled=false
openai_ready=false
production_readiness=production_no_go
```

The remaining blocker is method-specific schema validation, not API key replacement, raw API connectivity, or JSON parsing.
