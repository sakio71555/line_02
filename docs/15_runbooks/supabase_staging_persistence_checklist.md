# Supabase Staging Persistence Checklist

## Purpose

このrunbookは、社内確認版の一時保存をSupabase staging persistenceへ進める前に見るチェックリストです。

本番接続手順ではありません。今回の段階ではSupabase接続、migration apply、`.env` 作成、runtime switchは行いません。

## Current State

- local demo runtime is still in-memory.
- API process restart clears demo seed data.
- Supabase client boundary and repositories exist.
- Supabase repositories are not wired into Admin API runtime yet.
- RLS SQL is not implemented.
- local migration apply has not been executed in this repo.

## Data Priority

| Phase | Data | Goal |
| --- | --- | --- |
| A | `customers`, `messages`, staff reply messages, AI summary messages | timelineをstagingで消えないようにする |
| B | `alerts`, `knowledge_pages` | 未返信チェックとRAG sourceをstagingで再現する |
| C | `staff_users`, `staff_tenant_memberships`, tenant settings | Auth/JWT/role/selected tenantの前提を整える |
| D | Auth/JWT/RLS/production hardening | production dataを扱う前の安全境界を整える |

## Environment Separation

| Environment | Rule |
| --- | --- |
| local | in-memory default。demo seedのみ。外部DBへ自動接続しない。 |
| staging | productionとは別Supabase project。dummy tenant/dummy customerのみ。 |
| production | RLS/Auth/JWT/backup/rollback確認後のみ。実顧客情報を扱う。 |

## Env / Key Safety

- `.env` をgitに入れない。
- 具体的なAPI keyやDB URLをdocsやdev logへ書かない。
- `SUPABASE_SERVICE_ROLE_KEY` はserver-sideだけで使う。
- browser、LIFF、Next.js client componentへservice role keyを出さない。
- staging keyとproduction keyを混ぜない。
- Codexに秘密情報を貼らない。

Env / key / project readinessの詳細は [supabase_staging_env_readiness_checklist.md](supabase_staging_env_readiness_checklist.md) を参照する。

## Before Migration Apply

- Loop 070の [Supabase Staging Migration Dry-run](supabase_staging_migration_dry_run.md) を確認する。
- dry-runでmigration source、schema inventory、tenant_id indexes、repository expectations、RLS SQL未実装状態が記録済みである。
- Loop 071の [Supabase Staging Migration Apply Plan](supabase_staging_migration_apply_plan.md) を確認する。
- apply承認条件、禁止コマンド、rollback / recovery、Go / No-Go、結果記録テンプレートが確認済みである。
- Loop 073の [Supabase Staging Migration Apply Execution Gate](supabase_staging_migration_apply_execution_gate.md) を確認する。
- 明示許可、staging project/env readiness、dummy data、rollback / recoveryの条件が揃わなければNo-Goにする。
- Loop 076の [Supabase Staging Migration Apply Result](supabase_staging_migration_apply_result.md) では、`psql` が使えないためNo-Goとして記録した。migration applyは未実行。
- Loop 077の [psql Availability Setup](psql_availability_setup.md) で、作業者が手動で `psql` を用意する手順と、CodexがinstallやSupabase接続を行わない方針を確認する。
- Supabase projectがstagingであることを確認する。
- production projectではないことを確認する。
- `supabase link` 先を人間が確認する。
- migration SQLをreviewする。
- RLSが未実装ならstaging検証目的に限定する。
- seed dataがdummyだけであることを確認する。
- 実顧客情報、LINE userId、API key、production logが含まれていないことを確認する。
- service role keyの保管場所と利用者を確認する。
- rollback方針を決める。
- local SQL validation testが通っていることを確認する。

## Before Runtime Switch

- Loop 067でcustomers/messages runtime switch boundaryは追加済み。ただしdefaultはin-memoryで、Supabase実接続やAPI runtime差し替えはまだ行っていない。
- Loop 068でcustomers/messagesのfake client repository testsは追加済み。実DB接続前にmapping、tenant_id filter、timeline order、error handlingを確認する。
- customers/messagesのrepository wiringを小さいLoopに分ける。
- default local runtimeを壊さない。
- tenant_id filter testを追加する。
- stagingではdummy tenantだけで検証する。
- RLSなしの状態をproductionへ持ち込まない。

## Stop Conditions

以下が必要になったら、先に別Loopへ切る。

- `.env` 作成・変更
- migration SQL変更
- Supabase projectへの接続
- RLS SQL実装
- API runtime switch
- real customer data投入
- production key利用

## Related Docs

- [Loop 020: Supabase Persistence Planning](../11_codex_tasks/020_supabase_persistence_planning.md)
- [Loop 025: Supabase RLS Policy Plan](../11_codex_tasks/025_supabase_rls_policy_plan.md)
- [Loop 026: Supabase Local Migration Test](../11_codex_tasks/026_supabase_local_migration_test.md)
- [Loop 065: Supabase Persistence Staging Plan](../11_codex_tasks/065_supabase_persistence_staging_plan.md)
- [Loop 066: Supabase Staging Env Readiness Checklist](../11_codex_tasks/066_supabase_staging_env_readiness_checklist.md)
- [Loop 067: Supabase Runtime Switch Boundary for Customers/Messages](../11_codex_tasks/067_supabase_runtime_switch_boundary_customers_messages.md)
- [Loop 068: Supabase Repository Integration Tests with Fake Client](../11_codex_tasks/068_supabase_repository_integration_tests_fake_client.md)
- [Loop 070: Staging Migration Dry-run Record](../11_codex_tasks/070_staging_migration_dry_run_record.md)
- [Loop 071: Supabase Staging Migration Apply Plan](../11_codex_tasks/071_supabase_staging_migration_apply_plan.md)
- [Loop 073: Supabase Staging Migration Apply Execution Gate](../11_codex_tasks/073_supabase_staging_migration_apply_execution_gate.md)
- [Supabase Staging Migration Dry-run](supabase_staging_migration_dry_run.md)
- [Supabase Staging Migration Apply Plan](supabase_staging_migration_apply_plan.md)
- [Supabase Staging Migration Apply Execution Gate](supabase_staging_migration_apply_execution_gate.md)
- [Supabase Staging Migration Apply Result Template](supabase_staging_migration_apply_result_template.md)
- [Supabase Staging Env Readiness Checklist](supabase_staging_env_readiness_checklist.md)
- [psql Availability Setup](psql_availability_setup.md)
