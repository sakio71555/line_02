# Loop 234: Owner-Aligned Pre-Data Retry Blocked Follow-Up

## Purpose

Loop 233 was expected to run one owner-aligned pre-data restore retry, but the retry was safely blocked before restore because listen preflight returned:

```txt
local_cluster_loopback_only=false
external_interface_listen_detected=true
listen_entry_count=2
loopback_listen_count=1
non_loopback_listen_count=1
```

Loop 229 had previously remediated the restore drill cluster and recorded:

```txt
listen_addresses=localhost
local_cluster_loopback_only=true
external_interface_listen_detected=false
target_cluster_restart_result=success
```

Loop 234 is a docs-only follow-up to compare the Loop 229 and Loop 233 listen classification results, document likely causes, and select the next safe Loop.

This Loop does not run `psql`, restore, `pg_restore`, target DB creation/change, role changes, cluster changes, restart/reload, firewall changes, package changes, backup artifact operations, Supabase/production DB connections, or secret/raw log display.

## Loop 229 / Loop 233 Difference

| Item | Loop 229 | Loop 233 |
| --- | --- | --- |
| target cluster | `17/restore_drill_loop2091` | `17/restore_drill_loop2091` |
| port | `55432` | `55432` |
| config category | `loopback_or_localhost` | not re-read in Loop 233 |
| listen entry count | `2` | `2` |
| loopback listen count | `2` | `1` |
| wildcard listen count | `0` | `0` |
| non-loopback listen count | `0` | `1` |
| local cluster loopback only | `true` | `false` |
| external interface listen detected | `false` | `true` |
| restore attempted | `false` | `false` |
| target DB cleanup | not applicable | dropped, `cleanup_required=false` |

The difference is isolated to listen classification. Loop 233 did not show raw listen output, IP details, process details, config content, or `pg_hba` content.

## Candidate Causes

### A. Listen Classifier Refinement Without Changes

Recommended next step.

Loop 229 explicitly says it used a stricter classifier that handles loopback-compatible address formatting. Loop 233 used a simpler count model and classified one entry as non-loopback. The safest next step is to refine the classifier in a read-only Loop before changing PostgreSQL config again.

```txt
candidate=A_listen_classifier_refinement_without_changes
recommended=true
requires_restore=false
requires_pg_restore=false
requires_psql=false
requires_cluster_change=false
requires_restart=false
```

### B. Force `listen_addresses=127.0.0.1` Only Plan

Possible later remediation if the classifier confirms IPv6 or `localhost` interpretation is the issue.

This requires cluster config change and likely restart/reload, so it is not appropriate before a read-only classifier refinement Loop.

### C. Unix Socket Only Restore Plan

Possible later plan to avoid TCP listen ambiguity entirely.

This changes the future `pg_restore` connection method, so it should be planned only after the read-only classifier clarifies the actual listen state.

### D. Firewall Block Supplemental Plan

Possible supplemental defense.

Firewall rules do not fix PostgreSQL listen scope itself, so this is not the primary next step.

### E. Owner-Aligned Pre-Data Retry Despite Blocker

No-Go.

The restore retry must not run while listen safety is unresolved.

## Selected Next Loop

```txt
selected_next_loop=Loop 235: restore cluster listen classifier refinement without changes
selected_next_loop_reason=compare_loop229_and_loop233_classifier_before_remediation
```

## Loop 235 Boundary

Loop 235 should be read-only and should not perform remediation.

Allowed:

- `git status` and docs review.
- Read-only `pg_lsclusters` check.
- Read-only `ss` listen check.
- Read-only config key/category check.
- Sanitized loopback/non-loopback/wildcard counts.
- Explicit IPv4/IPv6 loopback category handling.
- Record classifier logic and result without raw IP details.
- Update docs/runbook/dev log/Obsidian/handoff/matrix.

Forbidden:

- `psql`.
- Restore or `pg_restore`.
- Target DB creation/change.
- Role creation/change.
- Cluster config change.
- Restart/reload.
- Firewall/package changes.
- Backup artifact operations.
- Supabase/production DB connection.
- Raw listen output, IP details, config full content, `pg_hba` content, DB URL, secrets, raw logs, dump content, or row content display.

## Safety

```txt
docs_only=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_modified=false
role_created=false
role_modified=false
cluster_modified=false
cluster_restarted=false
firewall_modified=false
package_modified=false
backup_artifact_used=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
diagnostic_log_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
dump_content_displayed=false
row_content_displayed=false
listen_regression_reviewed=true
next_loop_selected=true
dr_readiness_status=not_ready_restore_failed
```

## Verification

```txt
git_status_checked=true
git_diff_check_required=true
docs_link_check_required=true
secret_pattern_boolean_check_required=true
lint_required=true
typecheck_skipped_reason=docs_only_runtime_code_unchanged
test_skipped_reason=docs_only_runtime_code_unchanged
```

## Next Loop

```txt
Loop 235: restore cluster listen classifier refinement without changes
```
