# Loop 241: Supabase-Specific Extension Compatibility Gate

## Purpose

Loop 240 classified the remaining pre-data restore failure as a high-confidence Supabase-related extension dependency using sanitized metadata only.

Loop 241 documents how to approach that dependency before any local restore retry, extension creation, package installation, or database change.

This Loop is docs-only. It does not run restore, `pg_restore`, `psql`, create or modify a target DB, create extensions, install packages, change roles, change cluster settings, connect to Supabase/production, or display raw diagnostic content.

## Scope

- Summarize the Loop 240 sanitized result.
- Compare compatibility options for a Supabase-related extension dependency in an isolated local PostgreSQL restore drill.
- Select the next small Loop.
- Define the Loop 242 execution boundary.
- Record Go/No-Go conditions and cleanup state.
- Update runbook, dev log, Obsidian, handoff, DR readiness matrix, verification matrix, README, and docs index.
- Commit and push after validation.

## Out of Scope

- Restore retry.
- `pg_restore`.
- `psql`.
- Target DB creation or modification.
- Extension creation.
- Package installation.
- Schema modification.
- Role creation or modification.
- Cluster changes, restart, reload, package changes, or firewall changes.
- Diagnostic/raw log display.
- Exact SQL, extension name, object name, or role name recording.
- Dump content or row content display.
- Backup artifact operations.
- Supabase or production DB connection.
- DB URL, `.env`, or secret display.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, public smoke, or production runtime changes.

## Loop 240 Result Summary

```txt
extension_category_supabase_related=true
schema_error_category=extension_dependency
schema_error_confidence=high
permission_or_auth_error_count=0
role_owner_acl_error_count=0
schema_or_sql_statement_error_count=1
extension_missing_count=2
target_db_dropped=true
target_db_currently_absent=true
cleanup_required=false
raw_content_recorded_in_repo=false
exact_sql_recorded=false
extension_name_recorded=false
object_name_recorded=false
role_name_recorded=false
dr_readiness_status=not_ready_restore_failed
```

## Compatibility Options

| option | summary | benefit | risk | current decision |
| --- | --- | --- | --- | --- |
| A. Local isolated compatible extension introduction | Later, introduce a compatible local extension path only inside the isolated restore target. | Highest local restore fidelity if feasible. | May require package installation, `CREATE EXTENSION`, rollback planning, and exact compatibility evidence. | Candidate for later execution after read-only preflight. |
| B. Treat as Supabase-managed extension and local restore skip/compat | Record the dependency as Supabase-managed and handle local restore drill with a documented compatibility gap. | Avoids unsafe local package/DB changes. | Lowers restore fidelity and may not be enough for DR readiness. | Possible fallback, not selected as final readiness path. |
| C. Exclude extension-dependent objects | Exclude or bypass affected pre-data objects in local drill. | May allow later sections to progress. | Requires object-level handling and can materially reduce fidelity. | No-Go for now. |
| D. Supabase-like non-production restore environment | Use a disposable environment closer to Supabase behavior. | Higher fidelity than plain local PostgreSQL. | More credentials, cost, boundary, and approval complexity. | No-Go without separate approval. |
| E. Immediate retry | Retry pre-data restore without new compatibility evidence. | Fast. | Likely repeats failure and risks noisy diagnostics. | No-Go. |

## Recommended Path

The recommended next Loop is:

```txt
selected_next_loop=Loop 242: Supabase extension local compatibility preflight
selected_next_loop_reason=read_only_feasibility_check_before_package_or_extension_changes
```

Loop 242 should be read-only and compatibility-focused. It should determine whether the local isolated PostgreSQL target can support the Supabase-related extension category without exposing the exact extension name in docs.

## Loop 242 Execution Boundary

Allowed in Loop 242:

- `git status` and docs inspection.
- Local restore cluster status check.
- PostgreSQL version check.
- Read-only package availability check.
- Read-only extension control availability check.
- Documentation of whether local compatibility appears feasible.
- Sanitized category/count/boolean output only.
- Commit and push if it remains read-only and docs-safe.

Forbidden in Loop 242:

- `CREATE EXTENSION`.
- Package installation or package removal.
- Restore retry or `pg_restore`.
- DB-changing `psql`.
- Target DB creation or modification.
- Role creation or modification.
- Cluster changes, restart, reload, or firewall changes.
- Supabase or production DB connection.
- DB URL, secret, `.env`, raw log, exact SQL, extension name, object name, role name, dump content, or row content display.

## Go / No-Go

Loop 242 is Go only if all of the following remain true:

```txt
loop_242_read_only=true
local_isolated_target_only=true
supabase_connection_executed=false
production_db_connection_executed=false
restore_retry_executed=false
extension_created=false
package_installed=false
exact_extension_name_recorded=false
raw_log_displayed=false
secrets_recorded=false
```

Extension installation, extension creation, package installation, and restore retry remain No-Go until a later explicit Loop confirms:

- local package/control availability,
- the need for extension creation,
- app/DR fidelity impact,
- cleanup and rollback plan,
- exact production/Supabase isolation boundary,
- and operator approval.

## Cleanup State

```txt
target_db_currently_absent=true
cleanup_required=false
backup_artifact_touched=false
```

## Safety

```txt
docs_only=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_modified=false
extension_created=false
package_installed=false
schema_modified=false
role_created=false
role_modified=false
cluster_modified=false
cluster_restarted=false
cluster_reloaded=false
firewall_modified=false
backup_artifact_touched=false
backup_artifact_copied_into_repo=false
diagnostic_log_displayed=false
diagnostic_log_copied_into_repo=false
raw_log_displayed=false
sql_displayed=false
extension_name_displayed=false
object_name_displayed=false
role_name_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
production_runtime_changed=false
dr_readiness_status=not_ready_restore_failed
```
