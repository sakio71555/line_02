# Obsidian Link Map

Use this map as a compact index when reviewing project history in Obsidian.

## Entry Points

- [README.md](../../README.md)
- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Development Loop](../08_dev_loop.md)
- [Development Logs](../14_dev_logs/README.md)
- [Latest Dev Log: 2026-06-28](../14_dev_logs/2026-06-28.md)
- [Current Dev Log: 2026-06-29](../14_dev_logs/2026-06-29.md)

## Current Production / Operations

- [Production Readiness Final](../15_runbooks/production_readiness_final.md)
- [Production Stabilization Closeout With OpenAI Runtime](../15_runbooks/production_stabilization_closeout_with_openai_runtime.md)
- [Final Operator Handoff Checklist](../15_runbooks/final_operator_handoff_checklist.md)
- [Production Monitoring Schedule](../15_runbooks/production_monitoring_schedule.md)
- [Production Backup Automation Plan](../15_runbooks/production_backup_automation_plan.md)

## Current Backup Trail

- [Loop 181+ Future Backlog](../11_codex_tasks/181_plus_future_backlog_after_production_go.md)
- [Loop 194 Manual Backup Result Recording](../11_codex_tasks/194_supabase_manual_backup_result_recording.md)
- [Loop 194.1 Free Plan Backup Availability Result](../11_codex_tasks/194_1_supabase_manual_backup_availability_result_after_free_plan_limitation.md)
- [Loop 195 Backup Path Decision](../11_codex_tasks/195_supabase_backup_path_decision_after_free_plan_limitation.md)
- [Loop 196 Operator Decision](../11_codex_tasks/196_supabase_backup_path_operator_decision_free_plan_cli_planning_only.md)
- [Loop 197 Final Closeout](../11_codex_tasks/197_production_operations_final_closeout_with_supabase_backup_deferred_risk_acceptance.md)
- [Loop 197 Supabase CLI Backup Dry-Run Design](../11_codex_tasks/197_supabase_cli_backup_dry_run_design.md)
- [Loop 198 Supabase CLI Backup Command Pack Planning](../11_codex_tasks/198_supabase_cli_backup_command_pack_planning.md)
- [Loop 199 Supabase Backup Export And Restore Readiness](../11_codex_tasks/199_supabase_backup_export_and_restore_readiness_accelerated_closeout.md)
- [Loop 200 Supabase Backup Tooling Installation Preflight](../11_codex_tasks/200_supabase_backup_tooling_installation_preflight.md)
- [Loop 201 Supabase Backup Export Controlled Execution](../11_codex_tasks/201_supabase_backup_export_controlled_execution.md)
- [Loop 202 pg_dump 17 Client Boundary](../11_codex_tasks/202_pg_dump_17_client_boundary_and_backup_mismatch_runbook.md)
- [Loop 202.1 Supabase DB URL Secret Replacement](../11_codex_tasks/202_1_supabase_db_url_secret_replacement.md)
- [Loop 202.1 Obsidian Log](loop_202_1_supabase_db_url_secret_replacement.md)
- [Loop 203 PostgreSQL 17 Client Installation Preflight](../11_codex_tasks/203_postgresql_17_client_installation_preflight.md)
- [Loop 203 Obsidian Log](loop_203_postgresql_17_client_installation_preflight.md)
- [Loop 204 PostgreSQL 17 Client Installation](../11_codex_tasks/204_postgresql_17_client_installation_approval_and_execution.md)
- [Loop 204 Obsidian Log](loop_204_postgresql_17_client_installation_approval_and_execution.md)
- [Loop 205 pg_dump 17 Backup Export Retry](../11_codex_tasks/205_pg_dump_17_explicit_path_backup_export_retry.md)
- [Loop 205 Obsidian Log](loop_205_pg_dump_17_explicit_path_backup_export_retry.md)
- [Loop 206 Restore Drill Planning](../11_codex_tasks/206_restore_drill_planning_without_production_restore.md)
- [Loop 206 Obsidian Log](loop_206_restore_drill_planning_without_production_restore.md)
- [Loop 207 Restore Drill Execution Gate](../11_codex_tasks/207_isolated_non_production_restore_drill_execution_gate.md)
- [Loop 207 Obsidian Log](loop_207_isolated_non_production_restore_drill_execution_gate.md)
- [Supabase Manual Backup Result Recording](../15_runbooks/supabase_manual_backup_result_recording.md)
- [Supabase Manual Backup Availability Result After Free Plan Limitation](../15_runbooks/supabase_manual_backup_availability_result_after_free_plan_limitation.md)
- [Supabase Backup Path Decision After Free Plan Limitation](../15_runbooks/supabase_backup_path_decision_after_free_plan_limitation.md)
- [Supabase Backup Path Operator Decision Free Plan CLI Planning Only](../15_runbooks/supabase_backup_path_operator_decision_free_plan_cli_planning_only.md)
- [Production Operations Final Closeout With Supabase Backup Deferred Risk Acceptance](../15_runbooks/production_operations_final_closeout_with_supabase_backup_deferred_risk_acceptance.md)
- [Supabase CLI Backup Dry-Run Design](../15_runbooks/supabase_cli_backup_dry_run_design.md)
- [Supabase CLI Backup Command Pack Planning](../15_runbooks/supabase_cli_backup_command_pack_planning.md)
- [Supabase Backup Export And Restore Readiness Closeout](../15_runbooks/supabase_backup_export_and_restore_readiness_accelerated_closeout.md)
- [Supabase Backup Tooling Installation Preflight](../15_runbooks/supabase_backup_tooling_installation_preflight.md)
- [Supabase Backup Export Controlled Execution](../15_runbooks/supabase_backup_export_controlled_execution.md)
- [pg_dump 17 Client Boundary And Backup Mismatch](../15_runbooks/pg_dump_17_client_boundary_and_backup_mismatch.md)
- [Restore Drill Planning](../15_runbooks/restore_drill_planning.md)

