# OpenAI Provider JSON Output Contract Remediation

## Status

```txt
loop=167
production_readiness=production_no_go
openai_ready=false
```

Loop 167は、OpenAI providerが抽出したtextを既存 `AiProvider` object contractへ安全にparse / validateするためのremediation runbookである。

## Safety Boundary

- OpenAI raw diagnostic smokeは再実行しない。
- provider-boundary smokeは1回だけ実行する。
- OpenAI response本文、抽出text、prompt本文、API key、model実値は記録しない。
- smoke後は成功/失敗に関係なく `AI_PROVIDER=mock` へrollbackする。
- LINE real push/reply、Supabase write/migration/RLS、Nginx/DNS/certbot変更は行わない。

## Parser Contract

`parseOpenAiJsonContractText` は、抽出済みtextからJSON object候補を作る。

- compact JSON object
- pretty JSON object
- markdown `json` code fence
- 前後空白
- 軽微な前後説明付きの最初のbalanced JSON object

JSON parseに失敗した場合:

```txt
classification=G_response_parse_bug
provider_output_text_extracted=true
json_contract_parse_success=false
json_contract_schema_valid=false
parse_stage=json_parse
```

schema validationに失敗した場合:

```txt
classification=G_response_parse_bug
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=false
parse_stage=schema_validation
```

## Smoke Output Contract

成功時:

```txt
openai_provider_smoke=success
request_sent=true
response_received=true
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=true
parse_stage=provider_mapping
response_body_recorded=false
prompt_body_recorded=false
api_key_recorded=false
model_value_recorded=false
classification=success
```

失敗時:

```txt
openai_provider_smoke=failed
request_sent=true/false
response_received=true/false
provider_output_text_extracted=true/false
json_contract_parse_success=true/false
json_contract_schema_valid=true/false
parse_stage=text_extraction/json_parse/schema_validation/provider_mapping/unknown
response_body_recorded=false
prompt_body_recorded=false
api_key_recorded=false
model_value_recorded=false
classification=G_response_parse_bug/C_auth_or_key_rejected/etc
```

## Loop 167 Result

```txt
implementation_commit=d00ba462021a36429ae2c8c62f1d33fd74318b8d
archive_sha256=6facb91c2c83e31b67a5df5f3fbed985d096f0db33316ab7b55f81a02e66a153
staging_validation=success
active_deploy=success
raw_diagnostic_rerun=no
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=failed
request_sent=true
response_received=true
provider_output_text_extracted=true
json_contract_parse_success=true
json_contract_schema_valid=false
parse_stage=schema_validation
classification=G_response_parse_bug
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
production_readiness=production_no_go
```

## Interpretation

Loop 167 confirms the provider now reaches JSON parsing successfully.
The remaining failure is schema validation, so the next remediation should focus on method-specific output schema alignment rather than API key, network, or response text extraction.

## Next

Loop 168: OpenAI provider schema-specific prompt tightening
