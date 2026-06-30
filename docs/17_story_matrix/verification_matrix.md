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
| V-017 | Pre-data permission/auth remediation gate | docs-only check that Loop 223 compares remediation candidates and selects one next Loop | local target privilege alignment gate selected, no execution performed | true | false | false | false | false | false | false | false | pending_loop_223_verification | Does not run restore, `pg_restore`, `psql`, create or change target DB, change roles, or display raw logs. |
| V-018 | Local target privilege alignment gate | docs-only check that Loop 224 creates the privilege checklist and selects one next inspection Loop | Loop 225 inspection-only selected, no execution performed | true | false | false | false | false | false | false | false | pending_loop_224_verification | Does not run `psql`, restore, `pg_restore`, create/change target DB, change roles, or display raw logs. |
| V-019 | Local target privilege alignment inspection | local-only metadata inspection with counts/booleans/categories only | psql metadata inspected, no restore or DB changes, next blocked follow-up selected | true | false | false | false | false | true | false | false | pending_loop_225_verification | Uses local-only `psql`; no row content, role details, object names, DB URLs, or secrets. |

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

## Loop 223 Verification Note

```txt
loop_223_remediation_gate_created=true
loop_223_loop_222_result_summarized=true
loop_223_primary_signal=pre_data_permission_error_detected
loop_223_permission_or_auth_error_count=1
loop_223_candidate_comparison_completed=true
loop_223_selected_next_loop=Loop 224 local target privilege alignment gate without restore
loop_223_restore_executed=false
loop_223_pg_restore_executed=false
loop_223_psql_executed=false
loop_223_target_db_created=false
loop_223_target_db_modified=false
loop_223_role_created=false
loop_223_role_modified=false
loop_223_diagnostic_log_displayed=false
loop_223_raw_log_displayed=false
loop_223_object_name_displayed=false
loop_223_sql_statement_displayed=false
loop_223_role_name_displayed=false
loop_223_secrets_recorded=false
loop_223_supabase_connection_executed=false
loop_223_production_restore_executed=false
loop_223_dr_readiness_status=not_ready_restore_failed
```

## Loop 224 Verification Note

```txt
loop_224_privilege_alignment_gate_created=true
loop_224_loop_222_223_results_summarized=true
loop_224_primary_signal=pre_data_permission_error_detected
loop_224_privilege_alignment_checklist_created=true
loop_224_remediation_candidates_compared=true
loop_224_selected_next_loop=Loop 225 local target privilege alignment inspection without changes
loop_224_restore_executed=false
loop_224_pg_restore_executed=false
loop_224_psql_executed=false
loop_224_target_db_created=false
loop_224_target_db_modified=false
loop_224_role_created=false
loop_224_role_modified=false
loop_224_diagnostic_log_displayed=false
loop_224_object_name_displayed=false
loop_224_sql_statement_displayed=false
loop_224_role_name_displayed=false
loop_224_secrets_recorded=false
loop_224_supabase_connection_executed=false
loop_224_production_restore_executed=false
loop_224_dr_readiness_status=not_ready_restore_failed
```

## Loop 225 Verification Note

```txt
loop_225_local_cluster_metadata_checked=true
loop_225_local_cluster_exists=true
loop_225_local_cluster_online=true
loop_225_local_cluster_port=55432
loop_225_local_cluster_loopback_only=false
loop_225_local_cluster_remote_listen_detected=true
loop_225_psql_metadata_inspection_executed=true
loop_225_psql_connection_scope=local_only
loop_225_psql_remote_connection_executed=false
loop_225_metadata_current_user_category=local_admin
loop_225_metadata_database_count=3
loop_225_metadata_restore_drill_database_count=0
loop_225_metadata_role_count=16
loop_225_role_names_displayed=false
loop_225_database_names_displayed=false
loop_225_row_content_displayed=false
loop_225_restore_executed=false
loop_225_pg_restore_executed=false
loop_225_target_db_created=false
loop_225_target_db_modified=false
loop_225_role_created=false
loop_225_role_modified=false
loop_225_selected_next_loop=Loop 226 pre-data permission blocked follow-up
loop_225_dr_readiness_status=not_ready_restore_failed
```

