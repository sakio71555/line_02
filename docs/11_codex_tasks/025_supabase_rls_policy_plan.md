# Loop 025: Supabase RLS Policy Plan

## Goal

Supabase repositoryをruntimeへ接続する前に、RLS方針をdocs-onlyで整理する。今回はRLS SQL、migration変更、Supabase接続、認証/JWT実装は行わない。

## Scope

- 現在の主要table確認
- `tenant_id` を持つtable / 持たないtableの整理
- RLS適用対象tableの整理
- table別policy matrix
- access pattern別方針
- key運用方針
- local / staging / production分離方針
- RLS test方針
- README、database docs、Obsidian dev log更新

## Out of Scope

- RLS policy SQL実装
- migration SQL変更
- Supabase本番接続
- `.env` 作成・変更
- API routeのSupabase差し替え
- repository実装変更
- UI変更
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール
- pgvector / embedding実装
- 認証/JWT実装

## Current Tables

Migration source of truth: `packages/db/migrations/0001_initial_schema.sql`.

### Tables without `tenant_id`

- `tenants`

`tenants` はtenant masterであり、row自体がtenant境界を表す。通常のtenant staffが全tenant一覧を読める設計にはしない。tenant staffからは認証済みtenant contextに紐づくtenantだけを参照する。

### Tables with `tenant_id`

- `tenant_line_settings`
- `tenant_ai_settings`
- `staff_users`
- `customers`
- `consultations`
- `messages`
- `alerts`
- `knowledge_pages`
- `construction_cases`
- `reservations`

全主要tableは原則 `tenant_id` で分離する。tenant境界はrepository層だけでなくDB levelでも守る。

## RLS Basic Policy

- tenant境界はDB levelでも守る。
- `SUPABASE_SERVICE_ROLE_KEY` はserver-side API / repository層だけで使う。
- service role keyはbrowser、LIFF、Next.js client componentへ絶対に出さない。
- browser / LIFFからSupabase DBへ直接アクセスする設計は当面採用しない。
- admin画面はAdmin API経由でDBへアクセスする。
- LIFF予定機能もAPI経由でDBへアクセスする。
- tenant_idは将来的に認証済みadmin user / staff contextから決定する。
- 開発用 `x-tenant-id` headerは本番認証では使わない。
- service roleはRLS bypass前提なので、API / repository側の `tenant_id` filter testも必須にする。
- RLS SQLは後続Loopで実装し、local Supabaseまたはtest DBで検証してからstaging / productionへ進める。

## Table Policy Matrix

