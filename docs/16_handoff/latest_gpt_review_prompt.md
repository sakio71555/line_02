# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 274: DR artifact metadata intake and validation
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
operator_artifact_metadata_provided=true
selected_artifact_candidate=candidate_a
dr_backup_artifact_validation_preflight_status=pass
candidate_b_status=rejected
candidate_b_rejection_reason=artifact_nonempty_false
artifact_validation_pass_does_not_authorize_restore=true
restore_retry_requires_separate_operator_approval=true
restore_retry_requires_restore_preflight_loop=true
restricted_actions_remain_no_go=true
next_recommended_loop=Loop 275 DR restore retry preflight decision
```

Safety:

```txt
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_read=false
artifact_hash_recorded=false
artifact_size_exact_recorded=false
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
production_log_recorded=false
dump_content_recorded=false
row_content_recorded=false
```

必ず以下の順で判定してください。

1. このLoopは complete / partial / blocked のどれか
2. artifact metadata validation pass が妥当か
3. path/filename/hash/exact size/secret/raw logを記録していないか
4. restore実行を誤って許可していないか
5. production_go状態を崩していないか
6. 次Loopが増殖ではなくrestore retry preflight decisionに進んでいるか
7. 次に取るべき方針は DR restore retry preflight decision / no-go / route freeze のどれか
8. 次LoopのCodex文章を作ってよいか

レビュー観点:

- Candidate A pass is based only on sanitized operator metadata.
- Candidate B was rejected because sanitized `artifact_nonempty=false`.
- Loop 275 may decide restore retry preflight only. It must not execute restore, `pg_restore`, `psql`, Supabase connection, or DB changes.
