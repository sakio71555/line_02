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
loop=Loop 303 final demo delivery handoff and production change freeze
status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=final_demo_delivery_handoff_and_production_change_freeze
next_loop_requires_new_operator_input=false
loop_302_status=complete
loop_303_status=complete
production_change_freeze_status=active
production_change_freeze_allowed_actions=docs_handoff_readonly_smoke_only
final_demo_delivery_handoff_created=true
demo_day_start_checklist_created=true
demo_sequence_finalized=true
demo_no_go_boundary_finalized=true
demo_fallback_talk_track_created=true
post_demo_feedback_intake_template_created=true
final_read_only_smoke_status=pass
final_demo_go_status=go
safe_demo_scope_confirmed=true
dr_restore_route_status=frozen_known_risk
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 304: post-demo feedback intake and production follow-up plan
```

## Review Focus

- Confirm that Loop 303 is final delivery handoff and production change freeze work, not another DR loop.
- Confirm that `final_demo_go_status=go` is reasonable because required read-only smoke checks passed.
- Confirm that production change freeze blocks runtime code/config, DB, infra, external sends, and paid API execution.
- Confirm that the next Loop is post-demo feedback intake only after demo execution, not auto-started.

## Safety Boundary

```txt
restore_execution_in_loop_303=false
helper_preflight_executed_in_loop_303=false
helper_execute_executed_in_loop_303=false
pg_restore_restore_executed_in_loop_303=false
psql_executed_in_loop_303=false
supabase_connection_attempted_in_loop_303=false
db_change_performed_in_loop_303=false
line_real_send_executed_in_loop_303=false
openai_api_executed_in_loop_303=false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
sql_recorded=false
db_object_recorded=false
role_recorded=false
package_name_recorded=false
extension_name_recorded=false
host_or_url_recorded=false
project_ref_recorded=false
public_endpoint_url_recorded=false
```
