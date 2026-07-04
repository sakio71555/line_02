# Documentation Index

このディレクトリは、アマミホーム向けAI顧客カルテ付きLINE相談CRMの設計・開発判断・後続Codexタスクを管理します。

## Core Docs

- `01_product.md`: プロダクト目的、MVP、将来機能、他社展開方針
- `02_architecture.md`: LINE、Webhook、API、DB、管理画面、LIFF、AI、担当者通知の全体構成
- `03_database.md`: Supabase PostgreSQL想定のテーブル案
- `04_line_flows.md`: LINE友だち追加、受信、返信、アラート、担当者通知のフロー
- `05_ai_rules.md`: OpenAI API利用方針、AI禁止事項、tenant分離、下書き中心運用
- `06_multitenancy.md`: tenant_id分離のルールと禁止事項
- `07_security.md`: secrets、署名検証、個人情報、RLS、ログ方針
- `08_dev_loop.md`: Codexでのループエンジニアリング手順
- `09_amamihome_research.md`: 公式HPクロール前の前提メモ

## Decision Records

- `10_decisions/ADR-001-multitenant-from-start.md`
- `10_decisions/ADR-002-admin-reply-as-source-of-truth.md`
- `10_decisions/ADR-003-ai-draft-before-auto-reply.md`
- `10_decisions/ADR-004-domainless-dev-with-tunnel.md`

## Codex Tasks

`11_codex_tasks/` にPhaseごとのタスクカードを置きます。各タスクはGoal、Scope、Out of scope、Acceptance Criteria、Files likely affected、Test requirements、Codex Promptを含みます。

## Current Operations Runbooks

