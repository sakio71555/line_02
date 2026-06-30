# Loop 246: Operator-Only Package Candidate Classifier

## Purpose

Loop 246 attempts the operator-only package candidate classifier selected by Loop 245. The goal is to narrow package candidate confidence without exposing package names or extension names and without changing system package state.

The operator-provided sanitized result was malformed because prompt text was pasted into several classifier fields. For safety, the classifier result is treated as invalid, package compatibility remains blocked, and the next Loop is a blocked follow-up.

This Loop does not install packages, run `apt update`, run `apt upgrade`, run `apt install`, run restore, run `pg_restore`, run `psql`, create or change target DBs, create extensions, change schemas, change roles, change clusters, connect to Supabase/production DBs, or change production runtime.

## Scope

- Record the operator classifier attempt as sanitized metadata.
- Record the malformed classifier fields without copying the malformed prompt text.
- Keep package names and extension names undisclosed.
- Keep package install and restore retry as No-Go.
- Update runbook, dev log, Obsidian, handoff, DR matrix, verification matrix, README, and docs index.

## Out of Scope

- Package installation or removal.
- `apt update`, `apt upgrade`, or `apt install`.
- Package name or extension name disclosure.
- `psql`, restore, or `pg_restore`.
- Target DB creation or modification.
- Extension creation.
- Schema, role, or cluster changes.
- Supabase/production DB connections.
- Raw log, dump content, row content, DB URL, or secret display.

## Loop 245 Result Summary

```txt
extension_control_available=false
package_search_count=106
package_candidate_maybe_available=true
package_search_count_broad=true
package_candidate_confirmed=false
package_install_no_go=true
apt_update_no_go=true
apt_upgrade_no_go=true
apt_install_no_go=true
selected_next_loop=Loop 246: operator-only package candidate classifier
dr_readiness_status=not_ready_restore_failed
```

## Sanitized Operator Result

```txt
operator_package_classifier_executed=true
operator_package_classifier_result_valid=false
package_classifier_input_malformed=true
operator_extension_identifier_available=true
operator_extension_identifier_shell_safe=true
apt_cache_available=true
package_candidate_count=106
package_candidate_exact_match_found=unknown
package_candidate_confidence=unknown
package_candidate_source_category=unknown
package_candidate_requires_install=unknown
package_candidate_requires_apt_update=unknown
package_candidate_show_reviewed=unknown
package_candidate_dependency_risk=unknown
package_candidate_names_disclosed=false
extension_name_disclosed=false
package_install_executed=false
apt_update_executed=false
apt_upgrade_executed=false
```

## Decision

```txt
compatibility_path=package_classifier_blocked
operator_result_accepted=false
selected_next_loop=Loop 247: package classifier blocked follow-up
selected_next_loop_reason=sanitized_operator_classifier_result_was_malformed
```

## Go / No-Go

Go:

- Record the classifier attempt as sanitized metadata.
- Record unknown values for malformed fields.
- Keep exact package names and extension names out of docs, handoff, Obsidian, and commits.

No-Go:

- Package install.
- `apt update`, `apt upgrade`, and `apt install`.
- Extension creation.
- Restore retry.
- Supabase/production connection.
- DB/schema/role/cluster changes.

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
package_removed=false
apt_update_executed=false
apt_upgrade_executed=false
apt_install_executed=false
schema_modified=false
role_modified=false
cluster_modified=false
cluster_restarted=false
cluster_reloaded=false
diagnostic_log_displayed=false
raw_log_displayed=false
sql_displayed=false
extension_name_displayed=false
package_name_displayed=false
object_name_displayed=false
role_name_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
supabase_connection_executed=false
production_restore_executed=false
production_runtime_changed=false
dr_readiness_status=not_ready_restore_failed
```

## Verification

- `git status --short`
- `git diff --check`
- docs link check
- secret pattern boolean check
- `npx pnpm@10.12.1 lint`

Typecheck/test are skipped because this Loop changes docs only and no runtime code changed.
