# Loop 143: LINE runtime secret injection and webhook verification

## Goal

Inject LINE runtime secrets on the VPS through a secret-safe helper, connect them to the API service only if health checks pass, and proceed to webhook verification only after the API is healthy.

This Loop reached a No-Go at API service health after adding the LINE runtime EnvironmentFile. The EnvironmentFile drop-in was rolled back, and webhook verification was not performed.

## Scope

- Confirm the repo starts from a clean `main...origin/main` state at Loop 142.
- Run local baseline checks.
- Confirm actual LINE env names in code.
- Run VPS read-only preflight.
- Create a root-only secret injection helper on the VPS.
- Have the operator enter LINE secrets outside Codex.
- Confirm the secret file with redacted key names only.
- Add API service EnvironmentFile drop-in.
- Restart API service and check health.
- Roll back the drop-in on health failure.
- Record No-Go docs, dev log, and static integration test.

## Out of Scope

- Codex receiving or displaying secret values.
- Recording token, secret, or webhook path values in docs, tests, commits, terminal output, or reports.
- LINE real push/reply send.
- `LINE_REAL_PUSH_ENABLED=true`.
- OpenAI real API.
- Supabase real connection.
- Nginx config changes.
- Nginx reload/restart.
- certbot execution or renewal.
- DNS changes.
- `.env` display or mutation.
- Private key display.
- API/Auth/RLS/runtime/migration/UI code changes.
- production Go decision.

## Correct Env Names

The code expects:

- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_WEBHOOK_SECRET_PATH`
- `LINE_REAL_PUSH_ENABLED`

`LINE_WEBHOOK_SECRET` is not the runtime env name for this codebase and was not used.

## Local Baseline

```txt
git_diff_check=success
lint=success
typecheck=success
test=success
build=success
```

## VPS Preflight

```txt
vps_host=vm-227d8253-eb
nginx_test=success
api_service=active
admin_service=active
api_initial_environment_file=/etc/amami-line-crm/api.env
api_direct_health_before=200
https_api_health_before=200
nginx_reload_restart=no
certbot_rerun=no
dns_change=no
```

## Secret Injection Helper

```txt
helper_path=/root/bin/amami-line-set-line-runtime-secrets.sh
helper_permissions=root_only
secret_input_location=operator_terminal_outside_codex
line_runtime_env_file=/etc/amami-line-crm/line-runtime.env
line_runtime_env_file_permissions=root_only
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
```

Codex did not receive, display, or record the real values.

## API Drop-in Attempt

```txt
dropin_path=/etc/systemd/system/amami-line-crm-api.service.d/20-line-runtime.conf
dropin_added=yes
api_service_restart_attempted=yes
api_service_active_after_restart=active
api_direct_health_after_line_runtime=000
api_direct_health_after_line_runtime_result=failed
webhook_verification_proceeded=no
```

The API service reported active, but direct `/health` was not reachable after the LINE runtime EnvironmentFile drop-in. Because direct health failed, the Loop stopped before actual webhook dry-run and LINE Developers verification.

## Rollback Result

```txt
dropin_removed=yes
api_service_restart_after_rollback=success
api_service_active_after_rollback=active
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
api_environment_files_after_rollback=/etc/amami-line-crm/api.env only
```

The root-only LINE runtime env file remains on the VPS, but the API service does not read it after rollback.

## Verification Result

```txt
actual_webhook_invalid_signature_dry_run_result=not_performed
line_developers_verification_result=not_performed
actual_webhookSecretPath=not_recorded
line_real_push_reply=not_performed
```

## Production Readiness

```txt
production_readiness=production_no_go
```

No-Go reasons:

- API health failed when the LINE runtime EnvironmentFile drop-in was connected.
- Actual webhook invalid-signature dry-run was not performed.
- LINE Developers verification was not performed.
- LINE real push/reply is not approved.
- Supabase real connection has not executed.
- OpenAI real API has not executed.
- Production secret injection is not complete.
- Final Go / No-Go is not approved.

## Safety Boundary

```txt
line_secret_values_displayed=no
line_secret_values_recorded=no
line_webhook_secret_path_recorded=no
line_api_call=no
line_real_push_reply=no
openai_real_api=no
supabase_real_connection=no
repo_dot_env_display_or_mutation=no
nginx_config_change=no
nginx_reload_restart=no
certbot_rerun=no
dns_change=no
private_key_content_displayed=no
api_auth_rls_runtime_migration_ui_code_change=no
```

## Test

- Static integration test checks this task doc, the runtime secret injection runbook, redacted LINE runtime records, rollback result, No-Go readiness, no webhook verification, and secret/token exclusion.

## Next Loop Candidates

1. Loop 144: LINE runtime EnvironmentFile failure diagnosis.
2. Loop 145: Supabase staging secret injection checklist.
3. Loop 146: OpenAI provider production gate.
4. Loop 147: production Go/No-Go review.
