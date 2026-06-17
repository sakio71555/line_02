# Loop 094A: RLS SQL draft review

## Goal

本番100%へ向けて、core tablesのtenant境界をDBレベルでも守るためのRLS SQL draftを作成し、staging apply前に危険なpolicy/grantを静的検証できる状態にする。

このLoopではRLS migration draftを作るが、staging DB / production DBへapplyしない。Supabase実DB接続、Supabase Auth/JWT本接続、Admin UI変更、LINE/OpenAI本接続も行わない。

## Scope

- 既存schema、service_role grants、RLS/Auth docs、authenticated staff runtime境界を確認する。
- `packages/db/migrations/0003_rls_core_tables.sql` をRLS draftとして追加する。
- `scripts/dev-loop/verify-rls-migration-static.mjs` を追加し、RLS draftをapplyせず静的検証する。
- `tests/integration/rls-core-tables-migration-static.test.ts` を追加し、通常testでもRLS draftの安全条件を守る。
- README、database docs、dev loop docs、production hardening runbook、RLS/Auth readiness runbook、rollback/recovery runbook、dev logを更新する。
- lint / typecheck / test / test:integration / buildを実行する。

## Out of Scope

- staging DBへのRLS apply。
- production DB接続。
- staging DB接続。
- Supabase実DB接続。
- `psql` でmigration実行。
- `supabase db push` / `supabase migration repair`。
- Supabase Auth/JWT本接続。
- Admin UI selectedTenantId保存。
- API runtime / repository / UI変更。
- LINE API実送信。
- OpenAI API実接続。
- `.env` 作成・変更。
- package依存追加。

## Starting State

- 最新付近のcommit: `e936381 feat: reject production dev headers`。
- Loop 093でproduction modeの `x-tenant-id` / `dev_header` rejectionとdev seed rejectionは完了済み。
- 主要Admin routeはauthenticated_staff runtime rollout済み。
- `x-selected-tenant-id` は認証ではなくselectorで、active membership再検証後の `AdminTenantContext.tenantId` だけをrepositoryへ渡す方針。
- Supabase Auth/JWT本接続、RLS SQL apply、Admin UI selectedTenantId保存、LINE/OpenAI real providerは未完了。
- production readinessはNo-Go。

## RLS Target Tables

Loop 094AのRLS draft対象:

- `tenants`
- `tenant_line_settings`
- `tenant_ai_settings`
- `customers`
- `messages`
- `alerts`
- `knowledge_pages`
- `staff_users`
- `staff_tenant_memberships`

`consultations`、`construction_cases`、`reservations` は今回のcore draft対象外。これらはfuture table policy reviewで追加する。

## service_role Policy

- `service_role` はserver-side only。
- browser / LIFF / Next client componentへ出さない。
- RLS bypass前提のため、production authorizationの代替にしない。
- Loop 079.1の `0002_service_role_postgrest_grants.sql` は壊さない。
- Loop 094Aの `0003_rls_core_tables.sql` では `service_role` grantを変更しない。

## anon Policy

- `anon` にはCRM admin dataへ直接アクセスさせない。
- Loop 094Aでは `anon` 向けgrant/policyを作らない。
- `to public` も作らない。

## authenticated Policy

- `authenticated` はSupabase Auth済みuser前提。
- `auth.uid()::text` を `staff_users.auth_user_id` と照合する。
- `staff_users.status = 'active'` と `staff_users.is_active = true` を必須にする。
- `staff_tenant_memberships.status = 'active'` を必須にする。
- tenant-owned rowsはactive membershipの `tenant_id` とrowの `tenant_id` が一致する場合だけ許可する。

## tenant_id Table Policy

`tenant_id` を持つcore tablesでは、以下のmembership条件を基本にする。

```sql
exists (
  select 1
  from public.staff_users su
  join public.staff_tenant_memberships stm
    on stm.staff_user_id = su.id
  where su.auth_user_id = auth.uid()::text
    and su.status = 'active'
    and su.is_active = true
    and stm.status = 'active'
    and stm.tenant_id = <table>.tenant_id
)
```

対象:

- `tenant_line_settings`
- `tenant_ai_settings`
- `customers`
- `messages`
- `alerts`
- `knowledge_pages`

`knowledge_pages` はRAG向けに `allowed_for_ai = true` も必要条件にする。`allowed_for_ai=false` をauthenticated direct DB accessで雑に許可しない。

## tenants Policy

`tenants` は `tenant_id` columnを持たないため、`tenants.id` とactive membershipの `tenant_id` を照合する。

```sql
stm.tenant_id = tenants.id
```

