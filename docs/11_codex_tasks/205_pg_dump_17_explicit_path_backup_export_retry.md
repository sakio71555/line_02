# Loop 205: pg_dump 17 Explicit Path Backup Export Retry

## 1. Purpose

Run one operator-approved Supabase backup export with the explicit PostgreSQL 17 `pg_dump` binary.

This Loop verifies that the PostgreSQL 17 client boundary from Loop 204 is usable for a real export while keeping the database URL, raw logs, and dump contents out of chat, docs, Obsidian, and Git.

## 2. Scope

Completed:

- Confirmed the worktree started clean on `main...origin/main`.
- Confirmed PostgreSQL 17 and PostgreSQL 16 client versions on the VPS.
- Confirmed the Supabase database URL was present and passed a boolean-only format check.
- Created a repo-external root-owned backup directory.
- Ran exactly one `pg_dump` export with `/usr/lib/postgresql/17/bin/pg_dump`.
- Recorded only sanitized artifact metadata.
- Updated runbooks, dev log, and Obsidian-facing notes.

Out of scope and not performed:

- Restore or restore drill.
- Migration, schema, RLS, Supabase dashboard/API, or runtime changes.
- LINE send, OpenAI API call, Nginx reload/restart, DNS, HTTPS, certbot, or public smoke.
- DB URL display, `.env` display, secret file display, raw log display, or dump content display.
- Push.

## 3. Approval State

```txt
operator_approved_backup_export_retry=true
pg_dump_17_explicit_path_required=true
pg_dump_attempt_limit=1
restore_allowed=false
production_runtime_changes_allowed=false
push_allowed=false
```

## 4. pg_dump Verification

```txt
pg_dump_17_path=/usr/lib/postgresql/17/bin/pg_dump
pg_dump_17_version=17.10 (Ubuntu 17.10-1.pgdg24.04+1)
pg_dump_16_version=16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
pg_dump_17_explicit_path_used=true
bare_pg_dump_used=false
usr_bin_pg_dump_used=false
pg_wrapper_used_for_export=false
```

## 5. Secret Boundary

```txt
supabase_db_url_present=true
supabase_db_url_format_check=passed
secrets_recorded=false
raw_log_displayed=false
raw_log_recorded=false
dump_contents_displayed=false
```

The database URL value was not displayed, written to docs, copied into Git, or included in the commit.

## 6. Export Result

```txt
pg_dump_executed=true
pg_dump_attempt_count=1
backup_export_status=success
backup_artifact_created=true
backup_artifact_in_repo=false
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
restore_executed=false
```

The artifact may contain production data and remains outside the repository in a root-only backup directory.

## 7. Safety Notes

- The backup artifact path is recorded because it does not contain secret values.
- The artifact content was not inspected or displayed.
- Raw `pg_dump` output was not displayed or stored.
- No second export attempt was made.
- Restore remains blocked until a separate explicit restore drill Loop.

## 8. Residual Risks

- Export success does not prove restore success.
- The artifact likely contains sensitive production data and must remain root-only.
- Backup retention and off-host storage are not automated in this Loop.
- Restore drill planning is still required before treating backups as fully operational.

## 9. Verification

- `git status --short`
- `git diff --check`
- secret pattern boolean check
- `npx pnpm@10.12.1 lint`

Typecheck/test may be run if needed, but this Loop changes docs only after the controlled export result is captured.

## 10. Next Loop

```txt
Loop 206: restore drill planning without production restore
```
