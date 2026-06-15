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
- [Supabase Staging Env Readiness Checklist](supabase_staging_env_readiness_checklist.md)
