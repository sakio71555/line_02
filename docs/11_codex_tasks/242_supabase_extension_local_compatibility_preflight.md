# Loop 242: Supabase Extension Local Compatibility Preflight

## Purpose

Loop 242 performs a read-only preflight to determine whether the Supabase-related extension dependency recorded in Loop 240/241 can be evaluated in the local isolated PostgreSQL restore drill environment.

This Loop does not create extensions, install packages, run restore, run `pg_restore`, run `psql`, create or modify DBs, change roles, change clusters, connect to Supabase/production, or display extension identifiers.

## Scope

- Confirm start state and Loop 241 baseline.
- Run read-only VPS metadata checks for the local restore drill cluster and PostgreSQL 17 tooling.
- Check whether the operator extension identifier is available without displaying its value.
- If the identifier is available, check extension control and package availability with boolean/count output only.
- Record compatibility status and select one next Loop.
- Update runbook, dev log, Obsidian, handoff, DR readiness matrix, verification matrix, README, and docs index.
- Commit and push after validation.

## Out of Scope

- Restore retry.
- `pg_restore`.
- `psql`.
- Target DB creation or modification.
- Extension creation.
- Package installation, `apt update`, `apt upgrade`, or `apt install`.
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

## Loop 241 Baseline

```txt
extension_category_supabase_related=true
schema_error_category=extension_dependency
schema_error_confidence=high
target_db_currently_absent=true
cleanup_required=false
dr_readiness_status=not_ready_restore_failed
```

## Read-Only Preflight Result

```txt
pg_lsclusters_checked=true
target_cluster_found=true
cluster_online=true
cluster_port=55432
pg_config_available=true
postgres_major_version=17
pg_sharedir_detected=true
operator_extension_identifier_available=false
extension_control_available=unknown
extension_control_path_exists=unknown
extension_control_permission=unknown
apt_cache_available=true
package_search_count=unknown
package_candidate_maybe_available=unknown
compatibility_preflight_status=blocked
compatibility_path=blocked_missing_operator_extension_identifier
```

The local cluster and PostgreSQL 17 metadata are available, but the operator-only extension identifier was not available to the read-only check. Because the exact extension identifier must not be displayed or recorded, control-file and package availability remain unknown.

## Compatibility Decision

```txt
local_control_available=unknown
package_candidate_maybe_available=unknown
compatibility_path=blocked_missing_operator_extension_identifier
selected_next_loop=Loop 243: operator extension identifier collection
selected_next_loop_reason=collect_identifier_safely_before_control_or_package_preflight
```

## Go / No-Go

Go for this Loop:

- Read-only cluster/tooling metadata checks.
- Boolean/count-only availability checks.
- No extension identifier display.
- Docs-only compatibility decision.

Still No-Go:

- Extension creation.
- Package installation.
- Restore retry.
- `pg_restore`.
- `psql`.
- Target DB creation or modification.
- Cluster changes.
- Supabase/production DB connection.
- Raw log, exact SQL, extension name, object name, role name, dump content, row content, DB URL, or secret display.

## Cleanup State

```txt
target_db_currently_absent=true
cleanup_required=false
backup_artifact_touched=false
```

## Safety

```txt
read_only_inspection=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_modified=false
extension_created=false
package_installed=false
apt_update_executed=false
apt_upgrade_executed=false
apt_install_executed=false
schema_modified=false
role_modified=false
cluster_modified=false
cluster_restarted=false
cluster_reloaded=false
firewall_modified=false
diagnostic_log_displayed=false
raw_log_displayed=false
sql_displayed=false
extension_name_displayed=false
object_name_displayed=false
role_name_displayed=false
dump_content_displayed=false
row_content_displayed=false
backup_artifact_touched=false
db_url_displayed=false
secrets_recorded=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
production_runtime_changed=false
dr_readiness_status=not_ready_restore_failed
```
