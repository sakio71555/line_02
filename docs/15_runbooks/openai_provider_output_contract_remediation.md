# OpenAI Provider Output Contract Remediation

## Purpose

Loop 166 remediates the OpenAI provider output parser after Loop 165 proved raw Responses API connectivity but provider runtime readiness still failed.

## Secret Safety

Do not record:

- OpenAI API key values.
- Authorization or bearer token values.
- OpenAI model values.
- OpenAI prompt body.
- OpenAI raw response body or extracted response text.
- LINE webhook path values, LINE user IDs, or LINE message bodies.
- Supabase endpoint values, keys, DB URLs, or Postgres URLs.

Allowed status wording:

```txt
OPENAI_API_KEY configured; value not recorded
OPENAI_MODEL configured; value not recorded
provider_output_text_extracted=true/false
response_body_recorded=false
prompt_body_recorded=false
api_key_recorded=false
model_value_recorded=false
```

## Parser Contract

`extractOpenAiResponseText` accepts synthetic Responses API style payloads:

- `output_text` string。
- `outputText` string。
- `output[].content[].text` including `type=output_text`。
- `output[].text`。
- top-level `content[].text`。
- top-level `text`。

Blank text or unsupported shapes fail closed as:

```txt
classification=G_response_parse_bug
provider_output_text_extracted=false
raw_response_body_recorded=no
```

If text is extracted but the provider JSON contract does not match the expected fields, the error remains:

```txt
classification=G_response_parse_bug
provider_output_text_extracted=true
```

## Loop 166 Execution Summary

```txt
implementation_commit=f26501d704916709797bc2336e8cc6c3ab802779
raw_diagnostic_rerun=no
archive_sha256=f36bf47507907255d549d2f9c1f39783b2373ddbf6187620e1e6db712e9ca3d2
archive_policy=.env_git_node_modules_appledouble_excluded
staging_validation=success
active_backup=/root/deploy-backups/amami-line-crm/loop166-20260628-101224
active_source=f26501d704916709797bc2336e8cc6c3ab802779
```

## Provider Smoke Result

```txt
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=failed
provider_output_text_extracted=true
provider_boundary_error_classification=G_response_parse_bug
provider_boundary_retry_performed=no
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
```

Result interpretation:

- API key/network/model access are less likely than before.
- Provider text extraction now works.
- The remaining failure is the expected JSON output contract after extraction.

## Rollback

OpenAI runtime was rolled back after the single provider smoke:

```txt
openai_systemd_dropin_present_final=false
final_ai_provider=mock
line_real_push_enabled=false
api_direct_health_final=200
https_api_health_final=200
customers_no_header_final=401
line_invalid_signature_final=401
production_readiness=production_no_go
openai_ready=false
```

## Next Diagnostic Direction

Do not rerun raw diagnostic for the next Loop unless a new explicit approval is given.

Next work should focus on:

```txt
Loop 167: OpenAI provider JSON output contract remediation
```

## Loop 167 Follow-up

Loop 167 improved JSON parsing for extracted provider text and ran provider-boundary smoke once.

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

The remaining failure is no longer text extraction or JSON parsing. It is method-specific schema validation.

## Loop 168 Follow-up

Loop 168 tightened the OpenAI draft reply schema and provider prompt against the existing application contract.

```txt
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=true
parse_stage=none
schema_missing_fields=none
schema_invalid_fields=none
classification=success
response_body_recorded=false
prompt_body_recorded=false
api_key_recorded=false
model_value_recorded=false
ai_provider_final=mock
openai_ready=true
production_readiness=production_no_go
```

OpenAI provider output contract is ready at the controlled boundary, but OpenAI is not left enabled in runtime.
