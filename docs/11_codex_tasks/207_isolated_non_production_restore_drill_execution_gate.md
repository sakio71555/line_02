# Loop 207: Isolated Non-Production Restore Drill Execution Gate

## 1. Purpose

Define the execution gate for a future restore drill of the Loop 205 Supabase backup artifact.

This Loop is docs-only. It does not run `pg_restore`, `psql`, Supabase connection, restore, migration, RLS change, schema change, or production runtime change.

## 2. Scope

Completed:

- Added a restore target selection matrix.
- Defined the production/Supabase production DB misconnection prevention checklist.
- Defined artifact checksum verification steps for a future execution Loop.
- Defined the explicit PostgreSQL 17 `pg_restore` path candidate.
- Defined isolated target database requirements.
- Defined command allow/deny boundaries for a future restore execution Loop.
- Defined restore drill success criteria and failure stop conditions.
- Updated runbook, dev log, Obsidian-facing notes, README, and docs index.

Out of scope and not performed:

- `pg_restore` execution.
- `psql` execution or database connection.
- Supabase connection.
- Production database connection or restore.
- Migration, RLS, or schema change.
- Backup artifact copy into the repository.
- Dump content display, raw log display, secret value display, or DB URL display.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, public smoke, or production runtime changes.

## 3. Source Artifact Metadata

```txt
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
backup_artifact_in_repo=false
restore_executed=false
```

The artifact may contain production data. Only metadata may be recorded.

## 4. Restore Target Selection Matrix

Use this matrix to select exactly one target before any restore execution Loop.

| Candidate | Isolation | Supabase similarity | Setup risk | Data exposure risk | Decision |
| --- | --- | --- | --- | --- | --- |
| Isolated local PostgreSQL | High if disposable and not production-connected | Medium | Medium | Medium | Preferred first drill target when the host/database can be created without production credentials. |
| Disposable non-production database | High if newly created and teardown is documented | High | Medium | Medium | Acceptable if local PostgreSQL is not practical. |
| Supabase-separated verification DB | High only if it is a separate project/database | Highest | Higher | Medium | Acceptable only with explicit operator approval and proof it is not production. |
| Production database | None | Production | Catastrophic | Catastrophic | Forbidden. |

Current Loop 207 decision:

```txt
selected_restore_target=not_selected
selection_required_before_execution=true
preferred_first_target=isolated_local_postgresql_if_disposable
production_target_allowed=false
```

## 5. Production Misconnection Prevention Checklist

Before a future restore execution Loop, all items must be true:

- Target host/database name is explicitly identified as non-production.
- Target credentials are not production credentials.
- Target is not the Supabase production project/database.
- Command plan uses a target variable name that is not `SUPABASE_DB_URL`.
- Operator confirms the target is safe to overwrite or disposable.
- Runtime services are not configured to use the restore target.
- No application restart or runtime switch is bundled with restore drill execution.

No-Go if any item is unknown.

## 6. Artifact Verification Procedure

Allowed in a future execution Loop before restore:

```txt
verify_artifact_path_exists=true
verify_backup_dir_permission=700
verify_backup_file_permission=600
verify_backup_file_size=259222
verify_backup_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
```

Future command shape, not executed in Loop 207:

```sh
# Metadata only. Do not show dump contents.
stat -c '%a %s %n' /root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
sha256sum /root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
```

Verification commands must not display dump contents. Checksum output is allowed only as artifact metadata and must not include raw dump content.

Forbidden during verification:

- `cat` or text inspection of the dump.
- Copying the dump into the repository.
- Uploading dump content to chat, docs, or Obsidian.
- Displaying raw restore logs.

## 7. Isolated Target DB Requirements

The selected target must satisfy all of the following before restore execution:

- It is disposable or explicitly approved for destructive restore testing.
- It has no production application traffic.
- It has no production credentials.
- It is not the Supabase production project/database.
- Its name and host clearly include a non-production marker.
- Its teardown or lockdown plan is written before restore.
- Its connection string is not stored in docs, Obsidian, chat, or Git.

## 8. pg_restore 17 Boundary

Future restore execution must use an explicit PostgreSQL 17 path:

```txt
expected_pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
expected_pg_restore_major=17
bare_pg_restore_allowed=false
pg_wrapper_change_allowed=false
update_alternatives_change_allowed=false
symlink_change_allowed=false
```

Loop 207 does not verify or execute this command.

## 9. Allowed / Forbidden Command Boundary For Future Execution

Allowed only after explicit operator approval in a future Loop:

- Read-only artifact metadata checks: existence, permission, size, checksum.
- `pg_restore --version` using the explicit PostgreSQL 17 path.
- Restore into the selected isolated non-production target.
- Sanitized schema/table-count checks that do not display row contents.

Forbidden:

- Restore to production.
- `psql` or `pg_restore` against a production URL.
- Using `SUPABASE_DB_URL` as the restore target.
- Migration/RLS/schema changes bundled with the restore drill.
- Dump content display or raw log display.
- Production runtime changes.

## 10. Success Criteria For Future Restore Drill

A future restore drill may be marked successful only if:

- Artifact metadata verified before execution.
- Restore target was confirmed isolated and non-production.
- Restore completed without exposing dump contents or secrets.
- Expected schema objects exist after restore.
- Sanitized table counts can be collected without row contents.
- Extension, owner, privilege, RLS/policy differences are documented.
- Restore target teardown or lockdown is completed.
- Production runtime remains unchanged.

## 11. Failure Stop Conditions

Stop immediately if:

- Target is production or ambiguous.
- Artifact checksum, size, or permission does not match.
- `pg_restore` is not PostgreSQL 17.
- Any output risks exposing secrets, DB URL, raw logs, or dump contents.
- The restore target requires migration, RLS, schema, LINE, OpenAI, Nginx, DNS, HTTPS, certbot, or runtime changes in the same Loop.

## 12. Current Loop Result

```txt
restore_execution_gate_created=true
restore_target_selected=false
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
loop_208_restore_drill_target_selection_ready=true
```

## 13. Next Loop

```txt
Loop 208: restore drill target selection without restore
```
