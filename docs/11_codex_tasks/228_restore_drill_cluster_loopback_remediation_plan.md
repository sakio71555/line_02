# Loop 228: Restore Drill Cluster Loopback Remediation Plan

## Purpose

Loop 227 confirmed that the restore drill local PostgreSQL cluster is not loopback-only:

```txt
local_cluster_loopback_only=false
external_interface_listen_detected=true
listen_entry_count=2
cluster_online=true
cluster_port=55432
```

This Loop documents a remediation plan to return the restore drill cluster to loopback-only listening before any owner-aligned target DB creation or restore retry.

This Loop is docs-only. It does not change cluster configuration, reload/restart PostgreSQL, modify firewall rules, run `psql`, run restore, run `pg_restore`, create a target DB, change roles, connect to Supabase, or touch production.

## Scope

- Summarize Loop 227 sanitized result.
- Record external listen as a blocker.
- Compare remediation candidates.
- Select one recommended direction.
- Define rollback strategy.
- Define Loop 229 execution boundary.
- Update restore drill runbook, dev log, Obsidian, handoff, DR matrix, verification matrix, README, and docs index.

## Out of Scope

- Cluster configuration changes.
- Reload/restart, `systemctl`, `pg_ctlcluster`, package changes, or firewall changes.
- `listen_addresses` edits, `pg_hba` edits, DB creation, DB modification, role changes, grants, revokes, restore, `pg_restore`, or `psql`.
- Raw listen output, public/private IP details, full config content, `pg_hba` content, diagnostic logs, raw logs, dump content, row content, DB URLs, `.env`, secrets, Supabase connection, production DB connection, production restore, LINE/OpenAI/Nginx/DNS/HTTPS/certbot/public smoke, or runtime changes.

## Start State

```txt
workdir=/Users/sakio/Desktop/PROJECT/amami-line-crm
expected_git_status_start=main...origin/main
actual_git_status_start=main...origin/main_ahead_1
ahead_commit=94a00e6 docs: record restore cluster listen inspection
loop_227_commit=94a00e6 docs: record restore cluster listen inspection
dr_readiness_status_before=not_ready_restore_failed
```

The local branch was ahead by the Loop 227 commit at Loop 228 start. No worktree changes were present. Loop 228 push will send Loop 227 and Loop 228 commits together unless Loop 227 is pushed separately before then.

## Loop 227 Result Summary

```txt
pg_lsclusters_checked=true
cluster_row_found=true
cluster_version_matches=true
cluster_name_matches=true
cluster_port_matches_55432=true
cluster_online=true
listen_scope_checked=true
listen_entry_count=2
listen_loopback_ipv4_count=1
listen_loopback_ipv6_count=0
listen_wildcard_count=0
listen_other_count=1
local_cluster_loopback_only=false
external_interface_listen_detected=true
netstat_checked=false
netstat_available=false
config_keys_checked=true
config_listen_addresses_key_present=false
config_listen_addresses_category=default_or_unset
config_port_key_present=true
config_port_matches_55432=true
config_unix_socket_directories_key_present=true
```

Raw listen addresses, public/private IP details, process command lines, config full content, and `pg_hba` content were not recorded.

## Blocker

```txt
external_listen_blocker_recorded=true
owner_aligned_target_db_creation_ready=false
restore_retry_ready=false
role_change_ready=false
dr_readiness_status=not_ready_restore_failed
```

Owner-aligned target DB creation, restore retry, and role changes remain No-Go until the restore drill cluster is proven loopback-only again.

## Remediation Candidate Comparison

