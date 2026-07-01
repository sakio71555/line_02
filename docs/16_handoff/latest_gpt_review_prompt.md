# ChatGPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 279: operator-side DR restore retry execution approval decision
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=operator_side_restore_execution_approval_decision
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
operator_side_restore_execution_approval_decision_created=true
operator_restore_execution_decision=approved
approval_scope=single_restore_retry_attempt_operator_side_only
restore_retry_attempt_limit=1
operator_side_restore_execution_allowed_next_loop=true
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
pg_restore_allowed=true_operator_side_only_if_required
psql_allowed=true_operator_side_only_if_required
supabase_connection_allowed=true_operator_side_only_if_required
db_change_allowed=true_operator_side_only_with_stop_conditions
stop_on_first_failure=true
retry_allowed=false
restricted_actions_remain_no_go=true
next_recommended_loop=Loop 280 operator-side DR restore retry execution result intake
```

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed のどれか
2. operator decisionが明確か
3. restore実行をLoop 279で誤って実行/許可していないか
4. operator-side only方針が安全か
5. Codex direct DB/restore accessを禁止できているか
6. production_go scopeを拡大していないか
7. secret/path/raw log/DB情報を記録していないか
8. 次Loopが増殖ではなくexecution result intakeへ進めているか
9. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
10. 次LoopのCodex文章を作ってよいか

次Loop候補は、レビューで採用する場合のみ:

```txt
Loop 280: operator-side DR restore retry execution result intake
```

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。