## Loop 226 Verification Note

```txt
loop_226_loop_225_results_summarized=true
loop_226_local_cluster_loopback_only=false
loop_226_loopback_blocker_recorded=true
loop_226_read_only_listen_scope_inspection_required=true
loop_226_owner_aligned_target_possible=true
loop_226_target_db_creation_no_go=true
loop_226_restore_retry_no_go=true
loop_226_role_change_no_go=true
loop_226_cluster_change_no_go=true
loop_226_psql_executed=false
loop_226_restore_executed=false
loop_226_pg_restore_executed=false
loop_226_target_db_created=false
loop_226_target_db_modified=false
loop_226_role_created=false
loop_226_role_modified=false
loop_226_cluster_modified=false
loop_226_firewall_modified=false
loop_226_diagnostic_log_displayed=false
loop_226_object_name_displayed=false
loop_226_sql_statement_displayed=false
loop_226_role_name_displayed=false
loop_226_secrets_recorded=false
loop_226_supabase_connection_executed=false
loop_226_production_restore_executed=false
loop_226_selected_next_loop=Loop 227 local restore cluster listen scope read-only inspection
loop_226_dr_readiness_status=not_ready_restore_failed
```

## Loop 227 Verification Note

```txt
loop_227_pg_lsclusters_checked=true
loop_227_cluster_row_found=true
loop_227_cluster_port_matches_55432=true
loop_227_cluster_online=true
loop_227_listen_scope_checked=true
loop_227_listen_entry_count=2
loop_227_listen_loopback_ipv4_count=1
loop_227_listen_loopback_ipv6_count=0
loop_227_listen_wildcard_count=0
loop_227_listen_other_count=1
loop_227_local_cluster_loopback_only=false
loop_227_external_interface_listen_detected=true
loop_227_config_keys_checked=true
loop_227_config_listen_addresses_category=default_or_unset
loop_227_config_port_matches_55432=true
loop_227_config_unix_socket_directories_key_present=true
loop_227_cluster_modified=false
loop_227_cluster_reloaded=false
loop_227_cluster_restarted=false
loop_227_firewall_modified=false
loop_227_restore_executed=false
loop_227_pg_restore_executed=false
loop_227_psql_executed=false
loop_227_target_db_created=false
loop_227_target_db_modified=false
loop_227_role_created=false
loop_227_role_modified=false
loop_227_raw_listen_output_displayed=false
loop_227_public_ip_recorded=false
loop_227_private_ip_recorded=false
loop_227_config_full_content_displayed=false
loop_227_pg_hba_displayed=false
loop_227_secrets_recorded=false
loop_227_supabase_connection_executed=false
loop_227_production_restore_executed=false
loop_227_selected_next_loop=Loop 228 restore drill cluster loopback remediation plan
loop_227_dr_readiness_status=not_ready_restore_failed
```

## Loop 228 Verification Note

