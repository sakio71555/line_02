# OpenAI Request Shape and Provider Transport Remediation

## Purpose

Record Loop 165: diagnose OpenAI provider smoke failure with a raw Responses API smoke and a provider-boundary smoke, without recording secrets or raw upstream content.

## Never Record

- OpenAI API key values.
- Authorization or bearer token values.
- OpenAI model values.
- OpenAI organization or project identifiers.
- Prompt body.
- Raw OpenAI response body.
- Raw OpenAI error message.
- LINE webhook path values, LINE user IDs, or LINE message bodies.
- Supabase endpoint values, keys, DB URLs, or Postgres URLs.

## Added Boundaries

```txt
raw_diagnostic_script=scripts/smoke/openai-raw-responses-smoke.ts
provider_two_stage_script=scripts/smoke/openai-provider-smoke.ts
provider_boundary_only_script=scripts/smoke/openai-provider-boundary-smoke.ts
provider_request_endpoint=Responses API
provider_request_store=false
provider_request_max_output_tokens=800
raw_request_max_output_tokens=16
```

The provider-boundary-only script exists so a VPS run can execute raw diagnostic once, then provider once, without repeating raw diagnostic after it already succeeded.

## Loop 165 Result

```txt
implementation_commit=71298679fc628252273c288825551ca4342aef96
parse_classification_commit=d57b2095ab904969a8d0d1ef96f7cb9fc579a614
vps_staging_validation=success
active_deploy=success
raw_responses_smoke=performed_once
raw_responses_smoke_status=success
raw_responses_http_status=200
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=failed
provider_boundary_error_class=OpenAiProviderError
provider_boundary_error_status=unavailable
provider_boundary_error_code=unavailable
provider_boundary_error_type=unavailable
provider_boundary_error_classification=I_unknown_sanitized
provider_boundary_retry_performed=no
openai_response_body_recorded=no
openai_prompt_body_recorded=no
openai_api_key_recorded=no
openai_model_value_recorded=no
openai_systemd_dropin_present_final=false
api_direct_health_final=200
https_api_health_final=200
admin_customers_no_header_final=401
line_invalid_signature_final=401
ai_provider_final=mock
openai_api_connectivity_ready=true
openai_provider_runtime_ready=false
production_readiness=production_no_go
```

## Interpretation

- Raw Responses API connectivity worked once with HTTP 200.
- Provider runtime smoke did not succeed.
- No second provider retry was run after parse-classification hardening.
- Final code now classifies provider output field mismatches as `G_response_parse_bug` in tests, reducing future `I_unknown_sanitized` cases without recording raw responses.

## Rollback

After the smoke:

```txt
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
production_readiness=production_no_go
```

## Next

```txt
Loop 166: OpenAI provider output contract remediation
```

## Loop 166 Follow-up

Loop 166 did not rerun the raw diagnostic. It added parser fixture coverage and ran provider-boundary smoke once.

```txt
provider_output_parser_remediation=applied
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=failed
provider_output_text_extracted=true
provider_boundary_error_classification=G_response_parse_bug
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
openai_systemd_dropin_present_final=false
ai_provider_final=mock
production_readiness=production_no_go
```

The remaining failure is now after text extraction, so the next Loop should focus on provider JSON output contract remediation.

## Loop 167 Follow-up

Loop 167 confirmed that provider output can be parsed as JSON, but still does not satisfy the expected provider method schema.

```txt
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
openai_ready=false
production_readiness=production_no_go
```

Next focus: schema-specific prompt/output alignment, without raw diagnostic rerun.

## Loop 168 Follow-up

Schema-specific prompt/output alignment succeeded without rerunning raw diagnostic.

```txt
raw_diagnostic_rerun=no
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=success
json_contract_parse_success=true
json_contract_schema_valid=true
parse_stage=none
schema_missing_fields=none
schema_invalid_fields=none
response_body_recorded=false
prompt_body_recorded=false
api_key_recorded=false
model_value_recorded=false
ai_provider_final=mock
production_readiness=production_no_go
```

Do not use this result to enable production automatically. LINE real reply/push and final operator Go remain separate gates.
