# Loop 209.1: Isolated Local PostgreSQL Target Provisioning Approval

## 1. Purpose

Provision the local isolated PostgreSQL target on the VPS after Loop 209 was blocked by `isolated_local_postgresql_target_unavailable`.

This Loop provisions the target only. It does not restore the backup artifact, run `pg_restore` restore, connect to Supabase, connect to production DB, run migrations, change RLS, or change production runtime.

## 2. Start State

```txt
start_git_status=main...origin/main_clean
previous_loop=Loop 209
previous_failure_category=isolated_local_postgresql_target_unavailable
selected_restore_target=local_isolated_postgresql_on_vps
restore_executed=false
pg_restore_executed=false
```

## 3. Package / Server State

Pre-install state:

```txt
postgresql_17_server_installed=false
postgres_user_present=false
pg_lsclusters_available=false
pg_restore_17_path_present=true
pg_restore_version=17.10
```

Package operation:

```txt
package_operation_executed=true
package_install_requested=postgresql-17
apt_upgrade_executed=false
apt_full_upgrade_executed=false
postgresql_17_server_installed=true
installed_package_postgresql_17=17.10-1.pgdg24.04+1
installed_package_postgresql_common=291.pgdg24.04+1
installed_package_postgresql_client_17=17.10-1.pgdg24.04+1
installed_package_postgresql_client_18=18.4-1.pgdg24.04+1
postgres_user_present=true
```

Notes:

- `postgresql-client-18` and updated PostgreSQL common/client meta packages were installed as package dependencies.
- No `apt upgrade`, `apt full-upgrade`, firewall change, Nginx change, production runtime change, restore, or Supabase connection was performed.

## 4. Local Cluster / Target DB

```txt
local_cluster_created=true
local_cluster_name=restore_drill_loop2091
local_cluster_port=55432
local_cluster_status=online
local_cluster_started=true
listen_scope=localhost
local_cluster_local_only=true
restore_target_db_created=true
restore_target_db_name=amami_line_crm_restore_drill_loop2091_20260629
restore_target_db_name_contains_restore_drill=true
restore_target_verified_isolated=true
target_disposable=true
target_drop_command_known=true
```

Observed listen addresses were loopback-only:

```txt
listen_address=127.0.1.1:55432
listen_address=127.0.0.1:55432
```

## 5. pg_restore Boundary

```txt
pg_restore_17_path_present=true
pg_restore_version=17.10
pg_restore_17_version_check_passed=true
pg_restore_executed=false
restore_executed=false
```

Only `pg_restore --version` was checked. No backup artifact restore was executed.

## 6. Rollback / Remove Plan

If the target must be removed before or after the restore drill:

```txt
drop_target_db_command=runuser -u postgres -- dropdb -p 55432 amami_line_crm_restore_drill_loop2091_20260629
stop_cluster_command=pg_ctlcluster 17 restore_drill_loop2091 stop
drop_cluster_command=pg_dropcluster --stop 17 restore_drill_loop2091
```

Package handling:

- Keep `postgresql-17` installed until the restore drill is completed.
- Do not remove packages in the same Loop unless an explicit rollback Loop is approved.
- Rollback/removal must not run restore, connect to production, connect to Supabase, display secrets, or display dump contents.

## 7. Current Loop Result

```txt
target_provisioning_status=success
package_operation_executed=true
postgresql_17_server_installed=true
local_cluster_created=true
local_cluster_started=true
local_cluster_local_only=true
restore_target_db_created=true
restore_target_db_name_contains_restore_drill=true
restore_target_verified_isolated=true
pg_restore_17_path_present=true
pg_restore_17_version_check_passed=true
restore_executed=false
pg_restore_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
secrets_recorded=false
rollback_plan_documented=true
loop_209_2_restore_drill_retry_ready=true
```

## 8. Next Loop

```txt
Loop 209.2: isolated local PostgreSQL restore drill retry
```

Loop 209.2 may perform the restore drill only with explicit operator approval and must continue to prohibit Supabase/production connections, raw log display, dump content display, and secret recording.
