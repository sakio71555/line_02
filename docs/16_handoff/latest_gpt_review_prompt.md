# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 267: line message send permission gate and controlled send readiness pack
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=operator_decision_pack
line_message_send_permission_gate_created=true
line_message_send_execution_allowed_in_loop_267=false
line_message_send_requires_explicit_operator_approval=true
line_message_send_scope_must_be_single_message=true
line_message_send_target_must_be_operator_controlled=true
line_message_send_target_must_not_be_customer=true
line_message_body_recording_allowed=false
line_identifier_recording_allowed=false
existing_controlled_send_route_available=true
existing_internal_cli_available=true
existing_staff_reply_route_available=conditional
line_message_send_allowed=false
line_message_send_executed=false
line_external_api_connection_attempted=false
public_smoke_executed=false
production_no_go=true
production_go_changed=false
dr_readiness_status=not_ready_restore_failed
classifier_route_status=frozen
next_operator_approval_required=true
next_execution_sequence_status=line_message_send_approval_required
selected_next_minimal_action=Loop 268 single controlled LINE message send approval decision
```

Safety:

```txt
secret_values_recorded=false
env_value_output_occurred=false
db_url_recorded=false
raw_log_recorded=false
line_identifier_recorded=false
message_body_recorded=false
line_message_send_executed=false
line_external_api_connection_attempted=false
public_smoke_executed=false
production_go_changed=false
runtime_code_changed=false
package_json_changed=false
pnpm_lock_changed=false
config_changed=false
```

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed のどれか
2. blockedの場合、同じblockerが過去に何回出ているか
3. Codexが提案した次Loop候補を採用するか、却下するか
4. 却下する場合、理由は何か
5. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
6. 次LoopのCodex文章を作ってよいか

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。

レビュー観点:

- Loop 267は送信せず、Loop 268のoperator decision packとして前進しているか。
- `production_no_go=true` が維持されているか。
- LINE identifier / message body / secret / env value / raw log が記録されていないか。
- 次Loop候補を `Loop 268: single controlled LINE message send approval decision` のみにしてよいか。
- Loop 268へ進む場合、operatorが approve / do-not-approve / request-more-review のどれを返すべきか。
