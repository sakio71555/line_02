# Loop 221: Pre-Data Only Restore Diagnostic Gate

## Decisions

- Loop 221 is a pre-data only diagnostic gate.
- Restore, `pg_restore`, `psql`, and target DB creation are not executed in this Loop.
- The next Loop may run pre-data only exactly once after explicit operator approval.
- Raw logs, object names, SQL statements, role names, dump content, row content, DB URLs, and secrets are not recorded.

## DevelopmentLog

- Summarized Loop 220 TOC count-only result: total `462`, pre-data `186`, data `46`, post-data `230`.
- Defined the future pre-data command boundary with `/usr/lib/postgresql/17/bin/pg_restore` and `--section=pre-data --no-owner --no-privileges`.
- Defined fresh local isolated target DB conditions.
- Defined success/failure judgement and cleanup/drop or quarantine policy.
- Defined Go/No-Go conditions.
- Updated handoff latest files, DR matrix, verification matrix, restore drill runbook, dev log, README, docs index, and Obsidian navigation.
- Verification commands: `git status --short`, `git diff --check`, docs link check, secret pattern boolean check, and `npx pnpm@10.12.1 lint`.

## Risks

- Pre-data can include schema/object-sensitive failures in raw logs.
- Raw log leakage remains a risk if future execution boundaries slip.
- Target DB cleanup can be missed if the execution Loop expands.
- Restore success has not been achieved, so DR readiness remains incomplete.
- Staged diagnostics can become too broad unless Loop 222 stays one phase and one attempt.

## Checklist

- `working_directory_confirmed=true`
- `tmp_used=false`
- `obsidian_updated=true`
- `handoff_latest_codex_result_updated=true`
- `handoff_latest_gpt_review_prompt_updated=true`
- `restore_executed=false`
- `pg_restore_executed=false`
- `psql_executed=false`
- `target_db_created=false`
- `role_created=false`
- `diagnostic_log_displayed=false`
- `object_name_displayed=false`
- `sql_statement_displayed=false`
- `role_name_displayed=false`
- `dump_content_displayed=false`
- `row_content_displayed=false`
- `secrets_recorded=false`
- `backup_artifact_copied_into_repo=false`
- `supabase_connection_executed=false`
- `production_restore_executed=false`
- `pre_data_diagnostic_gate_created=true`
- `loop_222_pre_data_execution_ready=true`
- `dr_readiness_status=not_ready_restore_failed`
