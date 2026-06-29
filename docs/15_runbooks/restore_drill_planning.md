# Restore Drill Planning

Loop 206 runbook.

## 1. Purpose

Plan a restore drill for the Loop 205 Supabase backup artifact without performing restore.

This runbook exists because a backup export is not enough: restore capability must be verified in an isolated non-production environment before the backup process can be considered operationally complete.

## 2. Hard Boundary

```txt
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
migration_executed=false
rls_changed=false
production_runtime_changed=false
```

Production restore is forbidden. Production DB connection is forbidden. The Loop 205 dump content must not be displayed or copied into the repository.

## 3. Source Artifact

```txt
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
backup_artifact_in_repo=false
```

The artifact may contain production data. Keep it root-only and outside Git.

## 4. Restore Target Candidates

| Candidate | Status | Rule |
| --- | --- | --- |
| Isolated local PostgreSQL | Allowed in a future approved Loop | Use a disposable database and no production credentials. |
| Disposable non-production database | Allowed in a future approved Loop | Destroy or lock after validation. |
| Separate Supabase verification database | Allowed in a future approved Loop | Must be separate from production. |
| Production database | Forbidden | Never use for a drill. |

## 5. pg_restore Boundary

Future restore drill execution should use:

```txt
expected_pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
expected_pg_restore_major=17
```

Do not rely on a bare `pg_restore` command. Do not change pg_wrapper, update-alternatives, or symlinks as part of restore execution.

## 6. Pre-Restore Artifact Verification

Allowed checks in a future execution Loop:

- Path exists.
- Parent directory permission is `700`.
- File permission is `600`.
- File size matches `259222` bytes.
- SHA-256 matches the recorded checksum.

Do not show dump contents or raw restore logs.

## 7. Validation Checklist For Future Drill

- Schema restore completes.
- Expected core tables exist.
- Sanitized table counts can be collected without exposing row contents.
- RLS and policy behavior is reviewed separately.
- Extension differences are recorded.
- Owner and privilege differences are recorded.
- App runtime remains unchanged.
- Teardown/lockdown of the restore target is completed.

## 8. Go / No-Go

Go:

- Operator approval is explicit.
- Target is confirmed non-production.
- Artifact metadata matches.
- `pg_restore` 17 explicit path is available.
- Raw logs and dump contents will remain hidden.

No-Go:

- Target is production or unclear.
- Production credentials would be used.
- Artifact checksum/permission mismatch.
- Any step would expose secrets, raw logs, or dump contents.
- Restore is bundled with migration, RLS, runtime, LINE, OpenAI, Nginx, DNS, HTTPS, or certbot changes.

## 9. Next Loop

```txt
Loop 207: isolated non-production restore drill execution gate
```

## 10. Loop 207 Execution Gate

Loop 207 adds an execution gate for the restore drill. It does not execute restore, `pg_restore`, `psql`, Supabase connection, migration, RLS, schema change, or production runtime change.

### 10.1 Restore Target Selection Matrix

Use this matrix to narrow the future restore target to exactly one candidate before execution.

| Candidate | Isolation | Supabase similarity | Setup risk | Decision |
| --- | --- | --- | --- | --- |
| Isolated local PostgreSQL | High if disposable and separated from production | Medium | Medium | Preferred first target when it can be created safely. |
| Disposable non-production database | High if newly created for the drill | High | Medium | Acceptable if local restore is impractical. |
| Supabase-separated verification database | High only if separate from production | Highest | Higher | Requires explicit operator approval and proof it is not production. |
| Production database | None | Production | Catastrophic | Forbidden. |

Current state:

```txt
restore_target_selected=false
selected_restore_target=not_selected
production_target_allowed=false
loop_208_restore_drill_target_selection_ready=true
```

### 10.2 Production Misconnection Prevention

Before any future restore execution, confirm:

- Target is explicitly non-production.
- Target credentials are not production credentials.
- Target is not the Supabase production project/database.
- Restore target variable is not `SUPABASE_DB_URL`.
- Runtime services are not pointed at the restore target.
- No application restart, runtime switch, migration, RLS, or schema change is bundled into the restore drill.

Unknown target or credential status means No-Go.

### 10.3 Artifact Verification Boundary

Allowed in a future execution Loop:

- Check artifact path existence.
- Check backup directory permission is `700`.
- Check backup file permission is `600`.
- Check backup file size is `259222` bytes.
- Check SHA-256 equals `432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493`.

Future command shape, not executed in Loop 207:

```sh
# Metadata only. Do not show dump contents.
stat -c '%a %s %n' /root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
sha256sum /root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
```

Forbidden:

- Dump content display.
- Raw restore log display.
- Repo copy of the artifact.
- Secret or DB URL display.

### 10.4 Isolated Target DB Requirements

The target selected in a future Loop must be disposable or approved for destructive restore testing, disconnected from production application traffic, clearly non-production by name/host, and paired with a written teardown or lockdown plan. The target connection string must not be committed or recorded in docs.

### 10.5 Command Boundary

Future execution must use:

```txt
expected_pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
expected_pg_restore_major=17
bare_pg_restore_allowed=false
```

Loop 207 result:

```txt
restore_execution_gate_created=true
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
```
