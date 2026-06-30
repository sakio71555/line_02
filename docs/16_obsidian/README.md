# Obsidian Notes

This folder keeps the Obsidian-facing navigation helpers for the project.

The repo root `/Users/sakio/Desktop/PROJECT/amami-line-crm` may be opened as an Obsidian Vault. Obsidian is used only for reading, searching, linking, and reviewing Markdown logs. It is not a product feature and does not change runtime behavior.

## Official Locations

- DevelopmentLog: [../14_dev_logs](../14_dev_logs/)
- Loop task docs: [../11_codex_tasks](../11_codex_tasks/)
- Runbooks: [../15_runbooks](../15_runbooks/)
- Entry file: [../../OBSIDIAN.md](../../OBSIDIAN.md)
- Link map: [obsidian_link_map.md](obsidian_link_map.md)
- Loop template: [loop_log_template.md](loop_log_template.md)

## Daily Flow

1. Start from [../../OBSIDIAN.md](../../OBSIDIAN.md).
2. Open the latest daily log in [../14_dev_logs](../14_dev_logs/).
3. Follow the matching Loop task doc in [../11_codex_tasks](../11_codex_tasks/).
4. Open related runbooks in [../15_runbooks](../15_runbooks/).
5. Confirm validation, safety boundary, production state, and Next Loop.

## Current Backup Decision Trail

- Loop 194.1 records the Supabase Free Plan limitation result.
- Loop 195 records the backup path decision after Free Plan limitation.
- Loop 196 records `selected_path=B_planning_only`.
- Loop 197 production operations final closeout records that no further required Loop remains.
- Loop 197 Supabase CLI backup dry-run design records an optional backup-design follow-up, still with no execution, no export, and no restore.
- Loop 198 Supabase CLI backup command pack planning records placeholder-only preflight/export/verification/artifact/restore groups and keeps execution blocked: `execution=false`, `next=Loop 199 preflight`.
- Loop 199 Supabase backup export and restore readiness accelerated closeout records the first approved preflight: `preflight_status=complete`, `backup_dir_outside_repo=true`, `backup_readiness_status=blocked_tooling_missing`, `DB export performed=false`, `restore performed=false`.
- Loop 200 Supabase backup tooling installation preflight records `pg_dump_available_after=true`, `psql_available_after=true`, `supabase_cli_installed=false`, and keeps export/restore unexecuted.
- Loop 201 Supabase backup export controlled execution reached the export gate, but `operator_supplied_db_url_present=false`, so `backup_export_status=blocked_operator_secret_not_injected`, `DB export performed=false`, `backup artifact created=false`, and `restore performed=false`.
- Loop 202 pg_dump 17 client boundary records `pg_dump_failure_categories=pg_dump_server_version_mismatch`, `detected_server_major_or_version=17.6`, `detected_pg_dump_major_or_version=16.14`, and blocks retry until PostgreSQL client 17 is available.
- Loop 202.1 Supabase DB URL secret replacement records `supabase_db_url_replaced=true`, `present=true`, `format_check=passed`, `secrets_recorded=false`, `pg_dump_executed=false`, `supabase_export_executed=false`, and `restore_executed=false`. It does not authorize backup export.
- Loop 203 PostgreSQL 17 client installation preflight records Ubuntu 24.04.3 / PostgreSQL client 16 state, notes that current APT cache does not expose `postgresql-client-17`, and keeps install/export/restore unexecuted.
- Loop 204 PostgreSQL 17 client installation records PGDG source/key addition, `postgresql-client-17 17.10` installation, `libpq5` dependency upgrade, explicit pg_dump 17 path verification, and keeps DB export/restore unexecuted.
- Loop 205 pg_dump 17 explicit path backup export retry records one operator-approved export attempt, `backup_export_status=success`, root-only repo-external artifact metadata, and keeps restore blocked for a separate Loop.
- Loop 206 restore drill planning records isolated non-production restore target options, Go/No-Go conditions, artifact verification scope, and keeps `restore_executed=false`, `pg_restore_executed=false`, `psql_executed=false`, and `production_restore_executed=false`.
- Loop 207 restore drill execution gate records target selection criteria, production misconnection prevention, artifact verification boundaries, explicit `pg_restore` 17 boundary, and keeps `restore_target_selected=false`, `restore_executed=false`, `pg_restore_executed=false`, and `psql_executed=false`.
- Loop 208 restore drill target selection chooses `local_isolated_postgresql_on_vps` as the next target candidate, keeps target DB creation/restore unexecuted, and requires explicit operator approval before Loop 209 execution.
- Loop 209 isolated local PostgreSQL restore drill execution reached preflight, verified artifact metadata and `pg_restore` 17 path, then blocked before restore because the local PostgreSQL target was unavailable. Restore, `psql`, Supabase connection, production DB connection, and target DB creation stayed unexecuted.
- Loop 209.1 isolated local PostgreSQL target provisioning installs/provisions the VPS local PostgreSQL 17 restore target, creates cluster `restore_drill_loop2091` and DB `amami_line_crm_restore_drill_loop2091_20260629`, and keeps restore/`pg_restore` restore unexecuted.
- Loop 209.2 isolated local PostgreSQL restore drill retry verifies artifact/target metadata, runs one explicit-path `pg_restore` attempt, records `restore_drill_status=failed` / `failure_category=pg_restore_exit_code_nonzero_without_raw_log`, drops the target DB, and keeps raw logs, row contents, dump contents, DB URL, secrets, Supabase, and production untouched.
- Loop 210 pg_restore failure diagnostics records `pg_restore_failure_category=unknown_without_raw_log`, confirms artifact/tooling/cluster metadata, avoids restore retry and `psql`, and designs Loop 211 as a controlled diagnostic restore with root-only raw logs and sanitized category output.
- Loop 211 controlled diagnostic restore runs one isolated diagnostic restore, stores raw output only in a repo-external root-only log, classifies the primary failure as `role_owner_acl_error_detected`, drops the diagnostic DB, and keeps raw log/dump/row/secret content out of docs and commits.
- Loop 212 role owner ACL restore remediation plan compares remediation candidates, keeps `--no-owner --no-privileges` as the required baseline for the next retry, treats extension/schema as secondary signals, and defines Loop 213 Go/No-Go without rerunning restore.
- Loop 213 controlled restore retry runs one isolated retry with explicit `--no-owner --no-privileges`, records `pg_restore_exit_code=1` / `role_owner_acl_error_count=1`, drops the target DB, and keeps raw log/dump/row/secret content out of docs and commits.

