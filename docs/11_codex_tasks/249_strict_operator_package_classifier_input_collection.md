# Loop 249: Strict Operator Package Classifier Input Collection

## Purpose

Loop 248 was blocked because no strict operator sanitized result payload was provided. Loop 249 is a docs-only gate that defines how the next operator input must be collected before a future classifier retry.

This Loop does not run the classifier retry. It does not run `apt-cache`, apt actions, package install/remove, extension creation, restore, `pg_restore`, `psql`, DB changes, cluster changes, Supabase connection, production connection, or runtime changes.

## Scope

- Confirm the Loop 247 strict sanitized `key=value` protocol.
- Confirm the Loop 248 blocked result: `operator_sanitized_result_absent`.
- Define the operator input collection protocol.
- Provide an allowed-key-only payload template.
- Define forbidden content and reject rules.
- Define readiness criteria for a future classifier retry.
- Keep package names, extension names, raw command output, raw logs, SQL, object names, role names, DB URLs, secrets, dump content, and row content out of docs, handoff, Obsidian, and commits.

## Out Of Scope

- Classifier retry execution.
- Package candidate confirmation.
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

## Loop 247 / 248 Baseline

```txt
loop_247_strict_classifier_retry_protocol_created=true
loop_247_allowed_keys_only_required=true
loop_247_forbidden_content_rejected=true
loop_248_classifier_retry_status=blocked
loop_248_classifier_result_valid=false
loop_248_blocked_reason=operator_sanitized_result_absent
loop_248_operator_sanitized_result_present=false
loop_248_strict_key_value_payload_received=false
package_install_no_go=true
apt_update_no_go=true
apt_upgrade_no_go=true
apt_install_no_go=true
restore_retry_no_go=true
db_change_no_go=true
supabase_connection_no_go=true
```

## Operator Input Collection Protocol

The next operator payload must be a single fenced `text` block that contains only the allowed keys below. Each line must be exactly one `key=value` pair. No prose or command output may appear before, inside, or after the block.

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

## Operator Payload Template

The operator should copy this template and replace only the placeholder values. The operator must not add package names, extension names, dependency names, command output, raw logs, SQL, object names, role names, DB URLs, or secrets.

```txt
operator_package_classifier_executed=true
operator_package_classifier_result_valid=true_or_false
operator_package_review_scope=apt_cache_search_only_or_apt_cache_search_and_show_or_none
package_candidate_count=number_only
package_candidate_exact_match_found=true_or_false_or_unknown
package_candidate_confidence=high_or_medium_or_low_or_unknown
package_candidate_source_category=pgdg_or_ubuntu_or_third_party_or_unknown
package_candidate_dependency_risk=low_or_medium_or_high_or_unknown
package_candidate_requires_install=true_or_false_or_unknown
package_candidate_requires_apt_update=true_or_false_or_unknown
package_candidate_names_disclosed=false
extension_name_disclosed=false
apt_update_executed=false
apt_upgrade_executed=false
apt_install_executed=false
package_install_executed=false
raw_package_output_disclosed=false
```

## Reject Rule

The payload must be rejected and recorded as blocked if any of the following are true:

- Payload is absent.
- Payload is empty.
- Payload mixes `key=value` lines with prose.
- Payload contains prompt text.
- Payload contains free-form explanation.
- Payload contains raw shell output.
- Payload contains raw logs.
- Payload contains secrets.
- Payload contains a DB URL.
- Payload contains SQL.
- Payload contains package names.
- Payload contains extension names.
- Payload contains DB object names.
- Payload contains role names.
- Payload contains command output body.
- Payload includes a key outside the allow list.
- Payload contains multiple formats.
- Payload contains ambiguous values Codex cannot validate.
- Any apt/package install action is marked true.
- `raw_package_output_disclosed` is not exactly `false`.

## Readiness Gate For Future Classifier Retry

`ready_for_classifier_retry=true` is allowed only when every condition below is true:

```txt
operator_sanitized_payload_present=true
classifier_input_format=strict_sanitized_key_value
allowed_keys_only=true
forbidden_content_detected=false
secret_or_db_url_detected=false
raw_log_or_command_output_detected=false
sql_or_object_or_role_detected=false
package_or_extension_identifier_detected=false
codex_validation_result=pass
dangerous_content_recorded_in_docs=false
```

If any condition fails, the future Loop must record:

```txt
ready_for_classifier_retry=false
next_loop=operator_input_recollection_or_protocol_fix
```

## Loop 249 Result

Loop 249 creates the collection protocol and template only. It does not receive or validate a real operator payload.

```txt
operator_input_collection_protocol_created=true
operator_input_template_created=true
reject_rule_created=true
future_classifier_retry_gate_created=true
operator_sanitized_payload_collected=false
ready_for_classifier_retry=false
not_ready_reason=operator_payload_not_collected_in_docs_only_gate
selected_next_loop=Loop 250: strict operator package classifier payload collection
```

## Safety

```txt
docs_only=true
classifier_retry_executed=false
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
package_candidate_names_disclosed=false
extension_name_disclosed=false
raw_package_output_disclosed=false
raw_log_displayed=false
sql_displayed=false
object_name_displayed=false
role_name_displayed=false
db_url_displayed=false
secrets_recorded=false
backup_artifact_touched=false
supabase_connection_executed=false
production_restore_executed=false
production_runtime_changed=false
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