```txt
loop_228_loop_227_result_summarized=true
loop_228_external_listen_blocker_recorded=true
loop_228_owner_aligned_target_db_creation_ready=false
loop_228_restore_retry_ready=false
loop_228_recommended_remediation=postgresql_listen_addresses_loopback
loop_228_primary_setting_plan=listen_addresses_localhost
loop_228_fallback_setting_plan=listen_addresses_127_0_0_1_and_ipv6_loopback
loop_228_firewall_only_plan=no_go_as_primary
loop_228_cluster_drop_recreate_plan=deferred
loop_228_current_state_plan=no_go
loop_228_rollback_plan_created=true
loop_228_selected_next_loop=Loop 229 restore drill cluster loopback remediation execution gate
loop_228_docs_only=true
loop_228_cluster_modified=false
loop_228_cluster_reloaded=false
loop_228_cluster_restarted=false
loop_228_firewall_modified=false
loop_228_package_modified=false
loop_228_psql_executed=false
loop_228_restore_executed=false
loop_228_pg_restore_executed=false
loop_228_target_db_created=false
loop_228_target_db_modified=false
loop_228_role_created=false
loop_228_role_modified=false
loop_228_supabase_connection_executed=false
loop_228_production_restore_executed=false
loop_228_raw_listen_output_displayed=false
loop_228_public_ip_recorded=false
loop_228_private_ip_recorded=false
loop_228_config_full_content_displayed=false
loop_228_pg_hba_displayed=false
loop_228_secrets_recorded=false
loop_228_dr_readiness_status=not_ready_restore_failed
```

## Loop 229 Verification Note

```txt
loop_229_target_cluster_identity_confirmed=true
loop_229_config_backup_created=true
loop_229_config_backup_repo_path=false
loop_229_config_backup_permission=600
loop_229_config_backup_dir_permission=700
loop_229_listen_addresses_changed=true
loop_229_listen_addresses_target=localhost
loop_229_pg_hba_changed=false
loop_229_port_changed=false
loop_229_unix_socket_directories_changed=false
loop_229_firewall_modified=false
loop_229_package_modified=false
loop_229_target_cluster_restart_attempted=true
loop_229_target_cluster_restart_result=success
loop_229_production_cluster_restarted=false
loop_229_app_runtime_changed=false
loop_229_post_change_cluster_online=true
loop_229_post_change_config_listen_addresses_category=loopback_or_localhost
loop_229_post_change_listen_entry_count=2
loop_229_post_change_loopback_listen_count=2
loop_229_post_change_wildcard_listen_count=0
loop_229_post_change_non_loopback_listen_count=0
loop_229_local_cluster_loopback_only=true
loop_229_external_interface_listen_detected=false
loop_229_rollback_executed=false
loop_229_psql_executed=false
loop_229_restore_executed=false
loop_229_pg_restore_executed=false
loop_229_target_db_created=false
loop_229_target_db_modified=false
loop_229_role_created=false
loop_229_role_modified=false
loop_229_supabase_connection_executed=false
loop_229_production_restore_executed=false
loop_229_raw_listen_output_displayed=false
loop_229_public_ip_recorded=false
loop_229_private_ip_recorded=false
loop_229_config_full_content_displayed=false
loop_229_pg_hba_displayed=false
loop_229_secrets_recorded=false
loop_229_backup_artifact_copied_into_repo=false
loop_229_selected_next_loop=Loop 230 owner-aligned target DB provisioning gate
loop_229_dr_readiness_status=not_ready_restore_failed
```

## Loop 230 Verification Note

```txt
loop_230_loop_229_result_summarized=true
loop_230_target_cluster=17/restore_drill_loop2091
loop_230_target_cluster_port=55432
loop_230_target_cluster_listen_addresses=localhost
loop_230_local_cluster_loopback_only=true
loop_230_external_interface_listen_detected=false
loop_230_target_db_design_created=true
loop_230_target_db_scope=local_isolated_restore_drill_cluster_only
loop_230_target_db_lifecycle=fresh_disposable
loop_230_target_db_name_pattern=amami_line_crm_restore_drill_loop231_YYYYMMDD
loop_230_target_db_candidate_name=amami_line_crm_restore_drill_loop231_20260630
loop_230_owner_alignment_required=true
loop_230_db_owner_must_equal_restore_execution_user=true
loop_230_role_creation_allowed_in_loop231=false
loop_230_role_change_allowed_in_loop231=false
loop_230_cleanup_policy_created=true
loop_230_selected_next_loop=Loop 231 owner-aligned target DB provisioning execution
loop_230_docs_only=true
loop_230_psql_executed=false
loop_230_restore_executed=false
loop_230_pg_restore_executed=false
loop_230_target_db_created=false
loop_230_target_db_modified=false
loop_230_role_created=false
loop_230_role_modified=false
loop_230_cluster_modified=false
loop_230_supabase_connection_executed=false
loop_230_production_restore_executed=false
loop_230_db_url_displayed=false
loop_230_secrets_recorded=false
loop_230_backup_artifact_copied_into_repo=false
loop_230_dr_readiness_status=not_ready_restore_failed
```

