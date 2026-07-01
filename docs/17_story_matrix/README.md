# Story Matrix

This folder tracks the current product, operations, and DR readiness stories for `amami-line-crm`.

The purpose is to keep user-facing behavior, operator workflows, backup/restore readiness, and safe verification boundaries visible before starting more implementation loops.

## Files

- [user_story_status_matrix.md](user_story_status_matrix.md): customer, staff, admin, AI, LINE, and RAG product stories.
- [ops_story_status_matrix.md](ops_story_status_matrix.md): deployment, monitoring, production, secret, handoff, and operator workflows.
- [dr_readiness_story_matrix.md](dr_readiness_story_matrix.md): backup, export, restore, role/ACL remediation, and DR status.
- [production_vs_dr_readiness_matrix.md](production_vs_dr_readiness_matrix.md): separated DR, classifier route, app, and production readiness statuses.
- [verification_matrix.md](verification_matrix.md): safe-to-run verification list and blocked verification list.

## Rules

- Do not record secrets, DB URLs, raw logs, dump contents, row contents, LINE user IDs, API keys, `.env` values, or production logs.
- Do not mark a story verified unless there is a concrete loop, test, smoke, or documented evidence.
- If a story requires Supabase connection, production DB, restore, LINE real send, OpenAI billing, Nginx/DNS/HTTPS/certbot, package changes, cluster changes, or runtime changes, mark it unsafe for the current docs-only goal.
- Keep future work split into small loop-engineering tasks.

## Current Summary

```txt
product_mvp_status=partially_verified
ops_status=partially_verified
backup_export_status=success
restore_drill_status=failed
dr_readiness_status=not_ready_restore_failed
classifier_route_status=frozen
app_readiness_status=local_production_start_verified
app_production_path_review_completed=true
local_production_verification_status=pass
final_pre_external_runtime_review_completed=true
external_runtime_readiness_status=line_runtime_permission_gate_required
operator_approval_pack_created=true
final_external_runtime_approval_request_pack_completed=true
staged_external_runtime_execution_plan_created=true
operator_permission_matrix_created=true
operator_input_category_matrix_created=true
go_no_go_matrix_finalized=true
operator_env_injection_dry_run_checklist_created=true
runtime_env_inventory_created=true
runtime_input_category_matrix_created=true
secret_redaction_policy_confirmed=true
env_injection_validation_plan_created=true
operator_env_injection_dry_run_approval_gate_completed=true
operator_approval_status=approved
line_runtime_env_injection_approval_consumed=true
line_runtime_env_injection_approval_status=approved
operator_side_injection_status=completed
line_runtime_env_post_injection_record_created=true
line_runtime_env_category_present_in_running_process=true
line_runtime_env_category_injection_status=completed
post_injection_presence_check_status=operator_sanitized_result_recorded
line_runtime_env_category_present_after_injection=true
env_dry_run_approval_status=not_approved
approved_scope=none
human_input_required=true
next_execution_allowed=false
operator_env_dry_run_approval_consumed=true
env_dry_run_execution_status=partial
runtime_env_inventory_rechecked=true
env_inventory_mismatch_cleanup_status=complete
env_inventory_alignment_status=aligned
requires_follow_up_cleanup=false
placeholder_only_dry_run_execution_status=pass
env_presence_check_permission_gate_prepared=true
actual_runtime_env_presence_check_status=complete
required_categories_present_count=9
required_categories_missing_count=0
missing_required_categories=none
line_runtime_env_injection_permission_gate_created=true
line_runtime_env_injection_execution_allowed=false
production_go_judgement_ready=true
unknown_blocker_count=0
known_env_blocker_count=0
next_runtime_permission_gate_sequence_created=true
next_execution_sequence_status=line_runtime_permission_gate_required
env_injection_execution_allowed=false
external_runtime_execution_allowed=false
production_readiness_status=production_no_go_runtime_permission_gates_required
production_no_go=true
production_no_go_reason_scope=fully_split
safe_verification_available=true
unsafe_verification_blocked=true
production_runtime_change_allowed=false
selected_next_minimal_action=line_runtime_permission_gate_without_message_send
```
