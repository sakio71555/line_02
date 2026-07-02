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
loop=Loop 289 DR restore execution approval decision
status=complete
operator_restore_execution_decision=approved_for_next_loop_only
approval_scope=single_restore_retry_attempt_dr_validation_target_only
execute_allowed_in_loop_289=false
execute_allowed_next_loop=true_only_with_explicit_operator_instruction
helper_preflight_status=pass
restore_target_scope_confirmed=true
restore_target_scope_category=dr_validation_target
target_scope=dr_validation_target
restore_retry_attempt_limit=1
retry_allowed=false
production_restore_allowed=false
restore_retry_attempted=false
restore_retry_success=not_attempted
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 290 one-time DR restore retry execution
loop_290_requires_explicit_operator_instruction=true
loop_290_auto_progression_allowed=false
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
