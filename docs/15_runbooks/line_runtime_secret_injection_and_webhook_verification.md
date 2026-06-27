# LINE Runtime Secret Injection and Webhook Verification

## Purpose

Record the Loop 143 attempt to inject LINE runtime secrets into the VPS API service through a root-only secret file and EnvironmentFile drop-in.

The attempt reached No-Go because API direct health failed after connecting the LINE runtime EnvironmentFile. The drop-in was removed and the API service recovered.

## Correct Runtime Env Names

The API reads the webhook path from `LINE_WEBHOOK_SECRET_PATH`. Do not use `LINE_WEBHOOK_SECRET` for this codebase.

Runtime env names:

- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_WEBHOOK_SECRET_PATH`
- `LINE_REAL_PUSH_ENABLED`

## Safety Rules

- Secret values are entered only in the operator's own terminal, outside Codex.
- Do not paste secrets into Codex chat.
- Do not paste secrets into Codex tool input.
- Do not record token, secret, webhook path value, request body, LINE user ID, or real customer information in docs, tests, commits, terminal output, or reports.
- Keep `LINE_REAL_PUSH_ENABLED=false`.

## VPS Preflight Result

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

## Secret Injection Result

```txt
helper_path=/root/bin/amami-line-set-line-runtime-secrets.sh
helper_permissions=root_only
line_runtime_env_file=/etc/amami-line-crm/line-runtime.env
line_runtime_env_file_permissions=root_only
secret_values_entered_outside_codex=yes
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
```

The runtime secret file was confirmed by key names only. Values were not displayed.

## API Service Drop-in Result

```txt
dropin_path=/etc/systemd/system/amami-line-crm-api.service.d/20-line-runtime.conf
dropin_added=yes
api_service_restart_attempted=yes
api_service_active_after_restart=active
api_direct_health_after_line_runtime=000
api_direct_health_after_line_runtime_result=failed
```

The API service reported active, but direct `/health` was not reachable after the drop-in. The Loop stopped before webhook verification.

## Rollback Result

```txt
dropin_removed=yes
daemon_reload_after_rollback=yes
api_service_restart_after_rollback=success
api_service_active_after_rollback=active
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
api_environment_files_after_rollback=/etc/amami-line-crm/api.env only
```

The root-only LINE runtime env file remains on the VPS for a future diagnosis Loop, but the API service is not currently reading it.

## Webhook Verification

```txt
actual_webhook_invalid_signature_dry_run_result=not_performed
line_developers_verification_result=not_performed
actual_webhookSecretPath=not_recorded
line_real_push_reply=not_performed
```

Do not ask LINE Developers Console to verify until the API service can read the LINE runtime EnvironmentFile and keep `/health` healthy.

## Production Readiness

```txt
production_readiness=production_no_go
```

No-Go reasons:

- API health failed when LINE runtime EnvironmentFile was connected.
- Actual webhook invalid-signature dry-run was not performed.
- LINE Developers verification was not performed.
- LINE real push/reply is not approved.
- Supabase real connection has not executed.
- OpenAI real API has not executed.
- Production secret injection is not complete.
- Final Go / No-Go is not approved.

## Next

1. Loop 144: LINE runtime EnvironmentFile failure diagnosis.
2. Loop 145: Supabase staging secret injection checklist.
3. Loop 146: OpenAI provider production gate.
4. Loop 147: production Go/No-Go review.
