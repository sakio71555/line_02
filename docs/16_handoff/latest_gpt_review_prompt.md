# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, or production logs.

```text
以下は amami-line-crm の最新Codex Goal結果です。

目的:
- user story / ops story / DR readiness matrix の内容をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- safety boundaryが守られているか確認してください。
- Obsidian/dev log/handoffの記録漏れがあれば指摘してください。
- matrix completenessを確認してください。
- residual riskを整理してください。
- 次Loop候補を確認してください。
- 大きな実装へ進まず、小さいLoopに分解する方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、PII、本番ログの提示は求めないでください。
- Supabase接続、restore、pg_restore、pg_dump、psql、LINE実送信、OpenAI API、Nginx/DNS/HTTPS/certbot/public smokeはこのGoalでは禁止です。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Goal

- Goal: amami-line-crm user story / ops story / DR readiness matrix and safe verification loop
- Date: 2026-06-29
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Stage: Stage 1 inventory created and pushed; Stage 2 safe verification completed
- Scope type: docs-only matrix plus safe local/static verification

## What Changed

- Added docs/17_story_matrix/README.md.
- Added user_story_status_matrix.md.
- Added ops_story_status_matrix.md.
- Added dr_readiness_story_matrix.md.
- Added verification_matrix.md.
- Added Obsidian inventory note with Decisions / DevelopmentLog / Risks / Checklist.
- Updated README, docs index, dev log, Obsidian navigation, and handoff result.

## Matrix Summary

- Product/user stories are partially verified overall.
- Admin/customer/timeline/alert/RAG mock paths have safe local tests.
- Real LINE receive/send, OpenAI real API, Supabase DB, production infra, and restore operations are blocked in this goal.
- Backup export has succeeded.
- Restore drill has not succeeded.
- Current restore failure remains role_owner_acl_error_detected with role_owner_acl_error_count=1.
- DR readiness is not_ready_restore_failed.

## Safety Boundary

- secret_recorded=false
- db_url_recorded=false
- raw_log_displayed=false
- diagnostic_log_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- backup_artifact_copied_into_repo=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- restore_executed=false
- pg_restore_executed=false
- pg_dump_executed=false
- psql_executed=false
- line_real_send_executed=false
- openai_api_call_executed=false
- nginx_dns_https_certbot_public_smoke_executed=false
- package_changed=false
- cluster_changed=false
- db_changed=false
- production_runtime_changed=false

## Verification Plan

- git diff --check
- docs link check
- secret pattern boolean check
- npx pnpm@10.12.1 lint
- npx pnpm@10.12.1 typecheck
- npx pnpm@10.12.1 test
- npx pnpm@10.12.1 test:integration

## Verification Result

- git diff --check: passed
- docs link check: passed
- changed-file secret pattern boolean check: passed
- npx pnpm@10.12.1 lint: passed
- npx pnpm@10.12.1 typecheck: passed
- npx pnpm@10.12.1 test: passed, 199 files passed / 1 skipped, 1212 tests passed / 4 skipped
- npx pnpm@10.12.1 test:integration: passed, 199 files passed / 1 skipped, 1212 tests passed / 4 skipped

## Risks / Follow-Up

- Matrix status is an inventory, not a fresh production smoke.
- Some operational facts can drift and must be rechecked in dedicated approved loops.
- DR readiness remains incomplete until restore succeeds and sanitized validation passes.
- Future high-risk work must stay split into small loop-engineering tasks.

## Next Loop Candidate

- High-risk follow-up after this goal: Loop 216 sanitized role ACL subcategory classifier without restore
---

出力形式:

### レビュー結果
-

### Scope確認
-

### safety確認
-

### Obsidian確認
-

### matrix completeness確認
-

### residual risk
-

### next Loop候補
-
```
