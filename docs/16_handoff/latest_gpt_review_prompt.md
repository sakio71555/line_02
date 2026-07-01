# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 271: post-Go monitoring review and DR remediation planning
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
operator_final_decision=production_go
production_go=true
production_no_go=false
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
post_go_monitoring_review_created=true
post_go_monitoring_readonly_check_status=pass
public_api_health_current=200
public_admin_root_current=200
public_customers_no_auth_current=401
post_go_monitoring_status=pass
monitoring_failure_reason=none
restricted_actions_remain_no_go=true
dr_remediation_plan_created=true
next_recommended_loop=Loop 272 DR remediation strategy review after production Go
```

Safety:

```txt
additional_line_message_send_executed=false
line_retry_executed=false
line_reply_executed=false
line_push_executed=false
line_multicast_executed=false
line_broadcast_executed=false
public_smoke_rerun=false
openai_api_executed=false
supabase_connection_executed=false
supabase_restore_executed=false
psql_executed=false
pg_restore_executed=false
restore_executed=false
db_changed=false
schema_changed=false
role_changed=false
cluster_changed=false
nginx_changed=false
dns_changed=false
https_certbot_operation_executed=false
service_restart_executed=false
package_install_executed=false
apt_operation_executed=false
runtime_code_changed=false
package_or_config_changed=false
secret_values_recorded=false
env_values_recorded=false
db_url_recorded=false
raw_log_recorded=false
line_identifier_recorded=false
message_body_recorded=false
line_api_response_body_recorded=false
production_log_recorded=false
dump_content_recorded=false
row_content_recorded=false
```

必ず以下の順で判定してください。

1. このLoopは complete / partial / blocked のどれか
2. `production_go=true` は `line_api_admin_current_runtime` にscope限定されているか
3. read-only monitoring結果はbaseline通りか
4. `dr_readiness_status=not_ready_restore_failed` と `dr_risk_acceptance_status=accepted_with_known_risk` が矛盾なく維持されているか
5. restricted actions remain No-Go が維持されているか
6. secret / raw log / LINE identifier / message body / LINE API response body / production log が記録されていないか
7. 次に取るべき方針は DR remediation strategy review / no-go / route freeze のどれか
8. 次LoopのCodex文章を作ってよいか

レビュー観点:

- Current runtimeはGoのまま維持し、追加LINE送信、retry、bulk、OpenAI自動返信、Supabase restore、DB/Nginx/DNS/HTTPS/package変更をNo-Goにできているか。
- post-Go monitoringが通っている一方で、DRはまだ未完成であることを分離できているか。
- 次Loop候補を `Loop 272: DR remediation strategy review after production Go` のみにしてよいか。
