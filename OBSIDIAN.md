# Obsidian Development Log Entry

This repository can be opened directly as an Obsidian Vault.

## How To Open

1. Open Obsidian.
2. Choose `Open folder as vault`.
3. Select `/Users/sakio/Desktop/PROJECT/amami-line-crm`.
4. Start from this file.
5. Read daily DevelopmentLog files in [docs/14_dev_logs](docs/14_dev_logs/).
6. Follow Loop task docs in [docs/11_codex_tasks](docs/11_codex_tasks/).
7. Use Runbooks in [docs/15_runbooks](docs/15_runbooks/) for operational checks.

## Source Of Truth

- Markdown logs in this repo are the development log source of truth.
- GitHub-pushed Markdown is the preserved shared record.
- Obsidian is for viewing, searching, linking, and reviewing.
- Git is for history, preservation, and sharing.

## Main Folders

- DevelopmentLog: [docs/14_dev_logs](docs/14_dev_logs/)
- Loop task docs: [docs/11_codex_tasks](docs/11_codex_tasks/)
- Runbooks: [docs/15_runbooks](docs/15_runbooks/)
- Obsidian helpers: [docs/16_obsidian](docs/16_obsidian/)

## Search Keywords

- `Loop 194.2`
- `Loop 195`
- `Loop 196`
- `production_readiness`
- `DevelopmentLog`
- `Decisions`
- `Risks`
- `Validation`
- `Next Loop`
- `Supabase backup`
- `backup path decision`
- `LINE_REAL_PUSH_ENABLED`
- `AI_PROVIDER`

## Current Backup Trail

- Loop 194.1 recorded the Supabase Free Plan limitation and kept backup success not achieved.
- Loop 195 records the backup path decision options after that limitation.
- Loop 196 records the operator decision: `selected_path=B_planning_only`.
- Next backup action is design-only: Loop 197 Supabase CLI backup dry-run design.

## .obsidian Policy

- Opening the repo root as an Obsidian Vault is allowed.
- Obsidian workspace/cache/plugin/theme files are personal environment state and should not be committed.
- Markdown files under `docs/` remain the main operating surface.
- This repo does not require Obsidian app settings to understand the project history.

## Safety

Do not write real customer information, LINE user identifiers, API keys, `.env` values, webhook suffixes, database connection strings, private keys, prompt/response bodies, or production raw logs into Obsidian notes.
