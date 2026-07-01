# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
Loop 273: DR backup artifact validation preflight
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
dr_backup_artifact_validation_preflight_created=true
artifact_metadata_schema_created=true
operator_artifact_metadata_provided=false
operator_artifact_metadata_required=true
dr_backup_artifact_validation_preflight_status=operator_metadata_required
artifact_validation_pass_does_not_authorize_restore=true
restore_retry_requires_separate_operator_approval=true
restore_retry_requires_restore_preflight_loop=true
restricted_actions_remain_no_go=true
next_recommended_loop=Loop 274 DR artifact metadata intake and validation
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
2. preflight作成は増殖ではなく前進か
3. `operator_metadata_required` は妥当か
4. artifact validation passがrestore authorizationに変換されていないか
5. production_go状態を崩していないか
6. secret/path/raw log/DB/artifact detailsを記録していないか
7. 次に取るべき方針は DR artifact metadata intake and validation / no-go / route freeze / human input required のどれか
8. 次LoopのCodex文章を作ってよいか

レビュー観点:

- Loop 274へ進む場合は、operatorがsanitized metadata schemaだけを貼る必要があります。
- artifact path、filename、exact size、hash/checksum value、storage URL、raw log、DB URL、secret、SQL、object name、role name、dump content、row contentは貼らないでください。
- Loop 274でmetadataがpassしても、それだけではrestore retryを許可しないでください。
