# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 272: DR remediation strategy review after production Go
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_remediation_strategy_review_created=true
recommended_dr_strategy=backup_artifact_validation_plan_before_restore_retry
dr_next_operator_decision_required=true
restricted_actions_remain_no_go=true
next_recommended_loop=Loop 273 DR backup artifact validation preflight
```

Safety:

```txt
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
schema_change_performed=false
role_change_performed=false
extension_created=false
cluster_changed=false
backup_artifact_content_read=false
backup_artifact_path_recorded=false
dump_path_recorded=false
package_install_executed=false
apt_operation_executed=false
line_additional_send_executed=false
line_retry_executed=false
line_bulk_send_executed=false
openai_api_executed=false
nginx_dns_https_change_executed=false
runtime_code_changed=false
package_or_config_changed=false
secret_values_recorded=false
env_values_recorded=false
db_url_recorded=false
raw_log_recorded=false
sql_recorded=false
db_object_name_recorded=false
role_name_recorded=false
package_name_recorded=false
extension_name_recorded=false
line_identifier_recorded=false
message_body_recorded=false
line_api_response_body_recorded=false
production_log_recorded=false
dump_content_recorded=false
row_content_recorded=false
```

必ず以下の順で判定してください。

1. このLoopは complete / partial / blocked のどれか
2. DR strategyが増殖ではなく前進か
3. restore実行を誤って許可していないか
4. production_go状態を崩していないか
5. 次Loopのoperator decisionが具体的か
6. secret/path/raw log/DB情報を記録していないか
7. 次に取るべき方針は DR backup artifact validation preflight / no-go / route freeze のどれか
8. 次LoopのCodex文章を作ってよいか

レビュー観点:

- `recommended_dr_strategy=backup_artifact_validation_plan_before_restore_retry` は、restore retry前の安全な前進になっているか。
- Loop 273で許可されるのはsanitized artifact metadata validationだけで、artifact path/content、restore、`pg_restore`、`psql`、Supabase、DB変更がNo-Goのままか。
- `production_go=true` / `production_go_scope=line_api_admin_current_runtime` と `dr_readiness_status=not_ready_restore_failed` の分離が維持されているか。
