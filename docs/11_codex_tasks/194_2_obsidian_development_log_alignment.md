# Loop 194.2: Obsidian Development Log Alignment

## Goal

Formalize the repository Markdown logs as an Obsidian-readable development log system.

## Scope

- Add an Obsidian entry file at the repo root.
- Add Obsidian helper docs under `docs/16_obsidian/`.
- Mark `docs/14_dev_logs/` as the official DevelopmentLog location.
- Mark `docs/11_codex_tasks/` as the official Loop task location.
- Mark `docs/15_runbooks/` as the official Runbook location.
- Add a Loop log template with DevelopmentLog, Decisions, Risks, Checklist, Validation, and Next Loop sections.
- Add a link map for the current task/runbook/dev log trail.
- Document `.obsidian` handling.
- Add static tests.
- Update README, dev loop docs, and dev log.

## Out Of Scope

- Runtime changes.
- API changes.
- UI changes.
- DB migration.
- Supabase CLI/API, DB export, or restore.
- LINE send.
- OpenAI API call.
- Nginx reload/restart.
- DNS or certbot changes.
- `.env` display or change.
- Obsidian app launch or external Vault write.

## Obsidian Usage Policy

```txt
obsidian_alignment_status=complete
repo_root_vault_documented=true
obsidian_entry_file=OBSIDIAN.md
dev_log_location=docs/14_dev_logs
task_doc_location=docs/11_codex_tasks
runbook_location=docs/15_runbooks
loop_template_created=true
link_map_created=true
```

The repository root `/Users/sakio/Desktop/PROJECT/amami-line-crm` may be opened as an Obsidian Vault. Markdown logs in the repo remain the source of truth. GitHub-pushed Markdown is the preserved shared record. Obsidian is for viewing, searching, linking, and reviewing.

## .obsidian Policy

The Loop added selective `.gitignore` entries for root Vault personal state:

- `.obsidian/workspace*`
- `.obsidian/cache`
- `.obsidian/plugins`
- `.obsidian/themes`

The whole `.obsidian` directory is not globally ignored so future shared Markdown-based settings can be discussed separately if needed. This Loop does not create or commit `.obsidian` settings.

## Validation

Static tests verify the entry file, helper docs, template sections, link map, dev loop policy, README entry, dev log entry, and secret-safe docs.

## Production Safety

```txt
runtime_changes_performed=false
api_changes_performed=false
ui_changes_performed=false
db_changes_performed=false
infra_changes_performed=false
line_send_performed=false
openai_api_performed=false
supabase_cli_api_export_performed=false
nginx_dns_certbot_changes=false
secrets_recorded=false
```

## Next Loop

Loop 195: Supabase backup path decision after Free Plan limitation