- Loop 202 pg_dump 17 client boundary: `15_runbooks/pg_dump_17_client_boundary_and_backup_mismatch.md`
- Loop 202.1 Supabase DB URL secret replacement: `11_codex_tasks/202_1_supabase_db_url_secret_replacement.md`
- Loop 203 PostgreSQL 17 client installation preflight: `11_codex_tasks/203_postgresql_17_client_installation_preflight.md`
- Loop 204 PostgreSQL 17 client installation: `11_codex_tasks/204_postgresql_17_client_installation_approval_and_execution.md`
- Loop 205 pg_dump 17 backup export retry: `11_codex_tasks/205_pg_dump_17_explicit_path_backup_export_retry.md`
- Loop 206 restore drill planning without production restore: `11_codex_tasks/206_restore_drill_planning_without_production_restore.md`
- Loop 207 isolated non-production restore drill execution gate: `11_codex_tasks/207_isolated_non_production_restore_drill_execution_gate.md`
- Loop 208 restore drill target selection without restore: `11_codex_tasks/208_restore_drill_target_selection_without_restore.md`
- Loop 209 isolated local PostgreSQL restore drill execution: `11_codex_tasks/209_isolated_local_postgresql_restore_drill_execution.md`
- Loop 209.1 isolated local PostgreSQL target provisioning approval: `11_codex_tasks/209_1_isolated_local_postgresql_target_provisioning_approval.md`
- Loop 209.2 isolated local PostgreSQL restore drill retry: `11_codex_tasks/209_2_isolated_local_postgresql_restore_drill_retry.md`
- Loop 210 pg_restore failure diagnostics without raw log exposure: `11_codex_tasks/210_pg_restore_failure_diagnostics_without_raw_log_exposure.md`
- Loop 211 controlled diagnostic restore with sanitized failure classifier: `11_codex_tasks/211_controlled_diagnostic_restore_with_sanitized_failure_classifier.md`
- Loop 212 role owner ACL restore remediation plan: `11_codex_tasks/212_role_owner_acl_restore_remediation_plan.md`
- Loop 213 controlled restore retry with no-owner no-privileges: `11_codex_tasks/213_controlled_restore_retry_with_no_owner_no_privileges.md`
- Loop 214 handoff automation v1: `11_codex_tasks/214_handoff_automation_v1.md`
- Loop 214.1 handoff template dry-run: `11_codex_tasks/214_1_handoff_template_dry_run.md`
- Loop 215 role owner ACL follow-up remediation gate: `11_codex_tasks/215_role_owner_acl_follow_up_remediation_gate.md`
- Loop 216 sanitized role ACL subcategory classifier: `11_codex_tasks/216_sanitized_role_acl_subcategory_classifier_without_restore.md`
- Loop 217 operator-only raw log review gate: `11_codex_tasks/217_operator_only_raw_log_review_gate.md`
- Loop 218 staged restore diagnostics plan: `11_codex_tasks/218_staged_restore_diagnostics_plan.md`
- Loop 219 staged restore diagnostics execution gate: `11_codex_tasks/219_staged_restore_diagnostics_execution_gate.md`
- Loop 220 TOC count-only staged restore diagnostic execution: `11_codex_tasks/220_toc_count_only_staged_restore_diagnostic_execution.md`
- Loop 221 pre-data only restore diagnostic gate: `11_codex_tasks/221_pre_data_only_restore_diagnostic_gate.md`
- Loop 222 pre-data only restore diagnostic execution: `11_codex_tasks/222_pre_data_only_restore_diagnostic_execution.md`
- Loop 223 pre-data permission/auth remediation gate: `11_codex_tasks/223_pre_data_permission_auth_remediation_gate.md`
- Loop 224 local target privilege alignment gate without restore: `11_codex_tasks/224_local_target_privilege_alignment_gate_without_restore.md`
- Loop 225 local target privilege alignment inspection without changes: `11_codex_tasks/225_local_target_privilege_alignment_inspection_without_changes.md`
- Loop 226 pre-data permission blocked follow-up: `11_codex_tasks/226_pre_data_permission_blocked_follow_up.md`
- Loop 227 local restore cluster listen scope read-only inspection: `11_codex_tasks/227_local_restore_cluster_listen_scope_read_only_inspection.md`
- Loop 228 restore drill cluster loopback remediation plan: `11_codex_tasks/228_restore_drill_cluster_loopback_remediation_plan.md`
- Loop 229 restore drill cluster loopback remediation execution: `11_codex_tasks/229_restore_drill_cluster_loopback_remediation_execution.md`
- Loop 230 owner-aligned target DB provisioning gate: `11_codex_tasks/230_owner_aligned_target_db_provisioning_gate.md`
- Loop 231 owner-aligned target DB provisioning execution: `11_codex_tasks/231_owner_aligned_target_db_provisioning_execution.md`
- Loop 232 owner-aligned pre-data restore retry gate: `11_codex_tasks/232_owner_aligned_pre_data_restore_retry_gate.md`
- Loop 233 owner-aligned pre-data restore retry execution: `11_codex_tasks/233_owner_aligned_pre_data_restore_retry_execution.md`
- Loop 234 owner-aligned pre-data retry blocked follow-up: `11_codex_tasks/234_owner_aligned_pre_data_retry_blocked_follow_up.md`
- Loop 235 restore cluster listen classifier refinement without changes: `11_codex_tasks/235_restore_cluster_listen_classifier_refinement_without_changes.md`
- Loop 236 owner-aligned pre-data retry gate resume: `11_codex_tasks/236_owner_aligned_pre_data_retry_gate_resume.md`
- Loop 237 owner-aligned target DB reprovision and pre-data retry execution: `11_codex_tasks/237_owner_aligned_target_db_reprovision_and_pre_data_retry_execution.md`
- Loop 238 pre-data schema extension remediation gate: `11_codex_tasks/238_pre_data_schema_extension_remediation_gate.md`
- Loop 239 operator-only sanitized schema extension classifier: `11_codex_tasks/239_operator_only_sanitized_schema_extension_classifier.md`
- Loop 240 operator sanitized schema extension result collection: `11_codex_tasks/240_operator_sanitized_schema_extension_result_collection.md`
- Loop 241 Supabase-specific extension compatibility gate: `11_codex_tasks/241_supabase_specific_extension_compatibility_gate.md`
- Loop 242 Supabase extension local compatibility preflight: `11_codex_tasks/242_supabase_extension_local_compatibility_preflight.md`
- Loop 243 operator extension identifier collection: `11_codex_tasks/243_operator_extension_identifier_collection.md`
- Loop 244 operator extension identifier retry and manual sanitized preflight: `11_codex_tasks/244_operator_extension_identifier_retry_and_manual_sanitized_preflight.md`
- Loop 245 Supabase extension package risk gate: `11_codex_tasks/245_supabase_extension_package_risk_gate.md`
- Loop 246 operator-only package candidate classifier: `11_codex_tasks/246_operator_only_package_candidate_classifier.md`
- Loop 247 package classifier blocked follow-up: `11_codex_tasks/247_package_classifier_blocked_follow_up.md`
- Loop 248 strict operator-only package candidate classifier retry: `11_codex_tasks/248_strict_operator_only_package_candidate_classifier_retry.md`
- Loop 249 strict operator package classifier input collection: `11_codex_tasks/249_strict_operator_package_classifier_input_collection.md`
- Loop 250 strict operator package classifier payload collection: `11_codex_tasks/250_strict_operator_package_classifier_payload_collection.md`
- Loop 251 classifier route freeze and DR-production readiness split: `11_codex_tasks/251_classifier_route_freeze_and_dr_production_readiness_split.md`
- Loop 252 app production path review and readiness cleanup: `11_codex_tasks/252_app_production_path_review_and_readiness_cleanup.md`
- Loop 253 local production start verification checklist execution: `11_codex_tasks/253_local_production_start_verification_checklist_execution.md`
- Loop 254 final pre-external-runtime readiness review: `11_codex_tasks/254_final_pre_external_runtime_readiness_review.md`
- Loop 255 final external runtime approval request pack: `11_codex_tasks/255_final_external_runtime_approval_request_pack.md`
- Loop 256 operator env injection dry-run checklist: `11_codex_tasks/256_operator_env_injection_dry_run_checklist.md`
- Loop 257 operator env injection dry-run approval gate: `11_codex_tasks/257_operator_env_injection_dry_run_approval_gate.md`
- Loop 258 operator env injection dry-run without secret values: `11_codex_tasks/258_operator_env_injection_dry_run_without_secret_values.md`
- Loop 259 env inventory mismatch cleanup: `11_codex_tasks/259_env_inventory_mismatch_cleanup.md`
- Loop 261 actual runtime env presence check: `11_codex_tasks/261_actual_runtime_env_presence_check.md`
- Loop 262 line runtime env injection permission gate: `11_codex_tasks/262_line_runtime_env_injection_permission_gate.md`
- Loop 264 line runtime env category injection and boolean verification: `11_codex_tasks/264_line_runtime_env_category_injection_and_boolean_verification.md`
- Loop 265 line runtime env post-injection record: `11_codex_tasks/265_line_runtime_env_post_injection_record.md`
- Loop 266 line runtime permission gate without message send: `11_codex_tasks/266_line_runtime_permission_gate_without_message_send.md`
- Loop 267 line message send permission gate: `11_codex_tasks/267_line_message_send_permission_gate.md`
- Loop 268 single controlled LINE message send: `11_codex_tasks/268_single_controlled_line_message_send.md`
- Loop 269 single controlled LINE message send with operator attestation: `11_codex_tasks/269_single_controlled_line_message_send_with_operator_attestation.md`
- Loop 270 production Go decision record: `11_codex_tasks/270_production_go_decision_record.md`
- Loop 270 post-Go monitoring baseline: `15_runbooks/post_go_monitoring_baseline.md`
- Loop 271 post-Go monitoring review: `11_codex_tasks/271_post_go_monitoring_review.md`
- Loop 271 DR remediation after production Go: `15_runbooks/dr_remediation_after_production_go.md`
- Loop 272 DR remediation strategy review: `11_codex_tasks/272_dr_remediation_strategy_review_after_production_go.md`
- Loop 273 DR backup artifact validation preflight: `11_codex_tasks/273_dr_backup_artifact_validation_preflight.md`
- Loop 274 DR artifact metadata intake and validation: `11_codex_tasks/274_dr_artifact_metadata_intake_and_validation.md`
- DR backup artifact validation preflight runbook: `15_runbooks/dr_backup_artifact_validation_preflight.md`
- Loop 275 DR restore retry preflight decision: `11_codex_tasks/275_dr_restore_retry_preflight_decision.md`
- DR restore retry preflight decision runbook: `15_runbooks/dr_restore_retry_preflight_decision.md`
- Loop 276 DR restore retry controlled execution approval: `11_codex_tasks/276_dr_restore_retry_controlled_execution_approval.md`
- DR restore retry controlled execution approval runbook: `15_runbooks/dr_restore_retry_controlled_execution_approval.md`
- Loop 277 operator-side DR restore retry result intake: `11_codex_tasks/277_operator_side_dr_restore_retry_result_intake.md`
- Loop 278 operator-side restore execution followup: `11_codex_tasks/278_operator_side_restore_execution_followup.md`
- DR operator-side restore execution followup runbook: `15_runbooks/dr_operator_side_restore_execution_followup.md`
- Loop 279 operator-side DR restore retry execution approval decision: `11_codex_tasks/279_operator_side_dr_restore_retry_execution_approval_decision.md`
- Loop 280 conditional Codex-managed DR restore retry execution: `11_codex_tasks/280_conditional_dr_restore_retry_execution.md`
- Loop 281 DR restore execution blocker resolution: `11_codex_tasks/281_dr_restore_execution_blocker_resolution.md`
- DR operator-side restore retry procedure: `15_runbooks/dr_operator_side_restore_retry_procedure.md`
- Loop 282 conditional DR restore retry execution with resolved procedure: `11_codex_tasks/282_conditional_dr_restore_retry_execution_with_resolved_procedure.md`
- Loop 283 DR restore execution prerequisite resolution and guarded helper: `11_codex_tasks/283_dr_restore_execution_prerequisite_resolution_and_guarded_helper.md`
- DR guarded restore retry helper runbook: `15_runbooks/dr_guarded_restore_retry_helper.md`
- Loop 284 VPS guarded helper delivery / sync blocker resolution: `11_codex_tasks/284_vps_guarded_helper_delivery_sync_blocker_resolution.md`
- Loop 285 guarded DR restore runtime input injection: `11_codex_tasks/285_guarded_dr_restore_runtime_input_injection.md`
- Loop 286 operator-provided runtime input handoff: `11_codex_tasks/286_operator_provided_runtime_input_handoff.md`
- Loop 287 operator runtime input readiness gate: `11_codex_tasks/287_operator_runtime_input_readiness_gate.md`
- Loop 288 operator runtime input preflight result intake: `11_codex_tasks/288_operator_runtime_input_preflight_result_intake.md`
- Loop 289 DR restore execution approval decision: `11_codex_tasks/289_dr_restore_execution_approval_decision.md`
- Loop 290 one-time DR restore retry execution: `11_codex_tasks/290_one_time_dr_restore_retry_execution.md`
- Loop 291 DR restore failure diagnosis without retry: `11_codex_tasks/291_dr_restore_failure_diagnosis_without_retry.md`
- Loop 292 human/operator sanitized failure category intake: `11_codex_tasks/292_human_operator_sanitized_failure_category_intake.md`
- Loop 293 sanitized failure category intake and remediation direction: `11_codex_tasks/293_sanitized_failure_category_intake_and_remediation_direction.md`
- Loop 294 schema conflict remediation execution package without DB change: `11_codex_tasks/294_schema_conflict_remediation_execution_package_without_db_change.md`
- Loop 295 fresh DR validation target restore preflight approval package: `11_codex_tasks/295_fresh_dr_validation_target_restore_preflight_approval_package.md`
- Loop 296 fresh DR validation target one-time restore execution: `11_codex_tasks/296_fresh_dr_validation_target_one_time_restore_execution.md`
- Loop 297 operator-side fresh DR restore execution result intake: `11_codex_tasks/297_operator_side_fresh_dr_restore_execution_result_intake.md`
- Loop 298 fresh DR restore failure diagnosis with scoped diagnostics: `11_codex_tasks/298_fresh_dr_restore_failure_diagnosis_with_scoped_diagnostics.md`
- Loop 299 sanitized helper taxonomy improvement without restore: `11_codex_tasks/299_sanitized_helper_taxonomy_improvement_without_restore.md`
- Loop 300 DR restore route freeze and production operations resume: `11_codex_tasks/300_dr_restore_route_freeze_and_production_operations_resume.md`
- Loop 301 production operations hardening package: `11_codex_tasks/301_production_operations_hardening_package.md`
- Loop 302 Friday demo rehearsal and final production smoke verification: `11_codex_tasks/302_friday_demo_rehearsal_and_final_production_smoke.md`
- Loop 303 final demo delivery handoff and production change freeze: `11_codex_tasks/303_final_demo_delivery_handoff_and_production_change_freeze.md`
- Loop 303 demo save real_push_disabled blocker fix: `11_codex_tasks/303_demo_save_real_push_disabled_blocker_fix.md`
- Loop 304 controlled production rollout for admin/API runtime: `11_codex_tasks/304_controlled_production_rollout_admin_api_runtime.md`
- Loop 305 production rollout blocker remediation: `11_codex_tasks/305_production_rollout_blocker_remediation.md`
- Loop 306 production external-send enablement decision gate: `11_codex_tasks/306_production_external_send_enablement_decision_gate.md`
- Loop 307 controlled LINE real send canary activation: `11_codex_tasks/307_controlled_line_real_send_canary_activation.md`
- Loop 308 LINE canary blocker remediation and operator package: `11_codex_tasks/308_line_canary_blocker_remediation_and_operator_package.md`
- Loop 309 unexpected LINE real send disable and safety reset: `11_codex_tasks/309_unexpected_line_real_send_disable_and_safety_reset.md`
- Loop 311 LINE canary blocker remediation by operator-controlled window: `11_codex_tasks/311_line_canary_blocker_remediation_by_operator_window.md`
- Loop 312 production staff reply real-send UI gate implementation: `11_codex_tasks/312_production_staff_reply_real_send_ui_gate.md`
- Loop 313 LIFF customer registration and contact change: `11_codex_tasks/313_liff_customer_registration_and_contact_change.md`
- Loop 314 internal staff notification LINE account boundary: `11_codex_tasks/314_internal_staff_notification_line_account_boundary.md`
- Loop 315 customer LINE update staff alert entrypoints: `11_codex_tasks/315_customer_line_update_staff_alert_entrypoints.md`
- Loop 316 model house reservation rich menu guidance: `11_codex_tasks/316_model_house_reservation_rich_menu_guidance.md`
- Loop 317 home building consultation rich menu guidance: `11_codex_tasks/317_home_building_consultation_rich_menu_guidance.md`
- Loop 318 works rich menu guidance: `11_codex_tasks/318_works_rich_menu_guidance.md`
- Loop 319 catalog request rich menu guidance: `11_codex_tasks/319_catalog_request_rich_menu_guidance.md`
- Loop 320 contact staff rich menu flow: `11_codex_tasks/320_contact_staff_rich_menu_flow.md`
- Loop 321 staff LINE webhook foundation: `11_codex_tasks/321_staff_line_webhook_foundation.md`
- Loop 322 staff LINE target persistence and diagnostics: `11_codex_tasks/322_staff_line_target_persistence_and_diagnostics.md`
- Loop 323 staff LINE runtime config enablement: `11_codex_tasks/323_staff_line_runtime_config_enablement.md`
- Loop 324 customer channel staff notification temporary fallback: `11_codex_tasks/324_customer_channel_staff_notification_temporary_fallback.md`
- Loop 325 customer rich menu switching: `11_codex_tasks/325_customer_rich_menu_switching.md`
- Production operations hardening package runbook: `15_runbooks/production_operations_hardening_package.md`
- Production read-only smoke script: `../scripts/ops/production_readonly_smoke.sh`
- LINE canary operator window helper: `../scripts/ops/line_canary_window_operator.sh`

## Prompts and Templates

- `12_prompts/`: Codex作業依頼、レビュー依頼、AI要約、AI返信下書きのプロンプト
- `13_templates/`: タスク、ADR、機能仕様、バグ報告のテンプレート
- `16_handoff/`: Codex完了結果とChatGPTレビュー依頼の手動handoffテンプレート

## Story Matrix

- `17_story_matrix/`: user story、ops story、DR readiness、production-vs-DR readiness、verification matrix。safe-to-run検証とoperator approval required項目を分けて管理します。
