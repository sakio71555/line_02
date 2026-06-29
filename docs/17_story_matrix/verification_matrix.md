# Verification Matrix

Stage 1 verification matrix for this goal.

## Safe-To-Run Now

These checks do not require production, external APIs, DB connections, restore, packages, cluster changes, or secrets.

| verification_id | target | command_or_method | expected_result | safe_to_run_now | requires_secret | requires_production | requires_external_api | requires_cost | requires_db_connection | requires_restore | prohibited_without_operator_approval | current_status | risk_notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V-001 | Git status | `git status --short` and `git status -sb` | clean before/after commits or known docs-only diff | true | false | false | false | false | false | false | false | passed_stage_2 | No secrets printed. |
| V-002 | Whitespace | `git diff --check` | no whitespace errors | true | false | false | false | false | false | false | false | passed_stage_2 | Required before commit. |
| V-003 | Docs links | static file existence checks for newly linked docs | all referenced local docs exist | true | false | false | false | false | false | false | false | passed_stage_2 | Link target existence only, no browser. |
| V-004 | Secret pattern boolean check | grep against changed docs for known secret patterns, returning boolean only | `secret_pattern_check=passed` | true | false | false | false | false | false | false | false | passed_stage_2_changed_files | Do not print matching lines. A broad all-repo pattern can match existing placeholders, so this goal records the changed-file boolean check. |
| V-005 | Lint | `npx pnpm@10.12.1 lint` | pass | true | false | false | false | false | false | false | false | passed_stage_2 | Static repo check. |
| V-006 | Typecheck | `npx pnpm@10.12.1 typecheck` | pass | true | false | false | false | false | false | false | false | passed_stage_2 | Safe local typecheck completed. |
| V-007 | Unit tests | `npx pnpm@10.12.1 test` | pass | true | false | false | false | false | false | false | false | passed_stage_2 | `199 passed / 1 skipped`, `1212 passed / 4 skipped`. |
| V-008 | Integration tests | `npx pnpm@10.12.1 test:integration` | pass | true | false | false | false | false | false | false | false | passed_stage_2 | `199 passed / 1 skipped`, `1212 passed / 4 skipped`. |
| V-009 | Handoff dry-run | update `docs/16_handoff/latest_*` with sanitized goal result | paste-ready review prompt | true | false | false | false | false | false | false | false | passed_stage_2 | Never paste secrets/raw logs. |
| V-010 | Obsidian completeness | ensure Decisions / DevelopmentLog / Risks / Checklist exist | all four sections present | true | false | false | false | false | false | false | false | passed_stage_2 | Required by this goal. |
| V-011 | Operator-only review protocol | docs-only check that Loop 217 defines sanitized `key=value` format and pending operator result | protocol exists and raw log exposure remains false | true | false | false | false | false | false | false | false | pending_loop_217_verification | Does not inspect diagnostic logs. |
| V-012 | Staged diagnostics plan | docs-only check that Loop 218 records operator sanitized result and phase diagnostics plan | role placeholder No-Go and staged plan recorded | true | false | false | false | false | false | false | false | pending_loop_218_verification | Does not execute restore or `pg_restore`. |
| V-013 | Staged diagnostics execution gate | docs-only check that Loop 219 selects one next stage and defines the execution boundary | `toc_count_only` selected and no execution performed | true | false | false | false | false | false | false | false | pending_loop_219_verification | Does not execute `pg_restore --list`. |
| V-014 | TOC count-only diagnostic result | sanitized count-only review of Loop 220 docs and root-only metadata | TOC count recorded, body hidden, next stage selected | true | false | false | false | false | false | false | false | pending_loop_220_verification | Does not display TOC body or prove restore readiness. |
| V-015 | Pre-data diagnostic gate | docs-only check that Loop 221 defines one-attempt pre-data execution boundary and cleanup policy | pre-data gate created, no execution performed | true | false | false | false | false | false | false | false | pending_loop_221_verification | Does not run restore, `pg_restore`, `psql`, or create a target DB. |
| V-016 | Pre-data diagnostic execution record | sanitized review of Loop 222 execution metadata, classifier, and cleanup | one attempt recorded, permission/auth signal classified, target dropped | true | false | false | false | false | false | true | true | pending_loop_222_verification | Raw diagnostic log and object details must remain hidden. |

## Blocked Or Operator Approval Required

These checks are not allowed in this goal.

| verification_id | target | blocked_reason | safe_to_run_now | requires_secret | requires_production | requires_external_api | requires_cost | requires_db_connection | requires_restore | prohibited_without_operator_approval | next_loop_candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BV-001 | Supabase DB connection | DB connection and secrets are prohibited in this goal. | false | true | true | false | false | true | false | true | future Supabase smoke loop with explicit approval |
| BV-002 | Backup export | `pg_dump` and artifact creation are prohibited in this goal. | false | true | true | false | false | true | false | true | future backup automation loop |
| BV-003 | Restore retry | restore, `pg_restore`, target DB creation, and artifact operations are prohibited. | false | false | true | false | false | false | true | true | Loop 216 then future restore retry |
| BV-004 | Diagnostic raw log review | raw log display/copy is prohibited. | false | false | false | false | false | false | false | true | Loop 217 operator-only sanitized key/value review |
| BV-005 | LINE real send | Real LINE send can affect users. | false | true | true | true | false | true | false | true | dedicated controlled one-message smoke |
| BV-006 | OpenAI real API | API call may cost money and expose prompt/response handling risks. | false | true | true | true | true | false | false | true | dedicated OpenAI runtime/cost loop |
| BV-007 | Nginx/DNS/HTTPS/certbot/public smoke | Public exposure and infra changes are prohibited. | false | false | true | true | false | false | false | true | dedicated infra loop with approval |
| BV-008 | Package or cluster changes | package/cluster changes are prohibited. | false | false | true | false | false | false | false | true | dedicated package/cluster loop |

