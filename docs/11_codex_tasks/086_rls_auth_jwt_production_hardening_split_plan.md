# Loop 086: RLS/Auth/JWT production hardening split plan

## Goal

Loop 085でcustomers/messages/alerts/knowledge_pages/RAGのstaging smokeが揃い、staging拡張検証版100%相当に到達した。

ただしproductionはまだNo-Goである。Loop 086では、RLS/Auth/JWT/selectedTenantId/production dev_header rejection/LINE/OpenAI gateを一度に実装せず、production hardeningを小さいLoopへ分割する。

## Scope

- 現在地をstaging拡張検証版100%相当として整理する。
- production No-Go理由を再確認する。
- RLS/Auth/JWT/selectedTenantId/production dev_header rejection/service_role/LINE/OpenAIの依存関係を整理する。
- Loop 087以降の分割案を作る。
- docsとdocs integration testを追加する。

## Out of Scope

- RLS SQL実装。
- `ALTER TABLE ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` / `DROP POLICY`。
- migration SQL変更。
- Supabase Auth/JWT実装。
- selectedTenantId transport実装。
- production dev_header rejection実装。
- API route / runtime / repository / UI変更。
- Supabase staging / production DB接続。
- `.env` 作成・変更。
- LINE API実送信。
- OpenAI API実呼び出し。

## Current State

### Staging

- `0001_initial_schema.sql` はstagingへ適用済み。
- `0002_service_role_postgrest_grants.sql` はstaging PostgREST/Data API smoke用に `service_role` 限定で適用済み。
- customers/messages staging runtime smoke済み。
- alerts staging runtime smoke済み。
- knowledge_pages/RAG staging runtime smoke済み。
- `REPOSITORY_RUNTIME=supabase` の明示時にstaging dummy dataで検証済み。
- default runtimeは引き続き `in_memory`。
- LINE real pushはdisabled/mock。
- OpenAI APIはmock。
- staging拡張検証版100%相当。

### Production

production No-Go。

No-Go理由:

- RLS未実装。
- Auth/JWT未接続。
- selectedTenantId transportがproduction runtimeへ未接続。
- selectedTenantId membership再検証がproduction HTTP runtimeへ未接続。
- production dev_header rejection未実装。
- `service_role` はserver-side only前提だが、RLS bypass権限のためproduction権限制御そのものにはしない。
- LINE real push gate未実装。
- OpenAI real API gate未実装。

## Dependency Map

```text
selectedTenantId transport boundary
-> authenticated staff runtime full route rollout
-> production dev_header rejection
-> RLS SQL design/implementation
-> RLS local/staging tests
-> production repository/runtime gate
-> LINE real push gate
-> OpenAI real API gate
```

`selectedTenantId` は権限ではなくselectorである。productionで使うには、Bearer tokenから得たstaff identityとactive membershipで必ず再検証し、確定済み `AdminTenantContext.tenantId` だけをrepositoryへ渡す。

## RLS Split

RLSはmigration SQL変更を伴うため、Loop 086では実装しない。

後続Loopでは以下を分ける。

- RLS policy draft SQLをdocsでレビューする。
- local/test DBでRLS SQLを適用する。
- tenant Aからtenant Bのrowを読めないことを確認する。
- insert/update/deleteでもtenant境界を確認する。
- `service_role` はRLS bypass前提なので、API/repository側tenant filter testと併用する。
- `anon` / `authenticated` に広いDML権限を付けない。

## Auth/JWT Split

Supabase Auth/JWT接続は、RLSやdev_header rejectionと同じLoopにまとめない。

必要な段階:

- Authorization Bearer token extractionを全Admin routeへ広げる。
- Supabase Auth verifierをserver-side境界で接続する。
- `auth.uid()` / token user idを `staff_users.auth_user_id` へmappingする。
- active `staff_users` だけ許可する。
- active `staff_tenant_memberships` だけtenant accessとして扱う。
- role guardはmembership roleを使う。
- session expired / invalid token / permission denied / tenant selection requiredを明確に返す。

## selectedTenantId Split

`selectedTenantId` は複数tenant所属staffの操作対象選択に使う。

Rules:

- `selectedTenantId` は権限ではない。
- active membershipで再検証する。
- membershipが1つだけなら省略可能にしてよい。
- membershipが複数あり未選択なら `tenant_selection_required`。
- membership外なら `tenant_membership_denied`。
- repository filterにはraw `selectedTenantId` を使わず、確定済み `AdminTenantContext.tenantId` だけを使う。

## production dev_header rejection Split

現行の `x-tenant-id` / `dev_header` はlocal MVP互換用であり、本番認証ではない。

段階:

