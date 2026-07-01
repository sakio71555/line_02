# ChatGPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 278: operator-side restore execution followup
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=operator_side_restore_execution_followup
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
operator_restore_followup_decision=prepare_operator_side_restore_execution_runbook_only
operator_side_restore_execution_followup_created=true
approval_block_required_before_actual_restore_execution=true
restore_execution_allowed_in_loop_278=false
pg_restore_allowed_in_loop_278=false
psql_allowed_in_loop_278=false
supabase_connection_allowed_in_loop_278=false
db_change_allowed_in_loop_278=false
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
restricted_actions_remain_no_go=true
```

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed のどれか
2. `not_attempted` から実行判断へ前進しているか
3. restore実行をLoop 278で誤って許可していないか
4. operator-side only方針が安全か
5. Codex direct DB/restore accessを禁止できているか
6. production_go scopeを拡大していないか
7. secret/path/raw log/DB情報を記録していないか
8. 次Loopが増殖ではなくexecution approval decisionに進めているか
9. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
10. 次LoopのCodex文章を作ってよいか

次Loop候補は、レビューで採用する場合のみ:

```txt
Loop 279: operator-side DR restore retry execution approval decision
```

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。
