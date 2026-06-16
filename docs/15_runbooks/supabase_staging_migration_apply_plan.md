# Supabase Staging Migration Apply Plan

## Purpose

Supabase stagingへmigration applyする前に、承認条件、直前チェック、候補コマンド、禁止コマンド、rollback / recovery、apply後確認、Go / No-Go判断を確認するためのrunbookです。

これは実行手順の計画です。Loop 071ではSupabase接続、migration apply、`.env` 作成、git pushを行わない。

## Audience

- staging migration applyを準備する開発者。
- Supabase project / keyを扱う担当者。
- staging検証へ進むGo / No-Goを判断する担当者。

## Preconditions

- `AGENTS.md` を読んでいる。
- Loop 070の [Supabase Staging Migration Dry-run](supabase_staging_migration_dry_run.md) を確認済み。
- migration source is `packages/db/migrations/0001_initial_schema.sql`.
- runtime is still in-memory.
- RLS SQL is not implemented.
- No `.env`, key value, project ref, production log, LINE userId, or real customer data is written to docs.

## Approval Conditions

Applyへ進むには、以下をすべて満たす必要があります。

- 人間が明示的にstaging migration applyを許可している。
- 対象projectがstaging Supabase projectである。
- production projectではない。
- project refはローカルで確認し、docsには書かない。
- `.env` とkeyはローカル環境だけで管理し、repoに入れない。
- `git status --short` がclean。
- Loop 070 static migration testsが成功している。
- lint / typecheck / test / test:integrationが成功している。
- dummy dataのみを使う。
- 実顧客情報、LINE userId、API key、production logを使わない。
- rollback / recovery方針を確認済み。
- RLS未実装を理解し、staging限定として扱う。
- productionへはRLSなしで進まない。

Apply実行を検討する直前には、[Supabase Staging Migration Apply Execution Gate](supabase_staging_migration_apply_execution_gate.md) でGo / No-Goを再確認する。明示許可、staging project/env readiness、dummy data、rollback / recoveryの条件が揃わない場合はNo-Goとして停止する。

Loop 076では明示許可のもとで実行可否を確認したが、`psql` が使えないためNo-Goとして停止した。結果は [Supabase Staging Migration Apply Result](supabase_staging_migration_apply_result.md) にsecretなしで記録する。

## Pre-apply Checklist

```text
[ ] AGENTS.mdを読んだ
[ ] git status --short がclean
[ ] git status --short --branch を確認した
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
[ ] apply後確認項目が分かっている
[ ] rollback / recovery方針を確認した
```

## Candidate Commands

以下は後続Loopで使う可能性がある候補です。Loop 071では実行しません。

```bash
supabase --version
supabase link --project-ref <STAGING_PROJECT_REF>
supabase db push
```

Command notes:

- `supabase --version`: tool確認だけ。ただしLoop 071では実行不要。
- `supabase link --project-ref <STAGING_PROJECT_REF>`: staging projectであることを必ず確認する。project refをdocsに書かない。
- `supabase db push`: DBへmigrationを反映する可能性がある。明示承認なしで実行禁止。

## Prohibited Commands

以下はLoop 071では絶対に実行しません。後続Loopでも明示承認なしに実行しません。

```bash
supabase db reset
supabase db push --linked
supabase migration repair
supabase link --project-ref <PRODUCTION_PROJECT_REF>
```

Also prohibited:

- production projectへのlink。
- production keyの利用。
- 実顧客情報入りseed。
- LINE userId入りseed。
- project ref、service role key、anon key、DB URLのdocs記録。

## Post-apply Checks

実際にstaging applyした後は、以下を確認します。

- tables exist.
- columns exist.
- indexes exist.
- unique constraints exist.
- foreign keys exist.
- `customers.last_customer_message_at` exists.
- messages tenant/customer indexes exist.
- `knowledge_pages.allowed_for_ai` exists.
- `staff_users.auth_user_id` exists.
- `staff_tenant_memberships` exists.
- RLS state is checked and recorded.
- dummy seed apply policy is checked.
- repository fake client tests continue to pass.
- runtime switch is not performed unless a separate loop explicitly does it.

SQL候補は後続Loopでのみ使います。Loop 071では実行しません。

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select indexname
from pg_indexes
where schemaname = 'public'
order by indexname;
```

## Rollback / Recovery

- apply前にmigration内容を確認する。
- stagingにはdummy dataしかない状態で実行する。
- apply後に問題が出たらproductionへ進まない。
- schema mismatchが出たらruntime switchしない。
- rollbackが必要な場合は、手動SQL、staging project再作成、migration repair等の選択肢を検討する。
- rollbackやrepairは勝手に実行しない。
- `supabase db reset` はstaging dataを消す可能性があるため原則禁止。
- 具体的なrollback手順は別Loopで作る。
- 問題と対応はapply result templateへsecretなしで記録する。

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
- apply結果記録の運用が不明。

## Apply Result Record

Apply後の記録には以下を使います。

- [Supabase Staging Migration Apply Result Template](supabase_staging_migration_apply_result_template.md)

テンプレートへ実結果を捏造しない。project ref、secret、`.env` 値、本番ログ、LINE userId、実顧客情報を書かない。

## Do Not Do In This Loop

- Supabase接続しない。
- `supabase link` しない。
- migration applyしない。
- `.env` / `.env.local` / `.env.example` を作成・変更しない。
- 実keyを入力しない。
- project refを書かない。
- runtime switchしない。
- RLS SQLを書かない。
- production projectを使わない。
- git pushしない。

## Related Docs

- [Supabase Staging Persistence Checklist](supabase_staging_persistence_checklist.md)
- [Supabase Staging Env Readiness Checklist](supabase_staging_env_readiness_checklist.md)
- [Supabase Staging Migration Dry-run](supabase_staging_migration_dry_run.md)
- [Supabase Staging Migration Apply Execution Gate](supabase_staging_migration_apply_execution_gate.md)
- [Loop 071: Supabase Staging Migration Apply Plan](../11_codex_tasks/071_supabase_staging_migration_apply_plan.md)
- [Loop 073: Supabase Staging Migration Apply Execution Gate](../11_codex_tasks/073_supabase_staging_migration_apply_execution_gate.md)