- local/testでは互換維持。
- stagingではdummy検証用に限定し、authenticated runtimeの検証を先に通す。
- productionでは `x-tenant-id` / `dev_header` を拒否する。
- productionでは `Authorization: Bearer` + authenticated staff contextを必須にする。

Expected errors:

- `dev_tenant_header_not_allowed`
- `authenticated_staff_required`
- `tenant_selection_required`
- `tenant_membership_denied`
- `permission_denied`
- `session_expired`

## service_role Policy

`service_role` はserver-side only。

- browser / LIFF / Next client componentへ絶対に出さない。
- docs、README、dev log、terminal output、screenshotへ値を書かない。
- staging smokeではPostgREST/Data API accessのために使う。
- productionでは利用範囲をserver-side repository境界に閉じる。
- RLS bypass権限のため、repository tenant filter、Auth/JWT、role guard、auditを併用する。

## LINE Real Push Gate

本物LINE送信は別Loop。

前提:

- Auth/JWT接続済み。
- authenticated staff context必須。
- role guardで `send_staff_reply` 相当の権限を確認。
- production dev_header rejection済み。
- LINE channel access tokenはserver-side only。
- stagingではdummy recipient / safe channelだけで検証。
- LINE real push enable flagを明示的にtrueにする。

## OpenAI Real API Gate

OpenAI実API接続は別Loop。

前提:

- Auth/JWT接続済み。
- tenant scoped message / knowledgeのみを入力に使う。
- `AI_PROVIDER=openai` を明示する。
- `OPENAI_API_KEY` はserver-side only。
- AI does not auto-send to LINE.
- RAG answer draft / reply draft / summaryは担当者確認前提。
- tenant別usage logging / rate limit / error handlingを確認する。

## Loop Split Plan

| loop | purpose | scope | out of scope | DB change | API/runtime change | external connection | done |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Loop 087 | selectedTenantId transport boundary | selector parse/validation/test | RLS SQL, real Auth | No | small boundary only | No | selected tenant is never used without membership revalidation |
| Loop 088 | authenticated staff runtime full route rollout plan | route categories and rollout order | implementation | No | No | No | read/write/side-effect routes are split |
| Loop 089 | authenticated staff runtime read-only routes | customers/detail/timeline/alerts list with Bearer runtime | write routes, dev_header rejection | No | Yes | No real external APIs | read-only routes accept authenticated context |
| Loop 090 | authenticated staff runtime side-effect routes | reply/AI/RAG/alerts actions with role guard | LINE/OpenAI real send | No | Yes | No real external APIs | side-effect routes enforce roles |
| Loop 091 | production dev_header rejection | reject `x-tenant-id` in production env | RLS SQL/Auth UI | No | Yes | No | production no longer trusts dev_header |
| Loop 092 | RLS SQL draft review | policy SQL proposal docs/test fixture | apply | No applied migration | No | No | SQL draft reviewed before apply |
| Loop 093 | RLS local/staging apply test | apply RLS to local/test/staging only | production apply | Yes | No | Supabase test/staging only | tenant A cannot read/write tenant B rows |
| Loop 094 | production readiness gate | Go/No-Go checklist | deploy | No | No | No | production remains gated until all checks pass |
| Loop 095 | LINE real push gate | server-side LineClient real provider gate | AI real API | No | Yes | LINE staging/safe only | real push is explicit and audited |
| Loop 096 | OpenAI real API gate | server-side OpenAI provider gate | LINE auto-send | No | Yes | OpenAI staging/safe only | AI remains staff-assist only |

## Recommended Next Loop

Loop 087: selectedTenantId transport boundary.

理由:

- RLS/Auth/JWTの前に、複数tenant staffの操作対象tenantを安全に選ぶ境界を固定する必要がある。
- `selectedTenantId` をpermissionと誤用しないためのtestを先に置ける。
- production dev_header rejectionより前に、authenticated runtimeがtenantを決められる状態を作る必要がある。

## Tests

Loop 086ではdocs integration testで以下を確認する。

- task doc / runbookが存在する。
- READMEからrunbookとtask docへリンクされている。
- staging拡張検証版100%相当とproduction No-Goが明記されている。
- RLS未実装、Auth/JWT未接続、selectedTenantId、production dev_header rejectionが明記されている。
- `service_role` server-side onlyが明記されている。
- LINE real push gate、OpenAI real API gateが明記されている。
- Loop 087以降のsplitが明記されている。
- migration SQLにLoop 086由来のRLS SQLを追加していない。
- runtime/API/UI filesを変更していない。

## Residual Risks

- RLS SQLはまだ未実装。
- Supabase Auth/JWTはまだ未接続。
- selectedTenantId transportはまだ未実装。
- production dev_header rejectionはまだ未実装。
- LINE/OpenAI real providerはまだ未接続。
- service_role staging smokeは通っているが、production authorizationの代替にはならない。