## Current Handoff Trail

- Loop 214 handoff automation v1 adds `docs/16_handoff/latest_codex_result.md` and `docs/16_handoff/latest_gpt_review_prompt.md` so Codex completion summaries can be copied into ChatGPT without exposing secrets, raw logs, dump contents, row contents, DB URLs, API keys, or production logs.
- Loop 214.1 dry-runs those templates with sanitized Loop 213 / Loop 214 results and keeps restore, `pg_restore`, `psql`, Supabase, production runtime, raw logs, dump contents, row contents, DB URLs, and secrets untouched.
- Loop 215 records the role/owner/ACL follow-up remediation gate, rejects repeating the same retry or accepting nonzero exit, and recommends Loop 216 operator-only role ACL subcategory review without raw log exposure.
- Goal story matrix inventory adds `docs/17_story_matrix/` for user stories, ops stories, DR readiness, and safe verification boundaries before the next high-risk restore remediation loop.
- Loop 216 runs a category-only classifier against the Loop 213 repo-external root-only diagnostic log, records only boolean/count output, leaves the subcategory unknown, and recommends Loop 217 operator-only raw log review gate.
- Loop 217 defines the operator-only raw log review protocol and sanitized `key=value` response format, keeps the operator result pending, and does not expose raw logs, matching lines, role names, SQL statements, object names, secrets, dump contents, row contents, or DB URLs.
- Loop 218 records the operator sanitized result as `unknown_after_operator_review` with low confidence, marks role placeholder remediation No-Go, and plans staged restore diagnostics without running restore, `pg_restore`, `psql`, target DB creation, or role changes.
- Loop 219 selects `toc_count_only` as the first staged diagnostic execution candidate, defines the next Loop boundary, and still does not run restore, `pg_restore`, `psql`, create a target DB, display TOC body, or expose object names.
- Loop 220 executes the TOC count-only diagnostic with PostgreSQL 17 explicit `pg_restore --list`, stores TOC output repo-external/root-only, records counts only, and selects `pre_data_only_restore_diagnostic_gate` as the next stage while keeping restore, target DB creation, raw TOC display, Supabase, and production untouched.
- Loop 221 defines the pre-data only diagnostic gate, requiring a future fresh local isolated target DB, explicit PostgreSQL 17 `pg_restore`, repo-external/root-only diagnostic logs, sanitized result fields, and cleanup policy while still not executing restore, `pg_restore`, `psql`, target DB creation, Supabase, or production restore.
- Loop 222 executes one pre-data only diagnostic on a fresh local isolated target DB, stores raw output repo-external/root-only, records `pre_data_permission_error_detected`, drops the target DB, and keeps raw log, object names, row content, secrets, Supabase, production restore, and runtime untouched.
- Loop 223 records the pre-data permission/auth remediation gate, compares remediation candidates, selects `Loop 224: local target privilege alignment gate without restore`, and keeps restore, `pg_restore`, `psql`, target DB changes, role changes, raw log display, Supabase, and production untouched.
- Loop 224 records the local target privilege alignment gate, creates the checklist for cluster identity, restore execution identity, target DB privilege, and pre-data risk, selects `Loop 225: local target privilege alignment inspection without changes`, and still keeps `psql`, restore, `pg_restore`, target DB changes, role changes, raw log display, Supabase, and production untouched.
- Loop 225 runs local-only metadata inspection, records counts/booleans/categories only, finds the restore drill cluster online but not proven loopback-only, and selects `Loop 226: pre-data permission blocked follow-up` while keeping restore, `pg_restore`, target DB changes, role changes, raw logs, row content, Supabase, and production untouched.
- Loop 226 records `local_cluster_loopback_only=false` as a blocker, rejects owner-aligned target DB creation or pre-data retry for now, selects `Loop 227: local restore cluster listen scope read-only inspection`, and keeps `psql`, restore, `pg_restore`, DB changes, role changes, cluster changes, firewall changes, raw logs, row content, Supabase, and production untouched.
- Loop 227 runs read-only listen-scope inspection, records only sanitized booleans/counts/categories, confirms `external_interface_listen_detected=true`, selects `Loop 228: restore drill cluster loopback remediation plan`, and keeps cluster changes, reload/restart, firewall changes, DB changes, restore, `pg_restore`, `psql`, raw output, IP details, Supabase, and production untouched.
- Loop 228 plans loopback remediation for the restore drill cluster, selects PostgreSQL `listen_addresses` loopback limiting as the recommended direction, defines rollback requirements and Loop 229 execution gate, and keeps cluster changes, reload/restart, firewall changes, DB changes, restore, `pg_restore`, `psql`, raw output, IP details, Supabase, and production untouched.
- Loop 229 executes the restore drill cluster loopback remediation for `17/restore_drill_loop2091`, backs up config repo-external/root-only, sets `listen_addresses=localhost`, restarts only that cluster, verifies loopback-only listen scope, and keeps `psql`, restore, `pg_restore`, DB changes, role changes, firewall changes, package changes, Supabase, production, raw output, IP details, and secrets untouched.
- Loop 230 defines the owner-aligned target DB provisioning gate after loopback remediation, selects a fresh local disposable `restore_drill` / `loop231` target DB naming rule, requires DB owner and future restore execution user to match, and keeps DB creation, `psql`, restore, `pg_restore`, role changes, cluster changes, Supabase, production, raw logs, dump contents, row contents, DB URLs, and secrets untouched.
- Loop 231 provisions fresh local disposable target DB `amami_line_crm_restore_drill_loop231_20260630` on the restore drill cluster, verifies owner alignment with local metadata only, retains it short-term for the next pre-data retry gate, and keeps restore, `pg_restore`, backup artifact use, Supabase, production, role changes, cluster changes, raw logs, dump contents, row contents, DB URLs, and secrets untouched.

## .obsidian Policy

- `.obsidian/workspace*`, `.obsidian/cache`, `.obsidian/plugins`, and `.obsidian/themes` are ignored because they are local personal state.
- Obsidian settings are not required for the project record.
- Markdown remains the source of truth.
