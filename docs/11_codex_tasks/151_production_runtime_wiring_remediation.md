# Loop 151: Production Runtime Wiring Remediation

## Goal

Loop 147-150で確認した「境界はあるがAPI startupへ未接続」という残課題を、最小実装で解消する。

今回の対象はruntime wiringのみ。

- `REPOSITORY_RUNTIME` でin-memory / Supabase repository bundleを切り替える。
- `AI_PROVIDER` でMock / OpenAI providerを切り替える。
- `LINE_REAL_PUSH_ENABLED` でMock / Real LINE client境界を切り替える。
- defaultは安全側のまま維持する。

## Scope

- `packages/config` にruntime configを追加。
- `apps/api/src/runtime-wiring.ts` を追加。
- `createApiApp()` のstartup pathでruntime factoryを使う。
- OpenAI Responses API向けfetch transport境界を追加。
- LINE Messaging API向けfetch transport境界を追加。
- local testで外部接続なしにfail-fastとdefault safetyを検証。
- docs / runbook / dev logを更新。

## Out of Scope

- Supabase実接続。
- Supabase migration / RLS変更。
- OpenAI実API smoke。
- LINE real push/reply smoke。
- `LINE_REAL_PUSH_ENABLED=true` の運用切替。
- Nginx / DNS / certbot変更。
- secret値、token、webhook path実値、LINE userId、message bodyの記録。
- production readinessのGo判定。

## Runtime Config

既存env名を正として扱う。

| Area | Env | Default | Allowed / Meaning |
| --- | --- | --- | --- |
| Repository | `REPOSITORY_RUNTIME` | `in_memory` | `in_memory` / `supabase` |
| AI | `AI_PROVIDER` | `mock` | `mock` / `openai` |
| LINE | `LINE_REAL_PUSH_ENABLED` | `false` | `true` のときだけreal client境界 |

`LINE_WEBHOOK_SECRET` はactive envとして使わない。Webhook URL pathは `LINE_WEBHOOK_SECRET_PATH` のみを使う。

## Implementation Summary

### Repository runtime

`createRuntimeRepositories(config)` を追加し、API startupから既存の `createCustomerMessageRepositoriesForRuntime()` を呼ぶ。

- default: `InMemoryCustomerRepository`, `InMemoryMessageRepository`, `InMemoryAlertRepository`, empty knowledge repository.
- `REPOSITORY_RUNTIME=supabase`: `SupabaseCustomerRepository`, `SupabaseMessageRepository`, `SupabaseAlertRepository`, `SupabaseKnowledgePageRepository`.
- required env不足時は `RuntimeWiringConfigError` でfail-fast。
- Supabase client作成時にmigrationやRLS適用は行わない。
- testではfake env / fake client境界だけを使い、実DBへ接続しない。

### AI runtime

`createRuntimeAiProvider(config)` を追加した。

- default: `MockAiProvider`.
- `AI_PROVIDER=openai`: `OpenAiProvider` + `FetchOpenAiResponsesTransport`.
- `OPENAI_API_KEY` / `OPENAI_MODEL` 不足時はfail-fast。
- startup時にOpenAI APIは呼ばない。
- AI結果は引き続き担当者支援用で、自動送信しない。

### LINE runtime

`createRuntimeLineClient(config)` を追加した。

- default: `MockLineClient`.
- `LINE_REAL_PUSH_ENABLED=false`: access tokenが設定されていてもmock mode。
- `LINE_REAL_PUSH_ENABLED=true`: `LINE_CHANNEL_ACCESS_TOKEN` が必要。
- real modeでは `RealLineClient` + `FetchLineMessagingTransport` を使う。
- startup時にLINE Messaging APIは呼ばない。
- existing real push gateは維持し、authenticated staff / selectedTenantId / confirmation / idempotencyが必要。

## API Startup Wiring

`createApiApp()` は、明示的なtest dependency injectionがない場合にruntime factoryを使う。

優先順位:

1. Test / caller injected repositories, provider, client
2. Runtime factory selection from env
3. Safe defaults

`/health` は外部接続を行わず、runtime selectionだけを表示する。

## Tests

`tests/integration/production-runtime-wiring-remediation.test.ts` を追加した。

確認内容:

- env未設定では `in_memory` / `mock` / LINE real push disabled。
- invalid runtime envは値を漏らさずfail-fast。
- Supabase selected + required env missingはfail-fast。
- Supabase selected + fake envはrepository selectionでき、実接続しない。
- OpenAI selected + key/model missingはfail-fast。
- OpenAI selected + fake key/modelはprovider selectionでき、実APIを呼ばない。
- LINE real push disabled + token configuredでもmock client。
- LINE real push enabled + token missingはfail-fast。
- LINE real push enabled + fake tokenはreal client selectionでき、startupでは送信しない。
- docsは `production_readiness=production_no_go` を維持し、secret値を記録しない。

## Result

```txt
runtime_wiring_ready=true
repository_runtime_switch=implemented
ai_provider_runtime_switch=implemented
line_client_runtime_switch=implemented
default_data_backend=in_memory
default_ai_provider=mock
default_line_real_push_enabled=false
supabase_connected=no
openai_real_api_smoke=not_performed
line_real_push_reply=not_performed
production_readiness=production_no_go
```

## Remaining No-Go Reasons

- Supabase実接続のcontrolled smoke未実施。
- OpenAI実APIのcontrolled smoke未実施。
- LINE real push/replyのsingle-message smoke未実施。
- LINE Official Account自動応答OFF確認が未完了。
- final operator Go/No-Go承認が未完了。

## Next Loop Candidate

Loop 152: Supabase staging connection execution
