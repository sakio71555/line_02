# Loop 245: Supabase Extension Package Risk Gate

## Purpose

Loop 244 completed the read-only compatibility preflight for the Supabase-related extension dependency. The local PostgreSQL 17 environment does not have the extension control file, while package candidates may exist.

Loop 245 is a docs-only risk gate before any package installation. It compares remediation options, keeps package install and extension creation as No-Go, and selects an operator-only package candidate classifier as the next safe step.

This Loop does not run package install, `apt update`, `apt upgrade`, `apt install`, restore, `pg_restore`, `psql`, target DB creation/modification, extension creation, schema changes, role changes, cluster changes, Supabase/production DB connections, or production runtime changes.

## Loop 244 Result Summary

```txt
operator_extension_identifier_available=true
operator_extension_identifier_recorded=false
operator_extension_identifier_shell_safe=true
target_cluster_found=true
cluster_online=true
cluster_port=55432
pg_config_available=true
postgres_major_version=17
extension_control_available=false
extension_control_path_exists=false
extension_control_permission=unknown
apt_cache_available=true
package_search_count=106
package_candidate_maybe_available=true
compatibility_preflight_status=completed
compatibility_path=package_preflight_required
```

## Package Risk Summary

### Candidate Misidentification Risk

- `package_search_count=106` is intentionally broad and does not prove a matching install candidate.
- The actual package corresponding to the target extension is not confirmed.
- Because package names are not recorded in docs, handoff, Obsidian, or commits, the candidate must be narrowed through an operator-only classifier.

### Package Install Risk

- Package install changes the VPS system package state.
- Install may introduce additional dependencies.
- PostgreSQL/libpq-adjacent packages could be affected by dependencies or package source selection.
- Rollback and dependency scope must be planned before install.
- Production runtime is not directly touched by this gate, but the same VPS is involved, so install must stay split into a separate explicitly approved Loop.

### Extension Creation Risk

- Installing a package does not guarantee `CREATE EXTENSION` success.
- Extension creation is a DB change and must be tested only in a fresh isolated target DB.
- Extension creation and restore retry must remain separate from package classifier and package install planning.
- Restore fidelity may differ if a Supabase-managed extension cannot be reproduced locally.

### Supabase Compatibility Risk

- A Supabase-managed extension may not be fully reproducible in local PostgreSQL.
- Even if a package exists, local behavior may not match Supabase runtime behavior.
- If the extension is skipped or treated as compatibility-only, DR readiness must not be promoted to ready without a weakened-readiness note.

## Remediation Candidate Comparison

| Candidate | Summary | Decision | Reason |
| --- | --- | --- | --- |
| A. Operator-only package candidate classifier | Read-only classifier to narrow candidate count/confidence without recording package names. | Recommended | Needed before any package install planning. |
| B. Package install risk plan | Plan rollback, dependencies, source, and install scope. | Later | Candidate is not yet confirmed. |
| C. Local extension unavailable decision gate | Decide how to handle unreproducible Supabase extension locally. | Conditional | Use if package candidate cannot be confirmed. |
| D. Immediate apt install | Install directly. | No-Go | Candidate not confirmed, rollback not designed, and package names must not be recorded. |
| E. Immediate restore retry | Retry restore now. | No-Go | Extension dependency is still unresolved and likely to fail again. |

## Recommended Next Loop

```txt
selected_next_loop=Loop 246: operator-only package candidate classifier
selected_next_loop_reason=package_candidate_count_is_broad_and_install_requires_operator_only_narrowing
```

Loop 246 should classify package candidate confidence without exposing package names or extension names.

## Loop 246 Execution Boundary

Allowed:

- Read-only checks only.
- Operator-only extension identifier use.
- `apt-cache search` / `apt-cache show` read-only checks.
- Package candidate count.
- Candidate confidence.
- Candidate source category.
- `package_installed_status=false`.
- `install_required=true/false/unknown`.
- Next action branching.

Forbidden:

- `apt update`.
- `apt upgrade`.
- `apt install`.
- Package install or removal.
- `systemctl`.
- Cluster restart/reload.
- `CREATE EXTENSION`.
- `psql`.
- Restore / `pg_restore`.
- Target DB creation.
- Package name display or recording.
- Extension name display or recording.
- Raw log display.
- Supabase / production DB connection.

## Sanitized Package Classifier Format

```txt
operator_package_classifier_executed=true/false
package_candidate_count=<number>
package_candidate_exact_match_found=true/false
package_candidate_confidence=high/medium/low/unknown
package_candidate_source_category=pgdg/ubuntu/third_party/unknown
package_candidate_requires_install=true/false/unknown
package_candidate_requires_apt_update=true/false/unknown
package_candidate_names_disclosed=false
extension_name_disclosed=false
package_install_executed=false
apt_update_executed=false
apt_upgrade_executed=false
```

## Go / No-Go

Go for Loop 246:

- Read-only package classifier.
- No package names in docs, handoff, Obsidian, commits, or ChatGPT prompts.
- No extension name recording.
- No apt state changes.
- No DB changes.
- No restore.

Package install remains No-Go until all are known:

- Exact-match candidate status.
- Candidate source category.
- Dependency risk.
- Rollback plan.
- Install scope.
- Extension creation feasibility.
- Restore retry gate.

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
package_name_displayed=false
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
