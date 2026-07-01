# ChatGPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 275: DR restore retry preflight decision
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=dr_restore_retry_preflight_decision
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
dr_restore_retry_preflight_decision_created=true
restore_retry_preflight_status=ready_for_operator_decision
recommended_restore_preflight_path=operator_side_restore_preflight_only
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
2. restore retry preflight decisionとして十分か
3. restore実行を誤って許可していないか
4. operator-side execution方針が安全か
5. Codex direct VPS workがread-only/sanitizedに限定されているか
6. production_go状態を崩していないか
7. secret/path/raw log/DB情報を記録していないか
8. 増殖ではなく次のoperator decisionに進めているか
9. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
10. 次LoopのCodex文章を作ってよいか

次Loop候補は、レビューで採用する場合のみ:

```txt
Loop 276: DR restore retry controlled execution approval
```

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。