## Loop 216 Verification Note

```txt
loop_216_classifier_executed=true
loop_216_classifier_mode=category_only_boolean_count
loop_216_raw_log_displayed=false
loop_216_matching_line_displayed=false
loop_216_role_name_displayed=false
loop_216_sql_statement_displayed=false
loop_216_object_name_displayed=false
loop_216_unknown_role_acl_subcategory_detected=true
loop_216_next_loop=Loop 217 operator-only raw log review gate
```

## Loop 217 Verification Note

```txt
loop_217_operator_review_protocol_created=true
loop_217_operator_raw_log_review_status=pending_operator_input
loop_217_diagnostic_log_read_by_codex=false
loop_217_diagnostic_log_displayed=false
loop_217_matching_line_displayed=false
loop_217_role_name_displayed=false
loop_217_sql_statement_displayed=false
loop_217_object_name_displayed=false
loop_217_restore_retried=false
loop_217_pg_restore_restore_executed=false
loop_217_psql_executed=false
loop_217_target_db_created=false
loop_217_role_created=false
loop_217_next_loop_branching_defined=true
```

## Loop 218 Verification Note

```txt
loop_218_operator_raw_log_review_executed=true
loop_218_operator_subcategory_selected=unknown_after_operator_review
loop_218_operator_subcategory_confidence=low
loop_218_role_placeholder_no_go=true
loop_218_staged_restore_diagnostics_plan_created=true
loop_218_restore_executed=false
loop_218_pg_restore_executed=false
loop_218_psql_executed=false
loop_218_target_db_created=false
loop_218_role_created=false
loop_218_raw_log_displayed=false
loop_218_toc_body_displayed=false
loop_218_next_loop=Loop 219 staged restore diagnostics execution gate
```

## Loop 219 Verification Note

```txt
loop_219_staged_diagnostics_gate_created=true
loop_219_next_stage_selected=true
loop_219_selected_next_diagnostic_stage=toc_count_only
loop_219_restore_executed=false
loop_219_pg_restore_executed=false
loop_219_psql_executed=false
loop_219_target_db_created=false
loop_219_role_created=false
loop_219_toc_body_displayed=false
loop_219_object_name_displayed=false
loop_219_sql_statement_displayed=false
loop_219_role_name_displayed=false
loop_219_next_loop=Loop 220 TOC count-only staged restore diagnostic execution
```

## Loop 220 Verification Note

```txt
loop_220_pg_restore_list_executed=true
loop_220_pg_restore_list_exit_code=0
loop_220_toc_total_entries_count=462
loop_220_toc_pre_data_count=186
loop_220_toc_data_count=46
loop_220_toc_post_data_count=230
loop_220_toc_body_displayed=false
loop_220_object_name_displayed=false
loop_220_sql_statement_displayed=false
loop_220_role_name_displayed=false
loop_220_restore_executed=false
loop_220_pg_restore_restore_executed=false
loop_220_psql_executed=false
loop_220_target_db_created=false
loop_220_backup_artifact_copied_into_repo=false
loop_220_selected_next_stage=pre_data_only_restore_diagnostic_gate
```

## Loop 221 Verification Note

```txt
loop_221_pre_data_diagnostic_gate_created=true
loop_221_loop_222_pre_data_execution_ready=true
loop_221_restore_executed=false
loop_221_pg_restore_executed=false
loop_221_psql_executed=false
loop_221_target_db_created=false
loop_221_role_created=false
loop_221_diagnostic_log_displayed=false
loop_221_object_name_displayed=false
loop_221_sql_statement_displayed=false
loop_221_role_name_displayed=false
loop_221_dump_content_displayed=false
loop_221_row_content_displayed=false
loop_221_secrets_recorded=false
loop_221_backup_artifact_copied_into_repo=false
loop_221_supabase_connection_executed=false
loop_221_production_restore_executed=false
loop_221_next_loop=Loop 222 pre-data only restore diagnostic execution
```

## Loop 222 Verification Note

```txt
loop_222_restore_stage=pre_data
loop_222_restore_options_pre_data_no_owner_no_privileges=true
loop_222_restore_attempt_count=1
loop_222_pg_restore_exit_code=1
loop_222_pre_data_diagnostic_status=failed
loop_222_failure_category=pre_data_permission_error_detected
loop_222_permission_or_auth_error_detected=true
loop_222_permission_or_auth_error_count=1
loop_222_sanitized_validation_executed=false
loop_222_restore_target_dropped=true
loop_222_target_db_exists_after_drop=false
loop_222_cleanup_required=false
loop_222_raw_log_displayed=false
loop_222_object_name_displayed=false
loop_222_sql_statement_displayed=false
loop_222_role_name_displayed=false
loop_222_dump_content_displayed=false
loop_222_row_content_displayed=false
loop_222_secrets_recorded=false
loop_222_supabase_connection_executed=false
loop_222_production_restore_executed=false
loop_222_next_loop=Loop 223 pre-data permission/auth remediation gate
```

## Stage 2 Rule

Stage 2 may run only `safe_to_run_now=true` checks. If a story needs a blocked check, record it as `blocked_operator_approval_required` and split it into a future loop.