## staff_users Policy

authenticated userは自分のactive staff rowだけをselectできる。

```sql
auth_user_id = auth.uid()::text
and status = 'active'
and is_active = true
```

他staff user rowは今回のdraftでは読ませない。staff管理画面やowner/managerによるstaff管理は、後続Loopでrole別policyを設計する。

## staff_tenant_memberships Policy

authenticated userは自分のactive membershipsだけをselectできる。

```sql
status = 'active'
and exists (
  select 1
  from public.staff_users su
  where su.id = staff_tenant_memberships.staff_user_id
    and su.auth_user_id = auth.uid()::text
    and su.status = 'active'
    and su.is_active = true
)
```

## Grant Policy

`authenticated` へのgrantは明示列挙にする。

- `grant usage on schema public to authenticated`
- `select`: `tenants`、`tenant_line_settings`、`tenant_ai_settings`、`staff_users`、`staff_tenant_memberships`、`knowledge_pages`
- `select, insert, update`: `customers`、`alerts`
- `select, insert`: `messages`

今回、`delete` は付与しない。現行APIでdelete操作を扱っておらず、必要になった場合は専用Loopで追加する。

`tenant_line_settings` / `tenant_ai_settings` はsecret/AI設定を含むためselect中心に留める。settings updateは後続のowner/manager権限Loopで別途扱う。

## Migration Draft

追加したdraft:

```text
packages/db/migrations/0003_rls_core_tables.sql
```

内容:

- `drop policy if exists` でpolicy再作成に備える。
- target tablesへ `enable row level security` と `force row level security` を追加。
- `authenticated` role向けpolicyのみ作成。
- `auth.uid()::text`、`staff_users`、`staff_tenant_memberships`、active staff、active membershipを使う。
- `anon` / `public` へのgrant/policyは作らない。
- `service_role` grantは変更しない。

## Static Verification

追加したscript:

```text
scripts/dev-loop/verify-rls-migration-static.mjs
```

追加したtest:

```text
tests/integration/rls-core-tables-migration-static.test.ts
```

検証内容:

- `0003_rls_core_tables.sql` が存在する。
- target tablesで `enable row level security` / `force row level security` が使われる。
- `drop policy if exists` がある。
- `auth.uid()::text` が使われる。
- `staff_users` / `staff_tenant_memberships` が参照される。
- active staff / active membership条件がある。
- tenant-owned tableのpolicyで `stm.tenant_id = <table>.tenant_id` を見る。
- `tenants.id` とmembership tenantを照合する。
- staff tablesは自分のactive staff / active membershipsに限定する。
- `anon` / `public` 向けgrant/policyがない。
- `grant all` / `on all tables` がない。
- `using (true)` / `with check (true)` がない。
- `service_role` をrevokeしたり、`0003` でservice_role grantを変更していない。
- `knowledge_pages` は `allowed_for_ai = true` を必要条件にする。

## Why No Staging Apply

Loop 094AはRLS SQL draft reviewであり、apply loopではない。

staging applyには、dummy staff Auth/JWT context、RLS query verification、rollback/recovery判断、`psql` 実行承認が必要になる。これらをRLS draft作成と同じLoopに混ぜると、失敗時の切り分けが難しくなる。

## Production Readiness

production readiness remains No-Go.

No-Go理由:

- RLS SQLはdraftのみで、staging/localへ未apply。
- Supabase Auth/JWT本接続は未実装。
- Admin UI selectedTenantId保存は未実装。
- LINE real push gateは未実装。
- OpenAI real API gateは未実装。

## Test Result

Loop完了時の実行結果を完了報告に記録する。

## Residual Risks

- RLS SQLは未applyのため、SQL構文や実際のRLS動作はDB上で未検証。
- staff_users / staff_tenant_memberships をRLS policy内で参照する構成は、apply前にlocal/stagingで再帰・permission挙動を確認する必要がある。
- `consultations`、`construction_cases`、`reservations` は今回のRLS draft対象外。
- owner/managerによるstaff/settings/knowledge管理policyは未設計。
- `service_role` はRLS bypass前提のため、server-side repository tenant filter testは引き続き必要。

## Next Loop

Loop 095: RLS local/staging apply verification.

推奨する次Loop:

- `0003_rls_core_tables.sql` をlocal/staging test DBへapplyする。
- dummy authenticated staff / active membership contextでtenant A/Bのselect/insert/update境界を確認する。
- `anon` がcore tablesへアクセスできないことを確認する。
- `service_role` bypassをproduction authorizationとして扱わないことを再確認する。
