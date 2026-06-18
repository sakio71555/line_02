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
| Admin login/session boundary | fake auth clientでsign-in / refresh / logout / token provider連携を検証済み |
| production Auth runtime gate | `AUTH_SESSION_VERIFIER=supabase` でSupabase Auth client境界とStaffAuthLookup境界を自動構成できる |
| LINE real push gate | 複数gate、confirmation、idempotency、fake transport検証済み |
| OpenAI real API gate | 複数gate、draft-only、fake transport検証済み |
| VPS deployment plan | `taiyolabel.site` DNS/VPS audit、nginx/systemd/env templates、rollback plan追加済み |
| production start/port boundary | API/Admin start scriptsと `127.0.0.1:8788` / `127.0.0.1:3002` 境界追加済み |
| VPS dry deployment preflight | command pack、rollback、No-Go checklist追加済み |
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

- Admin UIの実Supabase Auth client注入とreal login/session/token smokeが未完了。
- real LINE送信UI、実transport、安全な送信先smoke、永続audit/idempotency storeが未完了。
- OpenAI real HTTP transport、本番接続、cost/rate limit運用、prompt logging policyが未完了。
- VPS deploy、SSL issue、nginx reload、systemd service作成、external smokeが未完了。
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
- Admin UI session controller境界。
- fake auth clientによるsign-in / session read / refresh / logout検証。
- Admin API helperへsession token providerを渡す境界。

未完了:

- 実Supabase Auth clientをAdmin UIへ注入すること。
- staging/production相当でreal login/session/token取得、refresh、logoutをsmokeすること。

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
- Loop 105ではfake auth clientからsessionを読み、token provider経由でAdmin API helperへ渡す境界を追加した。
- 実Supabase Auth client注入とreal login smokeは後続Loopで扱う。

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

## VPS Deployment Plan

Loop 106で `taiyolabel.site` 向けVPS deployment plan and templatesを追加した。

追加済み:

- `admin.taiyolabel.site` -> `127.0.0.1:3002` planned route。
- `api.taiyolabel.site` -> `127.0.0.1:8788` planned route。
- nginx HTTP bootstrap / SSL templates。
- systemd templates。
- API/Admin env examples。
- SSL/certbot、secret投入、LINE webhook、rollback、No-Go runbook。

Loop 107でproduction start/port boundaryを追加した。

追加済み:

- `@amami-line-crm/api` の `start: node dist/index.js`。
- `@amami-line-crm/admin` の `start: next start`。
- API production default `127.0.0.1:8788`。
- Admin production env `HOSTNAME=127.0.0.1` / `PORT=3002`。
- systemd templatesの `npx pnpm@10.12.1 --filter ... start`。

Loop 108でVPS dry deployment preflight command packを追加した。

追加済み:

- read-only audit command pack。
- backup command pack。
- release directory plan。
- secret injection checklist。
- dependency install / build plan。
- local service smoke plan。
- systemd registration plan。
- nginx HTTP bootstrap plan。
- certbot SSL plan。
- external smoke plan。
- LINE webhook URL plan。
- rollback runbook。
- No-Go checklist。

未実施:

- VPS SSH。
- nginx config install / `nginx -t` / reload。
- certbot issue。
- systemd install/start。
- production deploy / external smoke。
- production Supabase connection。
- Admin real login smoke。
- LINE webhook registration and real LINE smoke。
- OpenAI real smoke。

Repo-level start/port blockers from Loop 106 are resolved by Loop 107, but deployment remains No-Go until VPS install and smoke are performed.

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
- Loop 105時点ではfake auth client境界のみのため、real login smokeは未実施として扱う。
- VPS deploymentはLoop 108時点でもrunbook/templates/start boundary/preflight command packのみで、サーバー作業は未実施として扱う。
- selectedTenantIdのmissing/wrong/validを確認する。
- productionでdev headerが拒否されることを確認する。
- LINE/OpenAI flagsはoffのまま起動確認する。
- real enablementは別Loopの明示許可で行う。

## Final Judgment

`production_no_go`

理由:

- Admin UIのsession境界はfake auth clientで検証済みだが、実Supabase Auth client注入とreal login/session/token smokeが未完了。
- LINE本送信はgate済みだが、実送信UI、実transport、安全なrecipient smoke、永続audit/idempotency storeが未完了。
- OpenAI real API gateとfake transport境界は追加済みだが、実HTTP transport、本番接続、cost/rate limit運用は未完了。
- VPS deployment plan/templates、production start/port boundary、dry preflight command packは追加済みだが、SSL issue、systemd/nginx実配置、production smokeは未実施。

この判定は、Loop 108時点でもcontrolled production enablementへ進むには追加Loopが必要であることを示す。
