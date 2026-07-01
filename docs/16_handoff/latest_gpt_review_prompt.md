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
loop=Loop 286 operator-provided runtime input handoff
status=blocked
blocked_reason=runtime_inputs_not_provided_by_operator
anti_proliferation_check=pass
vps_helper_available=true
vps_helper_bash_validation_status=pass
vps_helper_no_input_preflight_status=blocked_safely
runtime_inputs_available_to_codex=false
runtime_input_handoff_status=not_provided
runtime_input_injection_method=blocked
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
restricted_actions_remain_no_go=true
next_recommended_loop=Loop 287 operator runtime input execution
```

## Safety Boundary

```txt
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_recorded=false
sql_recorded=false
db_object_recorded=false
role_recorded=false
package_name_recorded=false
extension_name_recorded=false
line_identifier_recorded=false
message_body_recorded=false
line_api_response_body_recorded=false
```
