# ChatGPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 277: operator-side DR restore retry result intake
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=operator_side_restore_result_intake
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
operator_side_restore_result_provided=true
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=operator_side_restore_not_run
restore_retry_retry_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
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
restricted_actions_remain_no_go=true
```

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed のどれか
2. `not_attempted` classificationが妥当か
3. DR readinessを未完了のまま維持できているか
4. restore retry成功として誤記録していないか
5. retry禁止を維持しているか
6. production_go scopeを勝手に拡大していないか
7. raw log / secret / DB URL / artifact path / SQL / object / role名を記録していないか
8. 次Loopが増殖ではなくoperator-side execution followupに進めているか
9. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
10. 次LoopのCodex文章を作ってよいか

次Loop候補は、レビューで採用する場合のみ:

```txt
Loop 278: operator-side restore execution followup
```

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。
