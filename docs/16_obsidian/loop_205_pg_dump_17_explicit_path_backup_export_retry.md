# Loop 205: pg_dump 17 Explicit Path Backup Export Retry

## Decisions

- Loop 205 used operator approval to run exactly one Supabase backup export.
- The export used `/usr/lib/postgresql/17/bin/pg_dump` explicitly.
- Bare `pg_dump`, `/usr/bin/pg_dump`, and pg_wrapper were not used for export.
- The backup artifact was created in a repo-external root-owned directory.
- Raw log, DB URL, secret values, and dump contents were not recorded.
- Restore remains blocked until a separate explicit Loop.

## DevelopmentLog

- Start state: `main...origin/main`, clean.
- Confirmed `pg_dump_17_version=17.10`.
- Confirmed `pg_dump_16_version=16.14`.
- Confirmed `supabase_db_url_present=true`.
- Confirmed `supabase_db_url_format_check=passed`.
- Ran one export attempt with the explicit PostgreSQL 17 path.
- Export result: `backup_export_status=success`.
- Recorded artifact metadata only.
- Updated task doc, runbooks, dev log, Obsidian README, Obsidian link map, docs index, and README.

## Risks

- The backup artifact may contain sensitive production data.
- Artifact permissions must remain restricted.
- Export success does not prove restore success.
- Restore remains untested.
- Off-host backup copy and retention automation are not implemented in this Loop.
- Secret values cannot be recovered from docs, Obsidian, or Git.
- Raw pg_dump logs may include sensitive connection context, so they were not displayed or stored.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
pg_dump_17_explicit_path_used=true
pg_dump_17_version_check_passed=true
supabase_db_url_present=true
supabase_db_url_format_check=passed
secrets_recorded=false
raw_log_displayed=false
pg_dump_executed=true
pg_dump_attempt_count=1
backup_export_status=success
backup_artifact_created=true
backup_artifact_in_repo=false
backup_file_permission_checked=true
backup_file_size_recorded=true
backup_checksum_recorded=true
restore_executed=false
production_runtime_changed=false
loop_206_restore_drill_ready=true_after_operator_approval
```

## Artifact Metadata

```txt
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
```
