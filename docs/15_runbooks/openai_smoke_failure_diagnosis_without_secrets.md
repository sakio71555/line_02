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