## Loop 231 Verification Note

```txt
loop_231_local_cluster_confirmed=true
loop_231_cluster_row_found=true
loop_231_cluster_online=true
loop_231_local_cluster_loopback_only=true
loop_231_external_interface_listen_detected=false
loop_231_target_db_name_contains_restore_drill=true
loop_231_target_db_name_contains_loop231=true
loop_231_target_db_exists_before=false
loop_231_target_db_created=true
loop_231_target_db_exists_after_create=true
loop_231_target_db_owner_aligned=true
loop_231_future_restore_execution_user_matches_owner=true
loop_231_target_db_local_only=true
loop_231_provisioning_status=success
loop_231_target_db_retained=true
loop_231_target_db_restricted=true_by_loopback_cluster
loop_231_cleanup_required=true
loop_231_cleanup_reason=retained_for_next_pre_data_retry
loop_231_restore_executed=false
loop_231_pg_restore_executed=false
loop_231_backup_artifact_used=false
loop_231_supabase_connection_executed=false
loop_231_production_db_connection_executed=false
loop_231_production_restore_executed=false
loop_231_target_db_other_than_candidate_modified=false
loop_231_role_created=false
loop_231_role_modified=false
loop_231_cluster_modified=false
loop_231_restart_or_reload_executed=false
loop_231_psql_metadata_executed=true
loop_231_psql_scope=local_metadata_only
loop_231_row_content_displayed=false
loop_231_db_url_displayed=false
loop_231_secrets_recorded=false
loop_231_push_performed=false
loop_231_selected_next_loop=Loop 232 owner-aligned pre-data restore retry gate
loop_231_dr_readiness_status=not_ready_restore_failed
```

## Loop 232 Verification Note

```txt
loop_232_loop_231_result_summarized=true
loop_232_target_db=amami_line_crm_restore_drill_loop231_20260630
loop_232_target_db_owner_aligned=true
loop_232_target_db_retained=true
loop_232_cleanup_required=true
loop_232_owner_aligned_pre_data_retry_gate_created=true
loop_232_selected_next_loop=Loop 233 owner-aligned pre-data restore retry execution
loop_232_future_pg_restore_options=--section=pre-data --no-owner --no-privileges
loop_232_restore_attempt_limit=1
loop_232_raw_log_destination=repo_external_root_only
loop_232_restore_executed=false
loop_232_pg_restore_executed=false
loop_232_psql_executed=false
loop_232_target_db_created=false
loop_232_target_db_modified=false
loop_232_role_created=false
loop_232_role_modified=false
loop_232_cluster_modified=false
loop_232_backup_artifact_used=false
loop_232_supabase_connection_executed=false
loop_232_production_restore_executed=false
loop_232_secrets_recorded=false
loop_232_dr_readiness_status=not_ready_restore_failed
```

## Loop 233 Verification Note

