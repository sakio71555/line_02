# ChatGPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 280: conditional Codex-managed DR restore retry execution
```

結果:

```txt
loop_status=blocked
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
forward_progress_type=conditional_dr_restore_retry_execution_blocked_before_execution
operator_restore_execution_decision=approved
temporary_codex_direct_restore_execution_override_granted=true
temporary_codex_direct_restore_execution_override_used=false
ssh_access_available=not_checked_restore_procedure_blocked
restore_procedure_exists=false
restore_target_scope_confirmed=false
restore_target_scope_category=unknown
operator_secret_context_available=not_checked_restore_procedure_blocked
selected_artifact_candidate=not_checked_restore_procedure_blocked
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=restore_procedure_not_found
restore_retry_retry_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
restricted_actions_remain_no_go=true
next_recommended_loop=Loop 281 DR restore execution blocker resolution
```

レビュー観点:

1. このLoopは complete / blocked / failed のどれか
2. conditional Codex execution overrideを使わず止めた判断は妥当か
3. `restore_procedure_not_found` がsanitized blockerとして妥当か
4. restore / `pg_restore` / `psql` / Supabase / DB変更を実行していないか
5. secret / DB URL / artifact path / raw log / SQL / object / role / package / extension名を記録していないか
6. retry禁止を維持しているか
7. production_go scopeを勝手に拡大していないか
8. 次Loopが増殖ではなくblocker resolutionへ進めているか
9. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
10. 次LoopのCodex文章を作ってよいか

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。
