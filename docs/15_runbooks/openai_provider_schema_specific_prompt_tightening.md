# OpenAI Provider Schema-Specific Prompt Tightening

## Status

```txt
loop=168
openai_ready=true
line_reply_push_ready=false
production_readiness=production_no_go
```

Loop 168 closes the OpenAI `draftReply` schema mismatch found in Loop 167. The OpenAI provider now asks for, validates, and maps the same reply draft fields that `MockAiProvider`, API routes, and Admin UI expect.

This does not make production Go. The API service is rolled back to mock AI after the smoke, and LINE real reply/push remains disabled.

## Safety Boundary

- Do not rerun the raw OpenAI diagnostic smoke.
- Run provider-boundary smoke at most once per approved Loop.
- Do not record OpenAI response body, extracted text, prompt body, API key, model value, organization id, or project id.
- Do not record LINE webhook path values, LINE user IDs, LINE message bodies, Supabase endpoint values, keys, DB URLs, or private keys.
- Remove the OpenAI systemd drop-in after smoke and confirm `AI_PROVIDER=mock`.
- Keep `LINE_REAL_PUSH_ENABLED=false`.
- Keep `production_readiness=production_no_go`.

## Draft Reply JSON Contract

OpenAI `draftReply` output must be one JSON object with these required fields:

```txt
draft_body=non_empty_string
next_questions=string_array
risk_flags=string_array
recommended_response_mode=bot_auto|human_required|human_active|emergency|closed
should_handoff=boolean
```

The provider adds `provider=openai` after validation. Extra fields are ignored after the required contract passes.

## Schema Diagnostics

Allowed diagnostic output:

```txt
schema_missing_fields=<field names only>
schema_invalid_fields=<field names only>
json_contract_parse_success=true|false
json_contract_schema_valid=true|false
parse_stage=none|text_extraction|json_parse|schema_validation|provider_mapping|unknown
```

Forbidden diagnostic output:

```txt
raw_json=never
extracted_text=never
prompt_body=never
response_body=never
api_key=never
model_value=never
```

## Loop 168 Result

```txt
implementation_commit=8b2550f76de5d30b196d1f9d0fbe5e8cf71c46c4
archive_sha256=b5aafbc97012c4e8879d08f88757fdd7d61891637ffcec05b5a324dcf6efb50d
archive_policy=.env_git_node_modules_appledouble_excluded
vps_staging_validation=success
active_deploy=success
raw_diagnostic_rerun=no
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=success
request_sent=true
response_received=true
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=true
parse_stage=none
schema_missing_fields=none
schema_invalid_fields=none
classification=success
response_body_recorded=false
prompt_body_recorded=false
prompt_recorded=false
api_key_recorded=false
model_value_recorded=false
openai_systemd_dropin_present_final=false
ai_provider_final=mock
line_real_push_enabled=false
api_direct_health_final=200
https_api_health_final=200
customers_no_header_final=401
line_invalid_signature_final=401
openai_ready=true
production_readiness=production_no_go
```

## Interpretation

The remaining Loop 167 blocker was method-specific schema validation. Loop 168 confirms:

- OpenAI request reached the provider boundary.
- A response was received.
- Provider output text was extracted.
- JSON parsing succeeded.
- Draft reply schema validation succeeded.
- No response body, prompt body, key, or model value was recorded.
- The runtime was rolled back to mock AI.

OpenAI provider readiness is now true for the controlled boundary, but production remains No-Go until LINE real reply/push and final operator Go are handled in separate Loops.

## Next

```txt
Loop 169: LINE real reply/push controlled smoke planning
```