```txt
loop_233_artifact_exists=true
loop_233_artifact_file_permission=600
loop_233_artifact_parent_dir_permission=700
loop_233_artifact_size_match=true
loop_233_artifact_checksum_match=true
loop_233_target_db_exists=true
loop_233_target_db_owner_aligned=true
loop_233_local_cluster_loopback_only=false
loop_233_external_interface_listen_detected=true
loop_233_precheck_ok=false
loop_233_diagnostic_log_created=true
loop_233_diagnostic_log_dir_permission=700
loop_233_diagnostic_log_file_permission=600
loop_233_pg_restore_path_present=true
loop_233_pg_restore_version_check_executed=true
loop_233_restore_attempt_count=0
loop_233_pg_restore_exit_code=not_executed
loop_233_pre_data_retry_status=blocked
loop_233_sanitized_validation_executed=false
loop_233_restore_target_dropped=true
loop_233_target_db_exists_after_drop=false
loop_233_cleanup_required=false
loop_233_restore_executed=false
loop_233_pg_restore_restore_executed=false
loop_233_backup_artifact_copied_into_repo=false
loop_233_supabase_connection_executed=false
loop_233_production_restore_executed=false
loop_233_raw_log_displayed=false
loop_233_dump_content_displayed=false
loop_233_row_content_displayed=false
loop_233_secrets_recorded=false
loop_233_selected_next_loop=Loop 234 owner-aligned pre-data retry blocked follow-up
loop_233_dr_readiness_status=not_ready_restore_failed
```

## Loop 234 Verification Note

```txt
loop_234_listen_regression_reviewed=true
loop_234_loop_229_listen_entry_count=2
loop_234_loop_229_loopback_listen_count=2
loop_234_loop_229_non_loopback_listen_count=0
loop_234_loop_229_local_cluster_loopback_only=true
loop_234_loop_229_external_interface_listen_detected=false
loop_234_loop_233_listen_entry_count=2
loop_234_loop_233_loopback_listen_count=1
loop_234_loop_233_non_loopback_listen_count=1
loop_234_loop_233_local_cluster_loopback_only=false
loop_234_loop_233_external_interface_listen_detected=true
loop_234_candidate_a_recommended=true
loop_234_candidate_e_retry_despite_blocker_no_go=true
loop_234_selected_next_loop=Loop 235 restore cluster listen classifier refinement without changes
loop_234_restore_executed=false
loop_234_pg_restore_executed=false
loop_234_psql_executed=false
loop_234_target_db_created=false
loop_234_target_db_modified=false
loop_234_cluster_modified=false
loop_234_cluster_restarted=false
loop_234_firewall_modified=false
loop_234_backup_artifact_used=false
loop_234_supabase_connection_executed=false
loop_234_production_restore_executed=false
loop_234_secrets_recorded=false
loop_234_dr_readiness_status=not_ready_restore_failed
```

## Loop 235 Verification Note

```txt
loop_235_pg_lsclusters_checked=true
loop_235_target_cluster_found=true
loop_235_cluster_online=true
loop_235_cluster_port=55432
loop_235_ss_checked=true
loop_235_netstat_checked=false
loop_235_listen_entry_count=2
loop_235_loopback_ipv4_count=2
loop_235_loopback_ipv6_count=0
loop_235_wildcard_ipv4_count=0
loop_235_wildcard_ipv6_count=0
loop_235_non_loopback_count=0
loop_235_unknown_listen_count=0
loop_235_external_interface_listen_detected=false
loop_235_local_cluster_loopback_only=true
loop_235_listen_addresses_configured=true
loop_235_listen_addresses_category=localhost_or_loopback
loop_235_port_configured=55432
loop_235_unix_socket_directories_configured=true
loop_235_restore_executed=false
loop_235_pg_restore_executed=false
loop_235_psql_executed=false
loop_235_target_db_created=false
loop_235_target_db_modified=false
loop_235_cluster_modified=false
loop_235_cluster_restarted=false
loop_235_firewall_modified=false
loop_235_backup_artifact_used=false
loop_235_supabase_connection_executed=false
loop_235_production_restore_executed=false
loop_235_raw_listen_output_recorded=false
loop_235_secrets_recorded=false
loop_235_selected_next_loop=Loop 236 owner-aligned pre-data retry gate resume
loop_235_dr_readiness_status=not_ready_restore_failed
```

## Stage 2 Rule

Stage 2 may run only `safe_to_run_now=true` checks. If a story needs a blocked check, record it as `blocked_operator_approval_required` and split it into a future loop.
