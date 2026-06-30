# Loop 247: Package Classifier Blocked Follow-Up

## Purpose

Loop 246 attempted the operator-only package candidate classifier, but the sanitized result contained prompt text in classifier fields. Because the classifier output cannot be trusted, Loop 246 stopped safely with `compatibility_path=package_classifier_blocked`.

Loop 247 is a docs-only blocked follow-up. It records the blocked cause and defines a strict sanitized package classifier retry protocol so the next operator review can return only allowed `key=value` fields.

This Loop does not run `apt-cache`, `apt update`, `apt upgrade`, `apt install`, package install/remove, restore, `pg_restore`, `psql`, target DB creation/modification, extension creation, schema changes, role changes, cluster changes, Supabase/production DB connections, or production runtime changes.

## Loop 246 Result Summary

```txt
operator_extension_identifier_available=true
operator_extension_identifier_shell_safe=true
apt_cache_available=true
package_search_count=106
package_search_count_broad=true
operator_package_classifier_result_valid=false
package_classifier_input_malformed=true
package_candidate_confidence=unknown
package_candidate_dependency_risk=unknown
compatibility_path=package_classifier_blocked
package_candidate_names_disclosed=false
extension_name_disclosed=false
package_install_executed=false
apt_update_executed=false
apt_upgrade_executed=false
apt_install_executed=false
```

## Blocked Cause

- `package_search_count=106` remains a broad search result, not a confirmed package candidate.
- The operator result included prompt text in classifier fields, so the result cannot be trusted.
- `operator_package_classifier_result_valid=false`.
- `package_classifier_input_malformed=true`.
- Candidate confidence and dependency risk remain `unknown`.
- Package install remains No-Go.
- `apt update`, `apt upgrade`, and `apt install` remain No-Go.
- Extension creation and restore retry remain No-Go.
- Package names and extension names are not recorded.

## Cause Candidates

- The operator input format was too free-form.
- Prompt body and actual result were mixed together.
- Codex-side validation for sanitized `key=value` only was too weak.
- Exact match classification requires a stricter set of fields.

## Strict Sanitized Result Format

The next operator response must contain only the following keys. Each key must be one line in `key=value` form.

```txt
operator_package_classifier_executed=true/false
operator_package_classifier_result_valid=true/false
operator_package_review_scope=apt_cache_search_only/apt_cache_search_and_show/none
package_candidate_count=<number>
package_candidate_exact_match_found=true/false/unknown
package_candidate_confidence=high/medium/low/unknown
package_candidate_source_category=pgdg/ubuntu/third_party/unknown
package_candidate_dependency_risk=low/medium/high/unknown
package_candidate_requires_install=true/false/unknown
package_candidate_requires_apt_update=true/false/unknown
package_candidate_names_disclosed=false
extension_name_disclosed=false
apt_update_executed=false
apt_upgrade_executed=false
apt_install_executed=false
package_install_executed=false
raw_package_output_disclosed=false
```

Forbidden in the operator response:

- Prompt body.
- Package names.
- Extension names.
- `apt-cache search` / `apt-cache show` body.
- Dependency package names.
- Command output body.
- Raw logs.
- SQL.
- Object names.
- Role names.

## Validation Rule

Valid only if all conditions are true:

- No keys other than the allowed keys are present.
- No package-like names are present.
- No extension-like names are present.
- No prompt body is present.
- `package_candidate_confidence` is one of `high`, `medium`, `low`, or `unknown`.
- `package_candidate_dependency_risk` is one of `low`, `medium`, `high`, or `unknown`.
- `apt_update_executed=false`.
- `apt_upgrade_executed=false`.
- `apt_install_executed=false`.
- `package_install_executed=false`.
- `raw_package_output_disclosed=false`.

Invalid if any condition is true:

- Package name is included.
- Extension name is included.
- Prompt body is included.
- `apt-cache` output body is included.
- Dependency package name is included.
- Raw log, SQL, object name, or role name is included.
- Any apt/package install action is marked true.

Invalid result handling:

- Do not retry automatically.
- Record the result as blocked.
- Do not proceed to package install.
- Do not proceed to extension creation.
- Do not proceed to restore retry.

## Loop 248 Boundary

Selected next Loop:

```txt
selected_next_loop=Loop 248: strict operator-only package candidate classifier retry
```

Loop 248 allowed:

- Operator-only `apt-cache search` / `apt-cache show` read-only review.
- Package names are not displayed or recorded.
- Extension names are not displayed or recorded.
- Strict sanitized `key=value` output only.
- No `apt update`.
- No `apt upgrade`.
- No `apt install`.
- No restore.
- No DB changes.

Loop 248 forbidden:

- `apt update`.
- `apt upgrade`.
- `apt install`.
- Package install.
- `psql`.
- Restore / `pg_restore`.
- Extension creation.
- DB changes.
- Package name recording.
- Extension name recording.
- Prompt body mixed into result.

## Go / No-Go

Go:

- Docs-only blocked follow-up.
- Strict retry protocol creation.
- Next Loop selection.

No-Go:

- Package install.
- `apt update`, `apt upgrade`, and `apt install`.
- Restore retry.
- Extension creation.
- DB changes.
- Supabase / production connection.

## Cleanup

```txt
target_db_currently_absent=true
cleanup_required=false
```

## Safety

```txt
docs_only=true
apt_cache_executed=false
apt_update_executed=false
apt_upgrade_executed=false
apt_install_executed=false
package_install_executed=false
package_removed=false
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_modified=false
extension_created=false
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
backup_artifact_touched=false
secrets_recorded=false
supabase_connection_executed=false
production_restore_executed=false
production_runtime_changed=false
strict_classifier_retry_protocol_created=true
dr_readiness_status=not_ready_restore_failed
```

## Verification

- `git status --short`
- `git diff --check`
- docs link check
- secret pattern boolean check
- `npx pnpm@10.12.1 lint`

Typecheck/test are skipped because this Loop changes docs only and no runtime code changed.
