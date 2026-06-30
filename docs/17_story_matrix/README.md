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
external_runtime_readiness_status=operator_approval_required
operator_approval_pack_created=true
final_external_runtime_approval_request_pack_completed=true
staged_external_runtime_execution_plan_created=true
operator_permission_matrix_created=true
operator_input_category_matrix_created=true
go_no_go_matrix_finalized=true
external_runtime_execution_allowed=false
production_readiness_status=production_no_go_external_runtime_and_dr
production_no_go=true
production_no_go_reason_scope=split
safe_verification_available=true
unsafe_verification_blocked=true
production_runtime_change_allowed=false
selected_next_minimal_action=operator_env_injection_dry_run_checklist
```