| candidate | decision | reason |
| --- | --- | --- |
| Set `listen_addresses` to `localhost` | Selected primary plan | Limits PostgreSQL network listening to loopback semantics and keeps future restore drill tooling simple. A restart is likely required, so execution must be a separate approved Loop. |
| Set `listen_addresses` to `127.0.0.1,::1` | Fallback plan | More explicit IPv4/IPv6 loopback targeting if `localhost` classification remains ambiguous. Requires the same restart/rollback boundary. |
| Unix socket only operation | Future candidate | Reduces TCP exposure further but changes connection strings and restore command assumptions. Needs separate planning. |
| Firewall block for port `55432` | Defense-in-depth only | Can reduce exposure but does not fix PostgreSQL listen scope itself. Should not be the primary remediation. |
| Drop/recreate cluster | Deferred | Heavy-handed and may lose cluster-level state. Consider only if targeted config remediation fails. |
| Keep current state | No-Go | External listen is already detected and blocks restore retry safety. |

## Recommended Direction

```txt
recommended_remediation=postgresql_listen_addresses_loopback
primary_setting_plan=listen_addresses_localhost
fallback_setting_plan=listen_addresses_127_0_0_1_and_ipv6_loopback
firewall_only_plan=no_go_as_primary
cluster_drop_recreate_plan=deferred
current_state_plan=no_go
```

The recommended plan is to limit the restore drill cluster's PostgreSQL `listen_addresses` to loopback, with `localhost` as the first candidate and explicit `127.0.0.1,::1` as the fallback if verification remains ambiguous.

## Rollback Plan

Loop 229 should plan and execute rollbackable changes only after explicit approval.

Rollback requirements:

- Record pre-change sanitized state with `pg_lsclusters` and `ss`/`netstat` counts.
- Create a root-only backup of the cluster config before editing.
- Edit only the approved `listen_addresses` key.
- Treat restart as likely required for `listen_addresses`.
- Verify after restart using `pg_lsclusters` and sanitized listen-scope counts.
- If the cluster fails to come online or loopback-only verification fails, restore the config backup and restart back to the previous state.
- Record only booleans/counts/categories; do not record raw listen output, IP details, full config, `pg_hba`, secrets, DB URLs, dump content, row content, or production logs.

## Loop 229 Execution Boundary

Recommended next Loop:

```txt
Loop 229: restore drill cluster loopback remediation execution gate
```

Loop 229 may allow, after explicit operator approval:

- Read-only pre-change `pg_lsclusters` and sanitized listen-scope count.
- Root-only config backup outside the repository.
- A minimal `listen_addresses` change for the restore drill cluster only.
- PostgreSQL cluster restart if required by `listen_addresses`.
- Post-change `pg_lsclusters` and sanitized listen-scope verification.
- Rollback using the config backup if verification fails.
- Docs/dev log/Obsidian/handoff updates and commit.

Loop 229 must still prohibit:

- Supabase connection, production DB connection, production restore.
- DB creation, restore retry, `pg_restore`, role changes, grants, revokes.
- Firewall changes unless split into a separate Loop.
- Package changes.
- Raw listen output, IP details, full config display, `pg_hba` display, secrets, DB URLs, diagnostic logs, dump content, row content.
- Push, unless the Loop explicitly authorizes push.

## Go / No-Go

Go for Loop 229 planning/execution gate if:

- Operator explicitly approves cluster config remediation.
- Loop 227 external listen result is accepted as the blocker.
- Backup and rollback steps are ready.
- Verification uses sanitized boolean/count/category output.

No-Go if:

- A production/Supabase connection is required.
- A DB creation or restore retry is bundled into the remediation.
- Raw config, IP details, raw listen output, DB URLs, or secrets must be displayed.
- Reload/restart/rollback boundaries are unclear.

## Safety

```txt
docs_only=true
cluster_modified=false
cluster_reloaded=false
cluster_restarted=false
firewall_modified=false
package_modified=false
psql_executed=false
restore_executed=false
pg_restore_executed=false
target_db_created=false
target_db_modified=false
role_created=false
role_modified=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
diagnostic_log_displayed=false
raw_listen_output_displayed=false
public_ip_recorded=false
private_ip_recorded=false
config_full_content_displayed=false
pg_hba_displayed=false
db_url_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
production_runtime_changed=false
```

## Next Loop

```txt
Loop 229: restore drill cluster loopback remediation execution gate
```
