# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed のどれか
2. blockedの場合、同じblockerが過去に何回出ているか
3. Codexが提案した次Loop候補を採用するか、却下するか
4. 却下する場合、理由は何か
5. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
6. 次LoopのCodex文章を作ってよいか

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。

## Review Target

```txt
loop=Loop 288 operator-side runtime input helper preflight result intake
status=complete
runtime_inputs_available_to_codex=false
runtime_input_handoff_status=sanitized_result_only
helper_preflight_status=pass
restore_target_scope_confirmed=true
restore_target_scope_category=dr_validation_target
restore_retry_attempted=false
restore_retry_success=not_attempted
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
dr_restore_validation_status=preflight_pass_waiting_for_operator_execution_decision
next_action=operator_approval_decision_for_restore_execution
loop_289_auto_progression_allowed=false
```

## Safety Boundary

```txt
secret_recorded=false
db_url_recorded=false
password_recorded=false
raw_log_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_recorded=false
artifact_hash_recorded=false
artifact_exact_size_recorded=false
sql_recorded=false
db_object_recorded=false
role_recorded=false
package_name_recorded=false
extension_name_recorded=false
```
