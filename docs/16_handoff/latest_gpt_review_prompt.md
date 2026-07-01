# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 270: production Go decision record and post-Go monitoring baseline
```

結果:

```txt
loop_status=complete
anti_proliferation_check=pass
operator_final_decision=production_go
production_go=true
production_no_go=false
production_go_scope=line_api_admin_current_runtime
production_go_record_scope_limited=true
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
line_real_push_smoke_status=pass
line_message_send_attempt_count=1
line_message_send_success=true
line_message_send_retry_executed=false
post_send_api_health=200
public_smoke_status=pass
public_api_health=200
public_admin_root=200
public_customers_no_auth=401
post_go_monitoring_baseline_created=true
restricted_actions_remain_no_go=true
next_recommended_loop=Loop 271 post-Go monitoring review
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
supabase_restore_executed=false
psql_executed=false
pg_restore_executed=false
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
raw_log_recorded=false
line_identifier_recorded=false
message_body_recorded=false
line_api_response_body_recorded=false
```

必ず以下の順で判定してください。

1. このLoopは complete / partial / blocked のどれか
2. `production_go=true` は `line_api_admin_current_runtime` にscope限定されているか
3. `dr_readiness_status=not_ready_restore_failed` と `dr_risk_acceptance_status=accepted_with_known_risk` が矛盾なく記録されているか
4. restricted actions remain No-Go が維持されているか
5. secret / raw log / LINE identifier / message body / LINE API response body が記録されていないか
6. 次に取るべき方針は post-Go monitoring / DR remediation / no-go のどれか
7. 次LoopのCodex文章を作ってよいか

レビュー観点:

- Current runtimeはGoになったが、追加LINE送信、retry、bulk、OpenAI自動返信、Supabase restore、DB/Nginx/DNS/HTTPS/package変更はNo-Goのままか。
- DRは未完成だが、operatorがknown riskとして受容したためproduction Go scopeと分離できているか。
- 次Loop候補を `Loop 271: post-Go monitoring review` のみにしてよいか。
