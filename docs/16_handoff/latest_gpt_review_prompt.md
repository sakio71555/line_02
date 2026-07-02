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
loop=Loop 287 operator runtime input readiness gate
status=blocked
blocked_reason=operator_runtime_input_still_not_provided
runtime_inputs_available_to_codex=false
runtime_input_handoff_status=still_not_provided
helper_preflight_status=not_run
restore_retry_attempt_count=0
restore_retry_success=not_attempted
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
dr_restore_validation_status=paused_waiting_for_operator_runtime_input
next_action=wait_for_operator_to_provide_runtime_input
human_input_required=true
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
sql_recorded=false
db_object_recorded=false
role_recorded=false
package_name_recorded=false
extension_name_recorded=false
```
