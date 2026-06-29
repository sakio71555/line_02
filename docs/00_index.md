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

## Prompts and Templates

- `12_prompts/`: Codex作業依頼、レビュー依頼、AI要約、AI返信下書きのプロンプト
- `13_templates/`: タスク、ADR、機能仕様、バグ報告のテンプレート
- `16_handoff/`: Codex完了結果とChatGPTレビュー依頼の手動handoffテンプレート

## Story Matrix

- `17_story_matrix/`: user story、ops story、DR readiness、verification matrix。safe-to-run検証とoperator approval required項目を分けて管理します。
