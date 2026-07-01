# ChatGPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 276: DR restore retry controlled execution approval
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=dr_restore_retry_controlled_execution_approval
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
restore_retry_preflight_status=ready_for_operator_decision
dr_restore_retry_controlled_execution_approval_created=true
recommended_execution_mode=operator_side_only
operator_side_execution_required=true
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
restore_retry_attempt_limit=1
stop_on_first_failure=true
retry_allowed=false
next_operator_approval_required=true
restore_execution_allowed=false
restore_retry_execution_allowed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
vps_direct_work_used=false
vps_readonly_sanity_check_status=not_attempted_not_required
restricted_actions_remain_no_go=true
```

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed のどれか
2. controlled restore retry approvalとして十分か
3. restore実行をLoop 276で誤って許可していないか
4. operator-side only方針が安全か
5. Codex direct DB/restore accessを禁止できているか
6. production_go状態を崩していないか
7. secret/path/raw log/DB情報を記録していないか
8. 次Loopが増殖ではなくoperator-side execution approvalに進めているか
9. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
10. 次LoopのCodex文章を作ってよいか

次Loop候補は、レビューで採用する場合のみ:

```txt
Loop 277: operator-side DR restore retry controlled execution
```

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。