Loop 202 status: `pg_dump_failure_categories=pg_dump_server_version_mismatch`, `detected_server_major_or_version=17.6`, `detected_pg_dump_major_or_version=16.14`, `next=Loop 203 PostgreSQL 17 client installation preflight`.

Loop 202.1 status: `supabase_db_url_replaced=true`, `present=true`, `format_check=passed`, `secrets_recorded=false`, `pg_dump_executed=false`, `supabase_export_executed=false`, `restore_executed=false`. Backup export remains blocked until the PostgreSQL 17 client boundary is resolved.

Loop 203 status: `vps_preflight_status=completed_read_only`, `current_pg_dump_major=16`, `required_pg_dump_major=17`, `postgresql_17_client_candidate_available=false_current_apt_cache`, `package_install_executed=false`, `pg_dump_executed=false`, `supabase_connection_executed=false`, `db_export_executed=false`, `restore_executed=false`.

Loop 204 status: `postgresql_client_17_installed=true`, `pg_dump_17_path_present=true`, `pg_dump_17_version_check_passed=true`, `pg_dump_16_preserved=true`, `db_export_executed=false`, `backup_artifact_created=false`, `restore_executed=false`, `loop_205_backup_export_retry_ready=true_after_operator_approval`.

Loop 205 status: `pg_dump_17_explicit_path_used=true`, `pg_dump_attempt_count=1`, `backup_export_status=success`, `backup_artifact_created=true`, `backup_artifact_in_repo=false`, `restore_executed=false`, `secrets_recorded=false`, `raw_log_displayed=false`.

Loop 206 status: `restore_drill_plan_created=true`, `restore_executed=false`, `production_restore_executed=false`, `pg_restore_executed=false`, `psql_executed=false`, `supabase_connection_executed=false`, `backup_artifact_copied_into_repo=false`, `dump_content_displayed=false`, `secrets_recorded=false`, `loop_207_restore_drill_execution_ready=false_pending_operator_approval_and_target_selection`.

Loop 207 status: `restore_execution_gate_created=true`, `restore_target_selected=false`, `restore_executed=false`, `production_restore_executed=false`, `pg_restore_executed=false`, `psql_executed=false`, `supabase_connection_executed=false`, `backup_artifact_copied_into_repo=false`, `dump_content_displayed=false`, `secrets_recorded=false`, `loop_208_restore_drill_target_selection_ready=true`.

## Obsidian Helpers

- [Obsidian README](README.md)
- [Loop Log Template](loop_log_template.md)
- [Obsidian Link Map](obsidian_link_map.md)
