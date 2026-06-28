# Loop 166: OpenAI provider output contract remediation

## Goal

Loop 165で raw Responses API diagnostic smoke はHTTP 200に到達したが、provider-boundary smokeが失敗した。Loop 166では、provider parser / output contractをsynthetic fixtureで堅牢化し、OpenAI provider smokeを1回だけ再確認する。

## Scope

- Responses API風payloadから非空textを抽出するparserを追加・export。
- `output_text`、`output[].content[].text`、`output[].text`、`content[].text`、`text` styleをsynthetic fixtureで検証。
- parse失敗時は `G_response_parse_bug` へ分類し、raw response bodyをError/stdout/docsへ出さない。
- provider smoke出力に `provider_output_text_extracted` を追加。
- VPS copy-based redeploy、OpenAI EnvironmentFile一時接続、provider-boundary smoke 1回、rollback to mockを実施。
- docs / runbook / dev logを更新。

## Out of Scope

- OpenAI raw diagnostic smokeの再実行。
- 追加OpenAI retry。
- OpenAI常時有効化。
- OpenAI response本文、prompt本文、model値、API keyの記録。
- 5.5系モデルへの戻し。
- LINE real push/reply。
- Supabase migration / write smoke / RLS変更。
- Nginx / DNS / certbot変更。
- `.env` 表示・変更。
- `production_go` 化。

## Implementation

```txt
implementation_commit=f26501d704916709797bc2336e8cc6c3ab802779
parser_function=extractOpenAiResponseText
normalizer_function=normalizeOpenAiResponsesPayload
smoke_output_field=provider_output_text_extracted
provider_output_text_extracted_failure_classification=G_response_parse_bug
```

The parser trims extracted text and rejects blank strings. Unsupported shapes throw `OpenAiProviderError` with `classification=G_response_parse_bug` and `providerOutputTextExtracted=false`. Provider JSON contract mismatches after text extraction still classify as `G_response_parse_bug` with `providerOutputTextExtracted=true`.

## Synthetic Fixture Coverage

- top-level `output_text` string。
- nested `output[].content[].type=output_text` with text。
- nested `output[].content[].text` without relying on type。
- `output[]` item text。
- top-level `content[].text`。
- top-level `text`。
- blank text rejection。
- unsupported shape rejection without raw body in error message。

## VPS Deployment

```txt
archive_sha256=f36bf47507907255d549d2f9c1f39783b2373ddbf6187620e1e6db712e9ca3d2
archive_policy=.env_git_node_modules_appledouble_excluded
staging_path=/root/deploy-staging/amami-line-crm/loop166-f26501d-r2-20260628-101224/source
staging_validation=success
active_backup=/root/deploy-backups/amami-line-crm/loop166-20260628-101224
active_source=f26501d704916709797bc2336e8cc6c3ab802779
```

The first local archive attempt was rejected before active deploy because Mac AppleDouble files would have broken VPS lint. The final archive was rebuilt with AppleDouble files excluded.

## Provider Smoke Result

```txt
raw_diagnostic_rerun=no
provider_boundary_smoke=performed_once
provider_boundary_smoke_status=failed
provider_output_text_extracted=true
provider_boundary_error_classification=G_response_parse_bug
response_body_recorded=no
prompt_body_recorded=no
api_key_recorded=no
model_value_recorded=no
provider_retry_performed=no
```

Interpretation: provider now receives/extracts text, but the extracted text does not satisfy the expected provider JSON contract. The next remediation should focus on JSON output contract/instructions, not API key, network, or model access.

## Rollback / Safety

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

## Tests

- `tests/integration/openai-response-parser-contract.test.ts`
- `tests/integration/openai-provider-smoke-script.test.ts`
- full local `lint` / `typecheck` / `test` / `test:integration` / `build`
- VPS staging `install` / `lint` / `typecheck` / `test` / `test:integration` / `build`

## Next

```txt
Loop 167: OpenAI provider JSON output contract remediation
```
