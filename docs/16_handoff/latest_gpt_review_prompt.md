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

対象:

```txt
loop=Loop 284 VPS guarded helper delivery / sync blocker resolution
loop_status=blocked
blocked_reason=runtime_inputs_not_available_to_codex
```

Sanitized result:

```txt
anti_proliferation_check=pass
vps_git_repository_unavailable_blocker_resolved=true
vps_helper_delivery_method=non_git_script_only_delivery
vps_helper_delivery_status=success
vps_helper_available=true
vps_helper_bash_validation_status=pass
vps_helper_no_input_preflight_status=blocked_safely
runtime_inputs_available_to_codex=false
helper_preflight_status=blocked
restore_retry_attempt_count=0
restore_retry_success=not_attempted
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_readiness_status=not_ready_restore_failed
restricted_actions_remain_no_go=true
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
```

Codex proposed next minimal action:

```txt
next_recommended_loop=Loop 285 guarded DR restore runtime input injection
```

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。
