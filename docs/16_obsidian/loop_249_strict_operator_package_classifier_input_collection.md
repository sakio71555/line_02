# Loop 249: Strict Operator Package Classifier Input Collection

## Decisions

- Loop 249 is a docs-only input collection protocol Loop.
- Classifier retry is not executed in this Loop.
- The operator payload must use only the Loop 247 allowed keys in strict `key=value` format.
- Missing, empty, mixed-format, prose, raw output, secret, DB URL, SQL, package identifier, extension identifier, object name, or role name content must be rejected.
- `ready_for_classifier_retry` remains `false` because no real operator payload is collected in this docs-only gate.
- The next Loop is `Loop 250: strict operator package classifier payload collection`.

## DevelopmentLog

- Reviewed Loop 247 strict protocol and Loop 248 blocked result.
- Added an operator input collection protocol.
- Added an allowed-key-only payload template.
- Added reject rules and future readiness criteria.
- Updated restore drill runbook, dev log, handoff latest files, DR readiness matrix, verification matrix, README, docs index, Obsidian README, and Obsidian link map.
- Ran docs validation and lint.

## Risks

- A future operator payload could still include prose or command output by mistake.
- A future operator payload could accidentally disclose package or extension identifiers.
- The package candidate remains unconfirmed until a valid sanitized payload is collected and reviewed.
- Package install remains unsafe until a separate risk review and explicit approval Loop.
- Restore readiness remains incomplete because restore has not succeeded.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
handoff_latest_codex_result_updated=true
handoff_latest_gpt_review_prompt_updated=true
operator_input_collection_protocol_created=true
operator_input_template_created=true
reject_rule_created=true
future_classifier_retry_gate_created=true
operator_sanitized_payload_collected=false
ready_for_classifier_retry=false
not_ready_reason=operator_payload_not_collected_in_docs_only_gate
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
next_loop_selected=true
```
