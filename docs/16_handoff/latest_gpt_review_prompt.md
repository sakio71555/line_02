# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

対象:

```txt
loop=Loop 283 DR restore execution prerequisite resolution and guarded helper
current_status=in_progress_after_helper_creation
```

確認してほしいこと:

1. Loop 283 が Loop 282 の `restore_procedure_not_executable_safely` blocker を実質的に解消する方向へ進んでいるか。
2. guarded helper の境界が十分か。
3. secret / DB URL / artifact detail / raw log / SQL / object / role / package / extension / LINE data を記録していないか。
4. VPS sync / helper preflight / conditional restore execution に進む条件が妥当か。
5. 1つでも曖昧なら restore 実行せず blocked にする方針でよいか。

Sanitized state:

```txt
anti_proliferation_check=pass
restore_executable_helper_exists=true
helper_path_repo_relative=scripts/dr/restore_retry_guarded.sh
helper_local_validation_status=pass
helper_preflight_without_inputs=blocked_safely
vps_sync_status=pending
helper_preflight_status=pending
restore_retry_attempt_count=pending
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_readiness_status=not_ready_restore_failed
restricted_actions_remain_no_go=true
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
```

まだ次Loopへ進めないでください。Loop 283 はこのあと、helper commit/push、VPS sync、VPS preflight、条件が完全に揃う場合だけ1回restore retryへ進む予定です。
