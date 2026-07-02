# Loop 304: controlled production rollout for admin/API runtime

## Status

```txt
loop_304_status=blocked
production_rollout_decision=approved
production_change_freeze_exception=approved_for_controlled_runtime_rollout
production_change_freeze_status=active_with_controlled_rollout_exception
controlled_rollout_scope=admin_api_runtime_demo_save_fix
target_runtime_commit_expected=ed3c5a2
demo_save_fix_production_rollout_status=blocked
```

Loop 304 did not update the active production runtime. The rollout was stopped after safe staging validation because the required active rollout path needs both API and Admin app service restarts, while the Loop 304 service restart boundary was not explicit enough to cover the Admin service restart.

## Precheck Result

```txt
local_git_status_clean=true
local_head_short=ed3c5a2
local_contains_ed3c5a2=true
local_lint_status=pass
local_typecheck_status=pass
local_test_status=pass
local_integration_test_status=pass
demo_save_regression_status=pass
real_send_guard_still_blocks_status=pass
```

## Production Baseline

```txt
ssh_access_available=true
vps_working_directory_available=true
vps_git_worktree_present=false
vps_runtime_pre_deploy_commit=01ad8b3
vps_branch=not_applicable_copy_based_runtime
vps_git_status_clean=not_applicable_copy_based_runtime
api_service_active_pre=true
admin_service_active_pre=true
nginx_service_active_pre=true
public_api_health_status_code_pre=200
public_admin_root_status_code_pre=200
public_customers_no_auth_status_code_pre=401
disk_capacity_status_pre=ok
memory_capacity_status_pre=ok
production_runtime_contains_demo_save_fix=false
```

The production runtime is copy-based rather than a clean git worktree. The active source marker points to an older short commit, and the active source does not contain the `demo_save` delivery-mode fix.

## Deploy Plan Discovery

```txt
deploy_runbook_found=true
deploy_method_selected=existing_copy_based_runbook_staging_validated_only
deploy_requires_package_install=true_existing_frozen_install
deploy_requires_app_service_restart=true
deploy_requires_api_service_restart=true
deploy_requires_admin_service_restart=true
deploy_requires_nginx_reload=false
deploy_requires_db_migration=false
deploy_requires_secret_change=false
```

The existing copy-based runbook requires a staged archive validation, active source replacement, active build, and restart of both existing app services. The Loop 304 approval clearly allowed the controlled runtime exception, but the current service restart wording is insufficient for the Admin service restart that is needed to serve the Admin UI/server-action change.

## Staging Validation

```txt
release_archive_created=true
archive_env_file_included=false
archive_git_dir_included=false
archive_node_modules_included=false
staging_archive_transfer_status=pass
staging_install_status=pass
staging_lint_status=pass
staging_typecheck_status=pass
staging_test_status=pass
staging_integration_test_status=pass
staging_build_status=pass
staging_validation_status=pass
```

The archive was validated in staging only. The active production source was not changed.

## Active Rollout Classification

```txt
controlled_deploy_executed=false
git_fetch_executed=false
git_pull_ff_only_executed=false
vps_runtime_post_deploy_commit=unchanged
vps_runtime_contains_ed3c5a2=false
build_executed=true_staging_only
build_status=pass_staging_only
app_service_restart_executed=false
app_service_restart_status=not_run_blocked_before_active_deploy
nginx_reload_executed=false
db_migration_executed=false
runtime_config_changed=false
package_lock_changed=false
post_deploy_smoke_status=not_run_blocked_before_active_deploy
rollback_executed=false
rollback_reason=none
rollback_status=not_needed
post_rollback_smoke_status=not_run
```

## Safety Boundary

```txt
real_line_push_still_disabled=true
line_real_send_executed=false
openai_api_executed=false
production_db_connection_executed=false
production_db_change_performed=false
supabase_connection_attempted=false
restore_executed=false
pg_restore_executed=false
psql_executed=false
nginx_reload_executed=false
dns_https_certbot_executed=false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
line_identifier_recorded=false
message_body_recorded=false
host_or_url_recorded=false
public_endpoint_url_recorded=false
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
restricted_actions_remain_no_go=true
```

## Blocker

```txt
rollout_blocker=admin_service_restart_required_but_not_explicitly_covered_by_loop_304_restart_boundary
active_runtime_changed=false
staging_validation_completed=true
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=blocked_after_concrete_staging_validation_not_protocol_loop
forward_progress_type=local_validation_and_vps_staging_validation_completed
next_loop_requires_new_operator_input=true
```

## Next Loop Candidate

```txt
next_loop_candidate=Loop 305: production rollout blocker remediation
loop_305_auto_progression_allowed=false
```

Loop 305 should either explicitly approve restart of the existing Admin app service as part of the same controlled runtime rollout, or choose a narrower API-only rollout and accept that the Admin demo-save UI/server action will not be active.
