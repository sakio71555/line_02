# LINE Runtime EnvironmentFile Failure Diagnosis

## Purpose

Record the Loop 144 follow-up for the Loop 143 API health failure after connecting the LINE runtime EnvironmentFile.

Loop 144 reconnected the EnvironmentFile and confirmed that API health stayed green. No API code, Nginx config, DNS, certbot, LINE Developers Console, OpenAI, or Supabase changes were made.

## Runtime Env Names

```txt
LINE_CHANNEL_SECRET configured; value not recorded
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
```

`LINE_WEBHOOK_SECRET` is not the active runtime env name in this codebase.

## Diagnosis Result

```txt
line_runtime_env_file_exists=yes
line_runtime_env_file_permissions=root_only
format_check=passed
keys=LINE_CHANNEL_ACCESS_TOKEN,LINE_CHANNEL_SECRET,LINE_REAL_PUSH_ENABLED,LINE_WEBHOOK_SECRET_PATH
dropin_path=/etc/systemd/system/amami-line-crm-api.service.d/20-line-runtime.conf
environmentfile_connected=yes
api_service=active
direct_health=200
https_api_health=200
nginx_reload_restart=no
dns_change=no
certbot_rerun=no
secret_values_displayed=no
```

Loop 143's health failure was not reproduced during the Loop 144 reconnect attempt. The API service remained healthy after reading the LINE runtime EnvironmentFile.

## Follow-up Finding

After the EnvironmentFile was healthy, the actual webhook invalid-signature dry-run still returned `404`.

That follow-up is recorded in:

- `docs/11_codex_tasks/144_line_webhook_404_route_diagnosis.md`
- `docs/15_runbooks/line_webhook_404_route_diagnosis.md`

## Safety Boundary

```txt
line_real_push_reply=not_performed
line_developers_verification_result=not_performed
openai_real_api=no
supabase_real_connection=no
nginx_config_change=no
nginx_reload_restart=no
certbot_rerun=no
dns_change=no
production_readiness=production_no_go
```

## Next

Proceed with `Loop 145A: LINE webhook secret path single-segment remediation`.
