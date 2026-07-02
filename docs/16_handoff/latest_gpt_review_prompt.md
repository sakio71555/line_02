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
loop=Loop 302 Friday demo rehearsal and final production smoke verification
status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=friday_demo_rehearsal_and_final_production_smoke
next_loop_requires_new_operator_input=false
loop_301_status=complete
loop_302_status=complete
friday_demo_rehearsal_completed=true
final_production_smoke_verification_status=pass
friday_demo_readiness_status=ready
safe_demo_scope_confirmed=true
friday_demo_scope=admin_health_line_api_current_runtime_readonly
line_real_send_in_demo=false
openai_api_execution_in_demo=false
production_db_change_in_demo=false
production_read_only_baseline_checked=true
public_api_health_status_code=200
public_admin_root_status_code=200
public_customers_no_auth_status_code=401
dr_restore_route_status=frozen_known_risk
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 303: final demo delivery handoff and production change freeze
```

## Review Focus

- Confirm that Loop 302 is practical Friday demo readiness work, not another DR loop.
- Confirm that the demo is safe: no send, no paid API execution, no DB change, no restore.
- Confirm that `ready` is reasonable because the required read-only smoke checks passed.
- Confirm that DR remains a frozen known risk and is not hidden.
- Confirm whether Loop 303 should remain a delivery handoff and production change freeze, not new implementation.

## Safety Boundary

```txt
restore_execution_in_loop_302=false
helper_preflight_executed_in_loop_302=false
helper_execute_executed_in_loop_302=false
pg_restore_restore_executed_in_loop_302=false
psql_executed_in_loop_302=false
supabase_connection_attempted_in_loop_302=false
db_change_performed_in_loop_302=false
line_real_send_executed_in_loop_302=false
openai_api_executed_in_loop_302=false
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
