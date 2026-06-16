# Loop 071: Supabase Staging Migration Apply Plan

## Goal

Loop 070の静的migration dry-runを受けて、Supabase stagingへmigration applyする前の承認条件、実行前チェック、禁止コマンド、rollback / recovery、apply後確認、Go / No-Go判断をdocs-onlyで整理する。

今回のLoopではSupabase接続、migration apply、`.env` 作成、migration SQL変更、RLS SQL実装、API runtime switch、git pushは行わない。

## Initial Git State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Initial `git status --short`: clean
- Initial branch: `main...origin/main [ahead 2]`
- Latest commits before Loop 071:
  - `9886b6f test: verify Supabase migration schema`
  - `a3f59b7 docs: add codex development kit scaffold`

Loop 069 / Loop 070 are committed locally and intentionally not pushed. Loop 071 also does not push.

## Scope

- staging migration apply plan doc作成。
- apply承認条件を整理。
- apply前チェックリストを整理。
- apply時のコマンド候補を、今回実行禁止のまま記録。
- 絶対に実行してはいけないコマンドを整理。
- rollback / recovery方針を整理。
- apply後確認項目を整理。
- apply結果記録テンプレートを作成。
- Go / No-Go判断基準を整理。
- 既存staging persistence/env/dry-run runbookへリンク追加。
- README、dev loop、dev logを更新。
- docs testを追加。
- commitする。

## Out of Scope

- Supabase接続
- `supabase link`
- `supabase db push`
- migration apply
- `supabase db reset`
- `supabase migration repair`
- staging / production Supabase接続
- `.env` / `.env.local` 作成・変更
- `.env.example` 変更
- 実key入力
- `SUPABASE_URL` 等の実値記入
- Supabase project ref記入
- migration SQL変更
- RLS SQL実装
- API runtime switch
- repository wiring変更
- Admin API / Admin UI変更
- LINE API / OpenAI API実接続
- selectedTenantId transport実装
- Supabase Auth/JWT実装
- production dev_header rejection実装
- 依存関係追加
- git push

## Preconditions

- Loop 070の [staging migration dry-run record](070_staging_migration_dry_run_record.md) が確認済み。
- migration sourceは `packages/db/migrations/0001_initial_schema.sql`。
- runtimeは引き続きin-memory。
- Supabase repositories are not wired into Admin API runtime.
- RLS SQL is not implemented.
- staging project / env / keys are not configured in this repository.

## Apply Approval Conditions

staging migration applyは、少なくとも以下がすべて満たされた場合だけ次Loopで検討する。

- 人間が明示的に「staging migration applyを実行してよい」と許可している。
- 対象がstaging Supabase projectである。
- production projectではないことを確認済み。
- project refは作業者がローカルで確認し、docs / commit / promptには書かない。
- `.env` / keyは作業者のローカル環境で管理し、repoには入れない。
- `git status --short` がclean。
- Loop 070 static migration testsが成功。
- `npx pnpm@10.12.1 lint` / `typecheck` / `test` / `test:integration` が成功。
- dummy data方針が確認済み。
- 実顧客情報、LINE userId、API key、production logが含まれない。
- rollback / recovery方針が確認済み。
- RLS未実装であることを理解し、staging限定で進む。
- productionにはRLSなしで進まない。

## Pre-apply Checklist

```text
[ ] AGENTS.mdを読んだ
[ ] git status --short がclean
[ ] branch状態を確認した
[ ] 対象projectがstagingである
[ ] production projectではない
[ ] project refをローカルで確認したがdocsには書かない
[ ] migration fileを確認した
[ ] Loop 070 dry-run recordを確認した
[ ] static migration testsが成功している
[ ] lint / typecheck / test / test:integration が成功している
[ ] RLS未実装状態を理解している
[ ] 実顧客情報を使わない
[ ] LINE userIdを使わない
[ ] API key / `.env` / production logをdocsへ書かない
[ ] service role keyをbrowser / LIFF / Next client componentへ出さない
[ ] apply後に確認するSQL / dashboard / API境界が分かっている
[ ] rollback / recovery方針を確認した
```

## Candidate Commands For A Future Apply Loop

以下は後続Loopで使う可能性がある候補です。Loop 071では実行しない。

```bash
supabase --version
supabase link --project-ref <STAGING_PROJECT_REF>
supabase db push
```

注意:

- `supabase link`: staging projectであることを必ず人間が確認する。production project refを指定しない。
- `supabase db push`: migration内容をDBへ反映する可能性があるため、明示承認なしで実行禁止。
- `supabase --version`: 接続はしないが、Loop 071ではtool実行も不要。

## Prohibited Commands

Loop 071では以下を絶対に実行しない。後続Loopでも承認なしに実行しない。

```bash
supabase db reset
supabase db push --linked
supabase migration repair
supabase link --project-ref <PRODUCTION_PROJECT_REF>
```

追加禁止事項:

- production projectへのlink。
- production keyの利用。
- 実顧客情報入りseed。
- LINE userId入りseed。
- project ref、service role key、anon key、DB URLのdocs記録。

## Rollback / Recovery Policy

今回rollback実装はしない。方針だけを固定する。

- apply前にmigration内容を確認する。
- stagingにdummy dataしかない状態で実行する。
- apply後に問題が出た場合はproductionへ進まない。
- schema mismatchが出た場合はruntime switchしない。
- rollbackが必要な場合は、手動SQL、staging project再作成、migration repair等の選択肢を検討するが、勝手に実行しない。
- `supabase db reset` はstaging dataを消す可能性があるため、原則禁止。
- rollback手順は別Loopで具体化する。
- 問題と対応は [apply result template](../15_runbooks/supabase_staging_migration_apply_result_template.md) にsecretなしで記録する。

## Post-apply Checks

実際にstaging applyを行った後、最低限以下を確認する。

- expected tables exist.
- expected columns exist.
- expected indexes exist.
- expected unique constraints exist.
- expected foreign keys exist.
- `customers.last_customer_message_at` exists.
- messages tenant/customer indexes exist.
- `knowledge_pages.allowed_for_ai` exists.
- `staff_users.auth_user_id` exists.
- `staff_tenant_memberships` exists.
- RLS state is confirmed and recorded.
- dummy seed apply policy is confirmed.
- repository fake client tests continue to pass.
- runtime remains in-memory until a separate runtime switch loop.

Example SQL candidates for a future apply verification loop. Do not run in Loop 071.

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'customers'
order by ordinal_position;

select indexname
from pg_indexes
where schemaname = 'public'
order by indexname;
```

## Go / No-Go

### Go

- staging projectが明確。
- apply許可が明確。
- dry-run record確認済み。
- static tests成功。
- lint / typecheck / test / test:integration成功。
- dummy dataのみ。
- rollback / recovery方針確認済み。
- secret管理確認済み。

### No-Go

- projectがstagingか不明。
- production projectの可能性がある。
- `git status --short` がcleanでない。
- static tests失敗。
- migrationとrepository expectationに矛盾。
- RLS未実装状態を理解していない。
- 実顧客情報が混ざる可能性。
- keyの扱いが不明。
- apply結果記録の保存先や責任者が不明。

## Apply Result Template

Apply結果は以下の空テンプレートへ記録する。

- [Supabase Staging Migration Apply Result Template](../15_runbooks/supabase_staging_migration_apply_result_template.md)

テンプレートへ実結果を捏造しない。project ref、secret、`.env` 値、本番ログ、LINE userId、実顧客情報を書かない。

## Why No Apply In This Loop

Loop 071は、次にapplyへ進めるかを安全に判断するための計画Loopです。ここでSupabase接続、project link、migration apply、rollback実行、runtime switchを混ぜると、project取り違えやsecret露出、RLS未実装のままproductionへ進むリスクを切り分けにくくなります。

## Verification Result

- `git diff --check`: passed.
- `npx pnpm@10.12.1 lint`: passed.
- `npx pnpm@10.12.1 typecheck`: passed.
- `npx pnpm@10.12.1 test`: passed, 46 files / 319 tests.
- `npx pnpm@10.12.1 test:integration`: passed, 46 files / 319 tests.

Build is not required because this loop changes docs and static tests only.

## Push Policy

git push is prohibited in Loop 071. Loop 069 / Loop 070 / Loop 071 remain local until the user explicitly asks to push.

## Remaining Risks

- Migration has still not been applied to a real staging Supabase database.
- Staging project, project ref, `.env`, and keys are not configured in this repository.
- RLS SQL is still not implemented.
- API runtime remains in-memory.
- Rollback procedure is not yet executable; this loop records the policy only.

## Next Loop Candidates

```text
Loop 072: Supabase staging migration apply execution
Loop 073: Supabase customer/message API runtime switch plan
Loop 074: Supabase alerts/knowledge runtime switch plan
```
