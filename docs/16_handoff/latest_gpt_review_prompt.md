# ChatGPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 281: DR restore execution blocker resolution
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=restore_procedure_blocker_resolution
restore_procedure_exists=true
restore_procedure_source=new_operator_side_template
restore_procedure_blocker_resolved=true
operator_side_execution_possible=true
procedure_requires_operator_secret_context=true
procedure_requires_operator_artifact_context=true
procedure_allows_single_attempt=true
procedure_stop_on_first_failure=true
procedure_retry_forbidden=true
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
vps_direct_work_used=false
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
post_go_monitoring_status=pass
dr_artifact_validation_preflight_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
restricted_actions_remain_no_go=true
next_recommended_loop=Loop 282 conditional DR restore retry execution with resolved procedure
```

レビュー観点:

1. このLoopは complete / blocked / failed のどれか
2. Loop 280の `restore_procedure_not_found` blocker は解消されたか
3. 追加されたprocedureはoperator-side / single attempt / stop-on-first-failure / no retryを満たすか
4. restore / `pg_restore` / `psql` / Supabase / DB変更を実行していないか
5. secret / DB URL / artifact path / raw log / SQL / object / role / package / extension名を記録していないか
6. retry禁止を維持しているか
7. production_go scopeを勝手に拡大していないか
8. 次Loopが増殖ではなくresolved procedureに基づく1回だけのoperator-side result intakeへ進めるか
9. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
10. 次LoopのCodex文章を作ってよいか

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。
