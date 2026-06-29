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

## Prompts and Templates

- `12_prompts/`: Codex作業依頼、レビュー依頼、AI要約、AI返信下書きのプロンプト
- `13_templates/`: タスク、ADR、機能仕様、バグ報告のテンプレート
