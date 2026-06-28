# Loop 167: OpenAI Provider JSON Output Contract Remediation

## Purpose

Loop 166でOpenAI Responses API風の出力本文抽出は成功したが、provider smokeはJSON contract不一致として `G_response_parse_bug` で失敗した。
Loop 167では、抽出済みtextを既存 `AiProvider` interfaceが期待するJSON objectへ安全にparse / validateする境界を固めた。

## Scope

- `OpenAiProvider` のJSON output parserを改善する。
- `draftReply` / summary / RAG answer draftの期待JSON object contractをprompt側でも明示する。
- code fence、前後空白、pretty / compact JSON、軽微な前後説明付きJSONをsynthetic fixtureで検証する。
- schema validation失敗時にraw JSONや実API本文を出さず、`G_response_parse_bug` と `parse_stage` で分類する。
- provider smoke outputに `json_contract_parse_success`、`json_contract_schema_valid`、`parse_stage`、`model_value_recorded=false` を追加する。
- VPS copy-based redeploy、OpenAI EnvironmentFile一時接続、provider-boundary smokeを1回だけ実行し、必ずmockへrollbackする。

## Out of Scope

- OpenAI raw diagnostic smoke再実行。
- provider smoke retry。
- OpenAI response本文、prompt本文、API key、model実値の記録。
- OpenAI常時有効化。
- LINE real push/reply。
- Supabase migration/RLS/write smoke。
- Nginx/DNS/certbot変更、reload/restart。
- production Go化。

## Contract Summary

既存 `AiProvider` public interfaceはobject contractを返す。

- `summarizeConversation`: `summary`, `next_actions`, `risk_flags`, `recommended_response_mode`
- `draftReply`: `draft_body`, `next_questions`, `risk_flags`, `recommended_response_mode`, `should_handoff`
- `draftRagAnswer`: `can_answer`, `answer_body`, `risk_flags`, `handoff_required`, `recommended_response_mode`

provider smokeは `draftReply` を通すため、返信下書きcontractに合わせる。

## Implementation

- `parseOpenAiJsonContractText` を追加し、抽出済みtextからJSON object候補を安全にparseする。
- markdown `json` code fence、前後空白、compact / pretty JSON、最初のbalanced JSON object抽出に対応した。
- parse失敗は `parse_stage=json_parse`、schema不一致は `parse_stage=schema_validation` として扱う。
- schema mismatch時のerror messageにraw JSONや抽出textを含めない。
- provider smoke出力を本文なしのboolean/status/classificationへ寄せた。

## Test Coverage

- compact JSON object。
- pretty JSON object。
- markdown code fence。
- 前後空白。
- 軽微な前後説明付きのbalanced JSON object。
- 空文字 / 壊れたJSON。
- missing field / invalid type のschema validation。
- smoke stdoutに抽出text、prompt、model実値、API key、raw response bodyが出ないこと。
- 既存MockAiProvider挙動を壊さないこと。

## VPS Result

```txt
implementation_commit=d00ba462021a36429ae2c8c62f1d33fd74318b8d
archive_sha256=6facb91c2c83e31b67a5df5f3fbed985d096f0db33316ab7b55f81a02e66a153
staging_validation=success
active_deploy=success
api_direct_health_loop167_deploy=200
https_api_health_loop167_deploy=200
```

## OpenAI Provider Smoke Result

```txt
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
```

## Rollback / Safety

```txt
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

Loop 167で、抽出済みtextからJSON objectをparseする境界は改善された。
provider smokeでは `json_contract_parse_success=true` まで進んだため、JSONとしてはparseできている。
残る失敗は `schema_validation` であり、実API出力のfield contractが `draftReply` の期待shapeとまだ一致していない。

## Remaining Risks

- `openai_ready=false`。
- OpenAI provider smokeはschema validationで未成功。
- LINE real reply/pushは未実施。
- final operator Goは未記録。
- production readinessは引き続き `production_no_go`。

## Next Loop

Loop 168: OpenAI provider schema-specific prompt tightening
