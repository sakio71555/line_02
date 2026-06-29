# Loop 208: Restore Drill Target Selection Without Restore

## 1. Purpose

Select one isolated non-production restore drill target for the next execution Loop.

This Loop is target-selection only. It does not create a target database, run restore, run `pg_restore`, run `psql`, connect to Supabase, connect to production DB, change schema, run migration, change RLS, or change production runtime.

## 2. Source Artifact Metadata

```txt
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
pg_dump_17_path=/usr/lib/postgresql/17/bin/pg_dump
pg_restore_17_expected_path=/usr/lib/postgresql/17/bin/pg_restore
restore_executed=false
pg_restore_executed=false
psql_executed=false
production_restore_executed=false
```

The artifact may contain production data. Keep it repo-external and do not display dump contents.

## 3. Candidate Comparison

| Candidate | Production/Supabase misconnection safety | Artifact handling | `pg_restore` 17 availability | Extension/owner/RLS observation | Create/drop ease | Repo-external | Operator manageability | Assessment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Local isolated PostgreSQL on VPS | High if localhost-only, disposable, and not wired to app runtime | Strong: artifact already exists on VPS root-only path; no transfer needed | Strong: expected path is on VPS | Medium: local PostgreSQL may differ from Supabase but can reveal schema restore issues | Medium: requires local DB setup/drop in future Loop | Strong | Strong for root/operator flow | Recommended first target |
| B. Local isolated PostgreSQL on developer Mac | High if fully local and disposable | Weak: artifact would need safe transfer or remote access, increasing handling risk | Unknown on Mac | Medium | Medium | Risky due artifact movement | Medium | Not recommended first |
| C. Disposable non-production PostgreSQL database | Medium/high if clearly separate from production | Medium: may require network transfer or extra credentials | Depends on host/client | Medium/high | Medium | Depends on host | Medium | Acceptable fallback |
| D. Supabase-separated verification DB | Medium: closest to Supabase but higher project/secret confusion risk | Medium: requires separate project credentials | Depends on client boundary | High | Medium | Depends on project setup | Higher operator burden | Later-stage option only |

## 4. Selected Target

```txt
restore_target_selected=true
selected_restore_target=local_isolated_postgresql_on_vps
selected_restore_target_candidate=A
selected_restore_target_network_scope=localhost_only
selected_restore_target_disposable_required=true
selected_restore_target_database_name_pattern=amami_restore_drill_loop209_disposable
selected_restore_target_uses_supabase_production=false
selected_restore_target_uses_production_credentials=false
selected_restore_target_public_network_exposure=false
```

Rationale:

- The backup artifact already lives on the VPS in a root-only repo-external backup directory.
- The PostgreSQL 17 client toolchain is already present on the VPS.
- Avoids copying the artifact to the developer Mac or another service.
- Keeps the first restore drill isolated from Supabase production and app runtime.
- Can be destroyed after verification.

This is target selection only. The target database is not created in Loop 208.

## 5. Loop 209 Allow / Deny Boundary

Allowed in Loop 209 only after explicit operator approval:

- Create an isolated localhost-only non-production PostgreSQL restore target on the VPS.
- Verify artifact path, permission, size, and checksum.
- Verify `/usr/lib/postgresql/17/bin/pg_restore --version`.
- Run `/usr/lib/postgresql/17/bin/pg_restore` against the selected isolated target.
- Run minimal sanitized verification against the isolated target.
- Drop the target or record its restricted isolation/teardown plan.

Still forbidden in Loop 209:

- Production DB connection.
- Supabase production connection.
- Production restore.
- Migration execution.
- RLS change.
- Schema change outside the isolated restore target.
- LINE/OpenAI/Nginx/DNS/HTTPS/certbot/public smoke.
- DB URL display.
- Raw log display.
- Dump content display.
- App runtime change.

## 6. Misconnection Prevention Checklist

Loop 209 must confirm all items before restore:

- `target_host=localhost` or explicit non-production host.
- `target_database_name` includes `restore_drill`, `disposable`, or `nonprod`.
- Target is not a Supabase project host.
- Target is not production hostname.
- Target credentials are not production credentials.
- Restore command does not use production environment variables.
- Restore command does not use `SUPABASE_DB_URL`.
- Shell history and logs do not record secrets.
- Raw restore log is not displayed.
- Target can be dropped after the drill.
- App runtime remains pointed at production runtime and is not restarted or reconfigured.

If any item is unknown, Loop 209 must stop before restore.

## 7. Success Criteria For Loop 209

Minimum success criteria:

- `pg_restore` exits successfully.
- Artifact metadata matched before restore.
- Target identity is recorded as isolated non-production.
- Restored schema can be inspected without sensitive row data display.
- Key application tables exist.
- Table counts, if collected, are aggregate counts only.
- Sensitive row content is not displayed.
- Extension, owner, privilege, and RLS/policy differences are recorded.
- Target is dropped, or a restricted isolation and teardown plan is recorded.
- Docs/dev log/Obsidian record metadata only.

## 8. Failure Stop Conditions

Stop immediately if:

- Target appears to be production or Supabase production.
- Target identity is ambiguous.
- Checksum, size, or permission mismatch is found.
- `pg_restore` major version is not 17.
- Any command appears likely to reference `SUPABASE_DB_URL` or production env.
- Raw logs may contain secrets or row data.
- Dump content display seems necessary.
- Extension, owner, or privilege errors require broad migration/schema changes.
- An incomplete target remains and cannot be safely isolated or dropped.

## 9. Current Loop Result

```txt
restore_target_selection_documented=true
restore_target_selected=true
selected_restore_target=local_isolated_postgresql_on_vps
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
target_db_created=false
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
loop_209_restore_drill_execution_ready=true_pending_operator_approval
```

## 10. Next Loop

```txt
Loop 209: isolated local PostgreSQL restore drill execution
```
