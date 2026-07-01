# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 268: single controlled LINE message send
```

結果:

```txt
loop_status=blocked
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=single_controlled_line_send_blocked_with_reason
approval_block_present=true
operator_approval_status=approved
approval_scope=single_operator_controlled_test_message_only
send_method_category=existing_internal_cli_one_message_category
operator_controlled_target_confirmed=not_confirmed
customer_target_confirmed=false
line_message_send_execution_status=blocked
line_message_send_attempt_count=0
line_message_send_success=not_attempted
line_message_send_executed=false
line_message_send_retry_executed=false
line_identifier_recorded=false
message_body_recorded=false
line_api_response_body_recorded=false
line_external_api_connection_attempted=false
public_smoke_executed=false
production_no_go=true
production_go_changed=false
dr_readiness_status=not_ready_restore_failed
classifier_route_status=frozen
next_execution_sequence_status=line_send_blocked_requires_operator_or_route_review
selected_next_minimal_action=Loop 269 controlled LINE send route human decision
```

Blocked reason:

```txt
blocked_reason=operator_controlled_target_not_independently_confirmed_without_identifier_or_body
blocked_reason_secondary=send_route_would_need_external_line_api_attempt_after_unconfirmed_target
```

Safety:

```txt
secret_values_recorded=false
env_value_output_occurred=false
db_url_recorded=false
raw_log_recorded=false
line_identifier_recorded=false
message_body_recorded=false
line_api_response_body_recorded=false
customer_message_recorded=false
line_message_send_executed=false
line_external_api_connection_attempted=false
line_message_send_retry_executed=false
public_smoke_executed=false
openai_api_executed=false
supabase_write_executed=false
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

- Loop 268は承認を検証したうえで、条件未達により送信前に止まっているか。
- 承認だけをtarget proofとして扱わず、customer誤送信リスクを避けた判断になっているか。
- `production_no_go=true` と `dr_readiness_status=not_ready_restore_failed` が維持されているか。
- LINE identifier / message body / LINE API response body / secret / env value / raw log が記録されていないか。
- 次Loop候補を `Loop 269: controlled LINE send route human decision` のみにしてよいか。
