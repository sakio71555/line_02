# Loop 206: Restore Drill Planning Without Production Restore

## 1. Purpose

Plan a safe restore drill for the Supabase backup artifact created in Loop 205.

This Loop is planning-only. It does not run `pg_restore`, connect to any database, restore production data, or modify Supabase/runtime state.

## 2. Scope

Completed:

- Recorded the Loop 205 backup artifact metadata.
- Defined restore drill target candidates.
- Defined artifact verification boundaries.
- Defined restore drill Go/No-Go conditions.
- Defined expected `pg_restore` version/path for a future Loop.
- Listed restore validation items and stop conditions.
- Updated runbook, dev log, Obsidian-facing notes, README, and docs index.

Out of scope and not performed:

- `pg_restore` execution.
- `psql` execution or DB connection.
- Supabase connection, migration, RLS, schema, or runtime changes.
- Production restore.
- Backup artifact copy into the repository.
- Dump content display, raw log display, secret value display.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, public smoke, or production runtime changes.
- Push.

## 3. Source Artifact Metadata

```txt
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
backup_artifact_in_repo=false
```

The artifact likely contains production data. Do not copy it into Git, chat, docs, or any shared location.

## 4. Candidate Restore Targets

Allowed candidates for a future restore drill:

| Candidate | Use Case | Notes |
| --- | --- | --- |
| Isolated local PostgreSQL | Fastest disposable verification | Must be outside production; must not use production credentials. |
| Disposable non-production database | Closest realistic drill | Must be created specifically for restore testing and destroyed or locked after review. |
| Supabase-separated verification DB | Supabase-like behavior | Must be a separate project/database, never the production project. |

Production database restore is forbidden.

## 5. Future pg_restore Boundary

```txt
expected_pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
expected_pg_restore_major=17
pg_restore_executed=false
psql_executed=false
```

A future restore drill Loop should verify `pg_restore --version` with the explicit PostgreSQL 17 path before any restore attempt.

## 6. Artifact Verification Scope

Allowed before restore in a future Loop:

- Verify artifact path exists.
- Verify file permission remains `600`.
- Verify parent directory permission remains `700`.
- Verify file size equals the recorded size unless a newer approved artifact is selected.
- Verify checksum equals the recorded SHA-256.

Forbidden:

- Display dump content.
- Display raw restore logs.
- Copy artifact into the repository.
- Store artifact in docs, Obsidian, chat, or Git.

## 7. Restore Drill Validation Items

A future restore drill should validate:

- Schema restore completes.
- Expected tables exist.
- Basic table counts can be collected without displaying customer data.
- Migration compatibility is understood.
- RLS and policy handling is documented.
- Extension availability is documented.
- Owner and privilege differences from `--no-owner` / `--no-privileges` are understood.
- Application runtime remains pointed at production only if no runtime changes are part of the drill.

## 8. Go / No-Go Conditions

Go only when all are true:

- Operator explicitly approves restore drill execution.
- Target database is isolated and non-production.
- Target database credentials are not production credentials.
- Artifact metadata verifies successfully.
- `pg_restore` 17 explicit path is available.
- Raw logs and dump contents will be redacted.
- Rollback or teardown plan for the restore target exists.

No-Go if any are true:

- Target is production or ambiguous.
- Restore command would use production DB URL.
- Artifact checksum or permission check fails.
- Any command would display secrets, raw logs, or dump contents.
- Operator approval is missing.

## 9. Stop Conditions

Stop immediately if:

- The selected target is not clearly non-production.
- Artifact metadata does not match.
- `pg_restore` version is not compatible.
- Restore output appears likely to expose sensitive data.
- Any migration/RLS/schema step is requested in the same Loop.
- Production runtime would be changed.

## 10. Current Loop Result

```txt
restore_drill_plan_created=true
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
migration_executed=false
rls_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
secrets_recorded=false
loop_207_restore_drill_execution_ready=false_pending_operator_approval_and_target_selection
```

## 11. Next Loop

```txt
Loop 207: isolated non-production restore drill execution gate
```
