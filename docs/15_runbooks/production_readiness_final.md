# Production Readiness Final Gate

## Purpose

productionへ進む直前に、staging検証、Auth/JWT、RLS、selectedTenantId、Admin UI token forwarding、LINE real push gate、OpenAI real API gateを一括で確認し、Go / No-Goを正直に判定する。

このrunbookでは本物LINE送信、OpenAI API実呼び出し、production DB接続、production deploy、production smokeは行わない。

## Current State

| area | status |
| --- | --- |
| staging CRM smoke | customers/messages、alerts、knowledge/RAG、real Auth user smoke済み |
| RLS | staging apply済み、authenticated role/JWT claim相当smoke済み |
| production dev header rejection | 実装済み |
| selectedTenantId | Admin UI保存と `x-selected-tenant-id` forwarding済み |
| Admin token forwarding | Bearer token provider境界済み、token保存/表示なし |
| production Auth runtime gate | `AUTH_SESSION_VERIFIER=supabase` でSupabase Auth client境界とStaffAuthLookup境界を自動構成できる |
| LINE real push gate | 複数gate、confirmation、idempotency、fake transport検証済み |
| OpenAI real API gate | 複数gate、draft-only、fake transport検証済み |
| production deploy/smoke | 未実施 |

## Go Conditions

controlled production enablementへ進むには、少なくとも以下が必要です。

- production envで `x-tenant-id` / dev_header が拒否される。
- production Admin routeが `Authorization: Bearer` を必須にする。
- production runtimeでfake verifierがdefaultにならない。
- production runtimeでSupabase Auth clientとStaffAuthLookupが安全に自動構成される。
- Admin login/session/token取得とrefresh/logoutが実装・検証済み。
- selectedTenantIdがactive membershipで再検証される。
- RLSがproduction apply前にstagingでverified済み。
- LINE real pushはflags、authenticated_staff、permission、tenant一致、confirmation、idempotencyなしでは動かない。
- OpenAI real APIはprovider/key/model/tenant AI setting/RAG source/draft-only gateなしでは動かない。
- secrets、project ref、DB URL、token、LINE userId、実顧客情報をdocs/logへ出さない。
- rollback/recovery手順がある。

## No-Go Conditions

以下が残る場合はproduction No-Goです。

- Admin UIの実login/session/token取得が未完了。
- real LINE送信UI、実transport、安全な送信先smoke、永続audit/idempotency storeが未完了。
- OpenAI real HTTP transport、本番接続、cost/rate limit運用、prompt logging policyが未完了。
- production接続やsecret表示が必要になる。

## Auth/JWT

済み:

- `SupabaseAuthSessionVerifier` 境界。
- fake Supabase auth client test。
- staging real Auth user smoke。
- production fake verifier default禁止。
- `AUTH_SESSION_VERIFIER=supabase` と明示注入されたclient/lookupでruntimeを作るgate。
- production runtimeでSupabase Auth client境界とStaffAuthLookup境界を自動構成するfactory。
- required env不足やruntime例外をsecret/token/URLなしでsafe failureすること。

未完了:

- Admin UIで実login/session/token取得、refresh、logoutを行うこと。

## selectedTenantId

- `selectedTenantId` はpermissionではなくselector。
- Admin UIは非secretのtenant selectorだけをlocalStorage/cookieへ保存する。
- Admin API helperは `x-selected-tenant-id` を送る。
- API側authenticated_staff runtimeでactive membership再検証後のtenantだけをrepositoryへ渡す。

## RLS

- core RLS SQLはstaging apply済み。
- authenticated role/JWT claim相当smoke済み。
- staging real Auth user smokeで `auth.uid()` と `staff_users.auth_user_id` の接続をdummy dataで確認済み。
- service_roleはserver-side onlyで、RLS bypass前提のためproduction authorizationの代替にしない。

## Production Dev Header Rejection

- production modeではAdmin routeの `x-tenant-id` / dev_header pathを拒否する。
- `x-selected-tenant-id` 単体を認証扱いしない。
- dev seed routeはproductionで拒否する。

## Admin UI Token Forwarding

- Admin API helperはaccess token providerから受け取ったtokenを `Authorization: Bearer` headerへだけ載せる。
- tokenはlocalStorage、cookie、UI、docs、dev log、error messageへ保存・表示しない。
- production-style configでは開発用 `x-tenant-id` を送らない。

## LINE Real Push Gate

real push pathは以下がすべて必要です。

- `LINE_MESSAGING_ENABLED=true`
- `LINE_REAL_PUSH_ENABLED=true`
- authenticated_staff runtime
- `send_staff_reply` permission
- `x-selected-tenant-id` present and membership revalidated
- customer tenant match
- send confirmation
- idempotency key

Loop 103では本物LINE API送信は未実施。

## OpenAI Real API Gate

real OpenAI pathは以下がすべて必要です。

- `AI_PROVIDER=openai`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- tenant AI settingsでOpenAIと対象機能がenabled
- RAG answer draftではsourceあり
- draft-only
- auto-sendなし

Loop 103ではOpenAI API実呼び出しは未実施。

## Staging Smoke

stagingでは以下をdummy dataで確認済み。

- customers/messages Supabase runtime smoke。
- alerts Supabase runtime smoke。
- knowledge_pages/RAG Supabase runtime smoke。
- RLS staging apply。
- authenticated role / JWT claim相当RLS smoke。
- real Auth user smoke。

## Secret Handling

docs、dev log、test snapshot、error responseに以下を書かない。

- Supabase URL/key/project ref/DB URL/password。
- Authorization token。
- JWT secret。
- LINE channel token / secret。
- LINE userId実値。
- OpenAI API key。
- 実顧客情報。

## Rollback / Recovery

- production deploy前にDB backup、migration rollback/recovery、service role grant recovery、feature flag rollbackを確認する。
- LINE/OpenAI real enablementはfeature flagsで停止できる状態にする。
- production smokeはsafe tenant / safe recipient / dummy dataに限定する。

## Manual Checks Before Production Enablement

- production env valuesは値非表示でpresence/safetyだけ確認する。
- Admin loginで実Bearer tokenを取得し、表示しない。
- selectedTenantIdのmissing/wrong/validを確認する。
- productionでdev headerが拒否されることを確認する。
- LINE/OpenAI flagsはoffのまま起動確認する。
- real enablementは別Loopの明示許可で行う。

## Final Judgment

`production_no_go`

理由:

- Admin UIの実login/session/token取得が未完了。
- LINE本送信はgate済みだが、実送信UI、実transport、安全なrecipient smoke、永続audit/idempotency storeが未完了。
- OpenAI real API gateとfake transport境界は追加済みだが、実HTTP transport、本番接続、cost/rate limit運用は未完了。
- production deploy / production smokeは未実施。

この判定は、Loop 104時点でもcontrolled production enablementへ進むには追加Loopが必要であることを示す。
