# Loop 168: OpenAI provider schema-specific prompt tightening

## Goal

Align the OpenAI `draftReply` prompt, parser guard, provider mapping, smoke output, docs, and tests with the existing `AiProvider` reply draft contract.

Loop 167 proved that provider output text extraction and JSON parsing worked, but schema validation failed. Loop 168 narrows the remaining gap to the exact field contract used by the application.

## Scope

- Identify the existing `draftReply` contract from code.
- Keep `MockAiProvider`, API response shape, Admin UI expectations, and OpenAI provider mapping aligned.
- Tighten the OpenAI draft reply instruction so the provider asks for only the expected JSON fields.
- Add schema diagnostics that expose missing/invalid field names only.
- Keep raw OpenAI response bodies, extracted text, prompt body, API key, and model value out of stdout, docs, commits, and final reports.
- Add synthetic tests for valid, missing, invalid, and extra-field draft reply JSON.
- Run one approved provider-boundary smoke after VPS copy-based redeploy.
- Roll back to `AI_PROVIDER=mock` after the smoke.

## Out of Scope

- OpenAI raw diagnostic smoke rerun.
- Multiple provider smoke attempts or retry.
- OpenAI always-on runtime.
- Recording prompt body or OpenAI response body.
- LINE real push/reply.
- Supabase migration, RLS, or write smoke.
- Nginx, DNS, certbot, reload, or restart changes.
- Production Go.

## Draft Reply Contract

The OpenAI JSON object for `draftReply` must include these required fields:

| field | type | required | notes |
| --- | --- | --- | --- |
| `draft_body` | non-empty string | yes | reply draft text for staff review |
| `next_questions` | string array | yes | questions the staff should confirm next |
| `risk_flags` | string array | yes | safety or business-risk notes |
| `recommended_response_mode` | response mode enum | yes | one of `bot_auto`, `human_required`, `human_active`, `emergency`, `closed` |
| `should_handoff` | boolean | yes | true when staff handoff is recommended |

`provider` is added by provider mapping after validation and is not part of the OpenAI JSON contract.

Extra JSON fields are ignored after the required contract passes. Missing fields and invalid fields are reported by field name only.

## Contract Alignment

```txt
MockAiProvider returns=draft_body,next_questions,risk_flags,recommended_response_mode,should_handoff,provider
OpenAI provider validates=draft_body,next_questions,risk_flags,recommended_response_mode,should_handoff
API route expects=draft_body,next_questions,risk_flags,recommended_response_mode,should_handoff,provider
provider smoke validates=draft_body,next_questions,risk_flags,recommended_response_mode,should_handoff
schema_extra_fields=ignored
```

## Implementation Summary

- Added a shared required-field list for the OpenAI draft reply JSON contract.
- Added draft reply schema validation before provider mapping.
- Added field-name-only diagnostics:
  - `schema_missing_fields=<field names only>`
  - `schema_invalid_fields=<field names only>`
- Tightened the draft reply instruction to require only JSON and forbid markdown/code fences/surrounding prose.
- Updated the provider boundary smoke output to include missing/invalid field diagnostics.
- Kept the raw diagnostic command unexecuted.

## VPS Result

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

## Test Coverage

- Required field list matches the draft reply contract.
- Mock and OpenAI provider draft shapes are aligned.
- Valid JSON with extra fields is accepted.
- Missing fields fail with `schema_missing_fields` only.
- Invalid fields fail with `schema_invalid_fields` only.
- Smoke output records field names and safety booleans, but not raw provider output, prompt body, key, or model value.
- Docs/runbook coverage records Loop 168 without secret-shaped values.

## Remaining Risks

- OpenAI provider boundary smoke succeeded, but the production OpenAI path is still not enabled permanently.
- LINE real reply/push has not been smoked and remains disabled.
- Final operator Go has not been recorded.
- Production readiness remains `production_no_go`.

## Next

Loop 169: LINE real reply/push controlled smoke planning