| Table | `tenant_id` | RLS target | Select policy | Insert policy | Update policy | Delete policy | Service role policy | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tenants` | No | Yes | authenticated staff can select only its tenant; platform admin policy is separate | platform/admin setup only | platform/admin setup only | normally no delete; pause via status | server-side setup/admin only | tenant masterなのでtenant staffに全tenant一覧を見せない |
| `tenant_line_settings` | Yes | Yes | same tenant only | same tenant owner/manager or server setup | same tenant owner/manager or server setup | normally no delete | server-side settings management only | channel secret/tokenはencrypted column前提 |
| `tenant_ai_settings` | Yes | Yes | same tenant only | same tenant owner/manager or server setup | same tenant owner/manager or server setup | normally no delete | server-side settings management only | AI auto replyは慎重に扱う |
| `staff_users` | Yes | Yes | same tenant staff only; platform admin separate | owner/manager or server auth provisioning | owner/manager or self-limited update | normally deactivate via `is_active` | server-side auth sync only | auth user idとのbindingは後続設計 |
| `customers` | Yes | Yes | same tenant only | same tenant only via API/repository | same tenant only via API/repository | normally no hard delete; archive/status change | server-side CRM API only | LINE userIdや連絡先をtenant越え表示しない |
| `consultations` | Yes | Yes | same tenant only | same tenant only | same tenant only | normally no hard delete | server-side CRM API only | `customer_id` も同tenantであることをrepository/testで確認する |
| `messages` | Yes | Yes | same tenant only | same tenant only | limited; corrections/system fields only | normally no hard delete | server-side webhook/admin API only | timelineは `tenant_id + customer_id` で取得する |
| `alerts` | Yes | Yes | same tenant only | same tenant only | same tenant only | normally no hard delete; dismiss/resolve | server-side alert checker/notifier only | open/notified重複防止もtenant scoped |
| `knowledge_pages` | Yes | Yes | same tenant only; RAG sourceは `allowed_for_ai = true` | same tenant import process only | same tenant import/admin process only | same tenant import/admin process only | server-side import/RAG repository only | browserから直接検索させない |
| `construction_cases` | Yes | Yes | same tenant only; recommendation sourceはallowed flagで絞る | same tenant import/admin process only | same tenant import/admin process only | same tenant import/admin process only | server-side import/recommendation only | price/inventory等は断定しない |
| `reservations` | Yes | Yes | same tenant only | same tenant only via API | same tenant only via API | normally no hard delete; cancel/status change | server-side reservation API only | LIFF予定もAPI経由にする |

## Access Pattern Policy

| Access pattern | DB access route | Tenant context policy | RLS / service role notes |
| --- | --- | --- | --- |
| LINE webhook -> API -> repository | server-side API only | webhook secret pathからtenantを解決する | service role may be used server-side; repository must still filter by `tenant_id` |
| Admin UI -> Admin API -> repository | browser calls Admin API, not Supabase directly | future auth staff context determines tenant; current `x-tenant-id` is dev only | service role stays on API server; RLS test still required before production |
| LIFF予定 -> API -> repository | LIFF calls API, not Supabase directly | LIFF/session verification maps user to tenant/customer | anon key direct DB access is deferred |
| AI summary / reply draft -> API -> repository / AI provider | server-side API collects tenant-scoped timeline | only same-tenant messages enter AI input | OpenAI API receives no cross-tenant data; service role remains server-side |
| RAG answer draft -> API -> repository / AI provider | server-side API searches tenant-scoped knowledge | `tenant_id` first, then `allowed_for_ai = true` | browser does not query Supabase directly |
| Staff notification -> API -> notifier | server-side API reads alerts and calls notifier boundary | same-tenant open alerts only | notifier is external boundary, not DB access; no service role on client |

## Key Policy

Do not write concrete values in docs. Do not create or update `.env` in this loop.

| Env name | Purpose | Handling |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL | server runtime config; no secret value in docs |
| `SUPABASE_ANON_KEY` | anon key for RLS-based access | may be public in Supabase model, but direct browser/LIFF DB access is deferred |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side repository/admin operations | server-side only; never expose to browser, LIFF, or client component |
| `SUPABASE_DB_URL` | migration/local DB verification | local/staging/prod separation required; default tests must not use production DB |

## Local / Staging / Production Policy

- local: in-memory remains default. RLS SQL tests use local Supabase or an explicit test DB in a later loop.
- staging: use a separate Supabase project/key set from production. Test data must not include real customer data.
- production: connect only after RLS SQL, auth context, migration checklist, backup/rollback plan, and tenant isolation tests are complete.
- docs and dev logs must not include `.env`, API keys, production logs, LINE userId, or real customer data.

## RLS Test Policy

- RLS SQL is implemented in a later loop.
- RLS tests are kept in a dedicated loop and must use local Supabase or a test DB.
- Production DB must never be used for automated tests.
- Required RLS tests:
  - tenant A context cannot select tenant B rows.
  - tenant A context cannot insert tenant B rows.
  - tenant A context cannot update tenant B rows.
  - tenant A context cannot delete tenant B rows.
  - `tenants` table does not expose all tenant rows to ordinary tenant staff.
  - `knowledge_pages` respects tenant boundary; RAG source selection also requires `allowed_for_ai = true`.
- Because service role bypasses RLS, keep repository tests that verify explicit `tenant_id` filters.
- Combine RLS tests with API/repository tests before switching runtime from in-memory to Supabase.

## Why No SQL In This Loop

RLS policy SQL depends on final auth claims / staff context design. Implementing SQL before auth context is fixed risks creating policies that pass local smoke tests but do not match production access. Loop 025 therefore records policy intent only; SQL and local verification are split into later loops.

## Risks

- service role key misuse could bypass RLS if repository filters are incomplete.
- current dev `x-tenant-id` header is not production authentication.
- auth/staff context claims are not designed yet.
- RLS policies are not implemented or verified yet.
- runtime still uses in-memory repositories by default.

## Next Loop Candidates

```text
Loop 026: Supabase local migration test
Loop 027: Supabase auth/staff tenant context plan
Loop 028: Supabase RLS SQL draft
Loop 029: Supabase RLS local tests
Loop 030: Runtime Supabase repository wiring plan
```
