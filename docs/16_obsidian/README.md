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

## .obsidian Policy

- `.obsidian/workspace*`, `.obsidian/cache`, `.obsidian/plugins`, and `.obsidian/themes` are ignored because they are local personal state.
- Obsidian settings are not required for the project record.
- Markdown remains the source of truth.
