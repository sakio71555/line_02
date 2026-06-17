# Loop 103: production readiness final gate

## Goal

production readinessを最終確認するため、OpenAI real API gate、OpenAI provider boundary、production Auth runtime監査、LINE real push gate監査、production readiness final runbookを追加する。

本物LINE送信、OpenAI API実呼び出し、production接続、production deployは行わない。

## Scope

- OpenAI real API gateを追加した。
- OpenAI provider boundaryをfake transportで検証できる形にした。
- OpenAI API key / model / tenant AI settings / RAG source / draft-only / no auto-send gateを固定した。
- production runtime SupabaseAuthSessionVerifier / StaffAuthLookup構成を監査した。
- LINE real push gateの最終条件をrunbookへ反映した。
- production readiness final checklistを追加した。
- README、database docs、dev loop、runbooks、dev logを更新した。
- lint / typecheck / test / test:integration / buildで確認する。

## Out of Scope

- 本物LINE API送信。
- OpenAI API実呼び出し。
- production DB接続。
- production deploy / production smoke。
- `.env.production` 作成。
- secret/token/key/project ref/DB URL表示。
- RLS SQL変更。
- migration SQL変更。
- GRANT変更。
- Supabase Auth user作成。
- Web crawl / embedding / pgvector。
- package依存追加。

## Starting State

- latest commit: `e00aeff feat: add LINE real push gate`
- branch: `main...origin/main`
- starting worktree: clean
- staging拡張検証版、RLS staging apply、authenticated role/JWT smoke、staging real Auth smoke、Admin selectedTenantId、token forwarding、production Auth runtime gate、LINE real push gateは完了済み。

## OpenAI Real API Gate

実装場所:

```text
packages/ai/src/index.ts
tests/integration/openai-real-api-gate.test.ts
docs/15_runbooks/openai_real_api_gate.md
```

追加:

- `resolveAiProviderMode`
- `evaluateOpenAiRealApiGate`
- `TenantAiSettingsForOpenAiGate`
- `OpenAiProvider`
- `OpenAiResponsesTransport`
- `OpenAiProviderError`

確認したgate:

- defaultはmock。
- `AI_PROVIDER=openai` だけでは不十分。
- `OPENAI_API_KEY` がない場合は不可。
- `OPENAI_MODEL` がない場合は不可。
- tenant AI settingsがない、またはOpenAI許可なしなら不可。
- 対象feature disabledなら不可。
- RAG sourceなしなら不可。
- auto-send要求または `auto_reply_enabled=true` は不可。

## OpenAI Provider Boundary

`OpenAiProvider` はResponses API shapeのrequestを組み立てるが、Loop 103ではfake transportだけを使う。実HTTP transport、OpenAI SDK実呼び出し、OpenAI APIへのfetchは行わない。

テストでは以下を確認した。

- fake transportへmodel、metadata、json_object formatを渡す。
- `draft_only=true`、`auto_send=false` をmetadataに含める。
- global fetchを呼ばない。
- transport errorにAPI key、prompt全文、raw errorを含めない。

## Production Runtime Auto Config Audit

既存の `createProductionAdminAuthRuntimeDependencies` を監査し、追加testで以下を確認した。

- production runtimeは `AUTH_SESSION_VERIFIER=supabase` がない限りSupabase verifierへ進まない。
- supabase modeでもclientまたはStaffAuthLookupが不足していればruntimeを作らない。
- fake Supabase auth client / fake StaffAuthLookupの明示注入で `SupabaseAuthSessionVerifier` 経由のauthenticated runtimeが成立する。
- token、secret、project refはresultへ出さない。

残差分:

- `apps/api` はまだ `@amami-line-crm/db` に依存していないため、production runtimeで実Supabase client / StaffAuthLookup repositoryを自動構成していない。
- Admin UIの実login/session/token取得、refresh、logoutは未実装。

## LINE Real Push Gate Audit

Loop 102のgateを最終runbookへ反映した。

real push pathは以下がすべて必要。

- `LINE_MESSAGING_ENABLED=true`
- `LINE_REAL_PUSH_ENABLED=true`
- authenticated_staff
- `send_staff_reply`
- selectedTenantId再検証
- customer tenant一致
- 送信前確認
- idempotency key

本物LINE送信は未実施。

## Production Readiness Final Checklist

追加:

```text
docs/15_runbooks/production_readiness_final.md
tests/integration/production-readiness-final.test.ts
```

最終判定:

```text
production_no_go
```

理由:

- production runtimeのSupabase Auth client / StaffAuthLookup自動構成が未完了。
- Admin UIの実login/session/token取得が未完了。
- LINE real pushはgate済みだが、実送信UI、実transport、安全recipient smoke、永続audit/idempotency storeが未完了。
- OpenAI real APIはgateとfake transport境界済みだが、実HTTP transport、本番接続、cost/rate limit運用が未完了。
- production deploy / production smokeは未実施。

## Tests

追加:

- `tests/integration/openai-real-api-gate.test.ts`
- `tests/integration/production-runtime-auth-config.test.ts`
- `tests/integration/production-readiness-final.test.ts`

確認:

- OpenAI gateとprovider fake transport。
- production Auth runtime gateのsafe failure / explicit fake dependency path。
- final runbookの `production_no_go` 判定。
- 実OpenAI API、LINE API、production DBへ接続しない。
- secret/token/project ref/DB URLを書かない。

## Residual Risks

- production readiness is No-Go.
- production Auth/JWT runtime auto configは未完了。
- Admin login/session/token取得は未完了。
- LINE/OpenAI real enablementは別Loopの明示許可が必要。
- production deploy/smokeは未実施。

## Next Loop Candidates

```text
Loop 104: production Auth runtime auto wiring plan
Loop 105: Admin login/session minimal integration
Loop 106: OpenAI real HTTP transport staging-safe plan
```
