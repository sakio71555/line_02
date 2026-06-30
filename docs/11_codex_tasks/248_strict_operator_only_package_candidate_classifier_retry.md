# Loop 248: Strict Operator-Only Package Candidate Classifier Retry

## Purpose

Loop 247 defined a strict sanitized `key=value` protocol for retrying the operator-only package candidate classifier after Loop 246 produced malformed classifier output.

Loop 248 applies that protocol boundary. No strict operator sanitized result payload was provided in this Loop input, so the classifier retry is recorded as blocked. The retry does not proceed to package install, apt operations, extension creation, restore, `pg_restore`, `psql`, DB changes, cluster changes, Supabase connection, production connection, or runtime changes.

## Scope

- Review the Loop 247 classifier input contract and validation rule.
- Accept only strict sanitized `key=value` payloads.
- Record the classifier retry outcome using sanitized metadata only.
- Keep package names, extension names, raw package output, raw logs, SQL, object names, role names, DB URLs, and secrets out of docs, handoff, Obsidian, and commits.
- Select the next Loop based on the blocked result.

## Out Of Scope

- VPS operations.
- Nginx, DNS, HTTPS, certbot, or public smoke.
- LINE sends.
- OpenAI API calls.
- Supabase connection.
- `psql`.
- `pg_restore`.
- Restore retry.
- DB, schema, role, extension, package, or cluster changes.
- `apt update`, `apt upgrade`, `apt install`, package install, or package remove.

## Loop 247 Contract Reviewed

Loop 247 allows only the following strict sanitized keys:

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

The retry must be blocked if the input contains prompt text, free-form prose, raw shell output, raw logs, secrets, DB URLs, SQL, package names, extension names, DB object names, role names, command output, allow-list violations, mixed formats, or values Codex cannot validate.

## Classifier Retry Result

```txt
classifier_retry_status=blocked
classifier_result_valid=false
blocked_reason=operator_sanitized_result_absent
operator_sanitized_result_present=false
strict_key_value_payload_received=false
allowed_key_validation_executed=false
package_candidate_confidence=unknown
package_candidate_dependency_risk=unknown
compatibility_path=package_classifier_blocked
```

## Blocked Reason

The Loop 248 request did not include a strict sanitized operator result payload. Without that payload, Codex cannot validate allowed keys, value domains, or disclosure booleans. The only safe outcome is to block the classifier retry and request a new strict operator input in a separate Loop.

## Rejected Actions

```txt
apt_cache_executed=false
apt_update_executed=false
apt_upgrade_executed=false
apt_install_executed=false
package_install_executed=false
package_removed=false
extension_created=false
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_modified=false
schema_modified=false
role_modified=false
cluster_modified=false
cluster_restarted=false
cluster_reloaded=false
supabase_connection_executed=false
production_restore_executed=false
production_runtime_changed=false
```

## Disclosure Safety

```txt
package_candidate_names_disclosed=false
extension_name_disclosed=false
raw_package_output_disclosed=false
raw_log_displayed=false
sql_displayed=false
object_name_displayed=false
role_name_displayed=false
db_url_displayed=false
secrets_recorded=false
dump_content_displayed=false
row_content_displayed=false
backup_artifact_touched=false
```

## Go / No-Go

Go:

- Docs-only classifier retry outcome recording.
- Blocked result recording.
- Next Loop selection for strict operator input re-collection.

No-Go:

- Package install.
- `apt update`, `apt upgrade`, or `apt install`.
- Extension creation.
- Restore retry.
- `pg_restore`.
- `psql`.
- DB changes.
- Supabase / production connection.

## Next Loop

```txt
selected_next_loop=Loop 249: strict operator package classifier input collection
```

Loop 249 should collect exactly one strict sanitized `key=value` payload from the operator. It should still avoid package names, extension names, raw command output, apt operations, package installation, extension creation, restore, `pg_restore`, `psql`, DB changes, Supabase connection, and production connection.

## Readiness

```txt
production_readiness=production_no_go
dr_readiness_status=not_ready_restore_failed
```

## Verification

- `git status --short`
- `git diff --check`
- docs link check
- secret pattern boolean check
- `npx pnpm@10.12.1 lint`

Typecheck and tests are skipped because this Loop is docs-only and runtime code, config, package files, and lockfiles are unchanged.
