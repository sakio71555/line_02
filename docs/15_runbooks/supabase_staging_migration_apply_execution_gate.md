# Supabase Staging Migration Apply Execution Gate

## Purpose

Supabase staging migration applyを実行できる状態かどうかを、明示許可、staging project確認、env/key readiness、既存dry-run/apply plan、repo状態で判定するためのrunbookです。

このrunbookは実行ゲートです。Supabase接続しない。migration applyしない。`.env` を作らない。実keyを書かない。git pushしない。

## Audience

- staging migration applyを判断する人。
- Supabase project / keyを管理する人。
- apply実行前にGo / No-Goを確認する開発者。

## When To Use

- Loop 070 dry-runとLoop 071 apply planを確認した後。
- 実際の`supabase link` や `supabase db push` を行う前。
- staging / production project取り違えを防ぐために、人間確認を挟みたい時。

## Go Conditions

以下がすべて満たされる場合だけGoです。

- 明示的なapply実行許可がある。
- staging projectであることが確認済み。
- production projectでないことが確認済み。
- project refはローカルで確認済みだがdocsには書かない。
- 必要envがローカルに設定済み。
- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging` が成功している。
- 実keyをdocsやlogに書かない運用が確認済み。
- `git status --short` がclean。
- Loop 070 static migration tests成功。
- Loop 071 apply plan確認済み。
- dummy dataのみ。
- rollback / recovery方針確認済み。
- RLS未実装を理解し、staging限定で進む。

## No-Go Conditions

以下のどれか1つでも該当すればNo-Goです。

- apply実行の明示許可がない。
- staging projectが未確認。
- production projectの可能性がある。
- project refの扱いが不明。
- env/keyが未準備。
- `git status --short` がcleanでない。
- static testsが失敗。
- migrationとrepository expectationに矛盾。
- RLS未実装状態を理解していない。
- 実顧客情報が混ざる可能性。
- LINE userIdが混ざる可能性。
- rollback / recovery方針が不十分。

## What To Do On No-Go

- Supabase接続しない。
- migration applyしない。
- `.env` / `.env.local` を作らない。
- 実keyを入力しない。
- project refを書かない。
- migration SQLを変更しない。
- RLS SQLを書かない。
- API runtime switchしない。
- git pushしない。
- No-Go理由をtask doc / dev logにsecretなしで記録する。
- 次に人間が用意するものを明確にする。

## Human Preparation List

No-GoからGoへ進むために、人間が用意するもの:

- staging migration applyを実行してよいという明示許可。
- staging Supabase projectが準備済みであることの確認。
- production projectではないことの確認。
- 必要envがローカルに設定済みであること。
- `.env.staging.example` をコピーした `.env.staging` に、作業者がローカルで必要値を入力済みであること。
- dummy dataだけで進める確認。
- rollback / recovery方針の最終確認。
- push可否の判断。

以下は記録しない。

- 実project ref
- 実key
- 実URL
- 実顧客情報
- LINE userId
- 本番ログ

## Final Check Before Apply

実際にapplyへ進む別Loopでは、直前に以下を再確認する。

- `AGENTS.md` を読んだ。
- `git status --short` がclean。
- branch/ahead状態を確認した。
- Loop 070 dry-runを確認した。
- Loop 071 apply planを確認した。
- このexecution gateでGo条件を満たしている。
- lint / typecheck / test / test:integrationが成功。
- apply result templateの保存先が分かっている。
- RLS未実装でありstaging限定であることを理解している。

## Secret And Project Ref Rules

- secretをdocsへ書かない。
- project refをdocsへ書かない。
- `.env` 値をdocsへ書かない。
- `.env.staging` 値をdocsへ書かない。
- 実値入力は `.env.staging.example` をコピーした `.env.staging` にローカルで行う。
- Codex promptへ実keyを貼らない。
- terminal outputにkeyが出るコマンドを避ける。
- service role keyをbrowser / LIFF / Next.js client componentへ出さない。

## Push Policy

git pushしない。push可否は、別途人間が明示したLoopでだけ扱う。

## Apply Result Template

Goになり、実際にstaging applyを行う別Loopでは以下を使う。

- [Supabase Staging Migration Apply Result Template](supabase_staging_migration_apply_result_template.md)
- [Supabase Staging Migration Apply Result](supabase_staging_migration_apply_result.md)

No-Goの場合、このテンプレートへ実行結果を捏造しない。

Loop 076 result: No-Go because `psql` is not available. Supabase connection and migration apply were not executed.

Loop 077 adds [psql Availability Setup](psql_availability_setup.md) for manual `psql` preparation before any apply retry. Codex does not install PostgreSQL tools, change PATH, connect to Supabase, or run migration apply in that preflight Loop.

## Related Docs

- [Supabase Staging Persistence Checklist](supabase_staging_persistence_checklist.md)
- [Supabase Staging Env Readiness Checklist](supabase_staging_env_readiness_checklist.md)
- [psql Availability Setup](psql_availability_setup.md)
- [Supabase Staging Migration Dry-run](supabase_staging_migration_dry_run.md)
- [Supabase Staging Migration Apply Plan](supabase_staging_migration_apply_plan.md)
- [Supabase Staging Migration Apply Result Template](supabase_staging_migration_apply_result_template.md)
- [Supabase Staging Migration Apply Result](supabase_staging_migration_apply_result.md)
- [Staging Env Template Setup](staging_env_template_setup.md)
- [Staging Env Local Fill Verification](staging_env_local_fill_verification.md)
- [Loop 070: Staging Migration Dry-run Record](../11_codex_tasks/070_staging_migration_dry_run_record.md)
- [Loop 071: Supabase Staging Migration Apply Plan](../11_codex_tasks/071_supabase_staging_migration_apply_plan.md)
- [Loop 073: Supabase Staging Migration Apply Execution Gate](../11_codex_tasks/073_supabase_staging_migration_apply_execution_gate.md)
- [Loop 074: Staging Env Template And Provider Flags](../11_codex_tasks/074_staging_env_template_and_provider_flags.md)
- [Loop 075: Staging Env Local Fill Verification](../11_codex_tasks/075_staging_env_local_fill_verification.md)
- [Loop 076: Supabase Staging Migration Apply Execution](../11_codex_tasks/076_supabase_staging_migration_apply_execution.md)
