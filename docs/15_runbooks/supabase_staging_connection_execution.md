# Supabase Staging Connection Execution

Loop: 152

Date: 2026-06-27

## Purpose

Supabase staging secretをoperator入力済みのVPS review環境で、`REPOSITORY_RUNTIME=supabase` を一時的に接続し、安全に起動確認、read smoke、rollbackできるかを確認する。

## Boundaries

実施する:

- Supabase runtime EnvironmentFileをroot-onlyで扱う。
- API serviceへ一時的に `REPOSITORY_RUNTIME=supabase` を接続する。
- direct `/health` とHTTPS `/api/health` を確認する。
- tenant scoped admin customers read smokeを確認する。
- 失敗したら即時 `in_memory` へrollbackする。

実施しない:

- Supabase migration変更。
- RLS SQL変更。
- write smoke。
- production DB接続。
- Nginx / DNS / certbot変更。
- LINE real push/reply。
- OpenAI実API。
- secret値の表示や記録。

## Non-Secret Env Names

値は記録しない。

```txt
REPOSITORY_RUNTIME
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
```

## Execution Record

```txt
operator_secret_entry=completed_outside_codex
supabase_runtime_env_file=present_root_only
supabase_runtime_env_file_mode=600
supabase_runtime_env_keys_redacted=true
supabase_runtime_env_values_recorded=no
psql_available_on_vps=false
```

## First Runtime Attempt

```txt
repository_runtime_switch_attempted=REPOSITORY_RUNTIME=supabase
api_restart_result=failed
rollback_to_in_memory=completed
api_direct_health_after_first_rollback=200
https_api_health_after_first_rollback=200
```

Sanitized root cause:

```txt
initial_failure_cause=Node.js 20 WebSocket transport missing
node_version_family=20
secret_values_recorded=no
```

## Node.js 20 Supabase Client Fix

Supabase client boundaryにserver-side WebSocket transportを注入した。

```txt
dependency_added=ws
dev_dependency_added=@types/ws
supabase_client_transport=server_side_ws
client_boundary_only=true
repository_behavior_changed=no
```

## VPS Redeploy and Validation

Node.js 20対応fixを含むrelease archiveを作成し、VPS stagingで検証後、active review sourceへ反映した。

```txt
release_candidate=b6a4f2e461662fdc7dc1fe62d8029e620169f103
archive_sha256=1a8c3140702f049d5be07e89fd4d930d7618af9c1b17bd41b7a5fc0e3885be20
archive_excludes_env_git_node_modules=true
vps_staging_install=success
vps_staging_lint=success
vps_staging_typecheck=success
vps_staging_test=success
vps_staging_test_integration=success
vps_staging_build=success
active_install=success
active_build=success
admin_service=active
```

## Supabase Runtime Health

After the fix, Supabase runtime startup reached health successfully.

```txt
api_service=active
api_direct_health_with_supabase=200
https_api_health_with_supabase=200
runtime_data_backend_with_supabase=supabase
runtime_ai_provider=mock
runtime_line_real_push_enabled=false
external_connections=disabled
health_body_secret_free=true
```

## Read Smoke Result

Admin customers read smoke failed and the Supabase runtime was not kept active.

```txt
api_direct_admin_customers_with_supabase=500
https_admin_customers_api_with_supabase=500
admin_page_customers_with_supabase=200
supabase_repository_error_boundary=active
supabase_rest_read_preflight=failed_dns_or_connection
supabase_rest_read_preflight_details_recorded=no
write_smoke=not_performed
supabase_ready=false
```

Reasoning:

- `GET /api/admin/customers` returned 500 with Supabase runtime.
- The repository error boundary sanitized the internal Supabase error.
- A direct REST preflight indicated DNS/connection-level failure, but the concrete endpoint is not recorded.
- Because read smoke failed, write smoke was intentionally skipped.

## Rollback Result

```txt
rollback_helper=/root/bin/amami-line-disable-supabase-runtime.sh
rollback_to_in_memory=completed
api_service_after_rollback=active
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
runtime_data_backend_after_rollback=in_memory
runtime_ai_provider_after_rollback=mock
runtime_line_real_push_enabled_after_rollback=false
health_body_secret_free_after_rollback=true
line_invalid_signature_after_supabase=401
```

## Current Status

```txt
current_runtime_data_backend=in_memory
supabase_runtime_startup_ready=true
supabase_read_smoke_ready=false
supabase_ready=false
openai_ready=false
line_real_push_reply_ready=false
production_readiness=production_no_go
```

## Safety Notes

- Supabase secret values are not recorded.
- Supabase URL / DB URL / project host values are not recorded.
- LINE token, webhook path value, LINE userId, and message body are not recorded.
- Nginx, DNS, certbot, LINE real push/reply, and OpenAI real API were not changed.
- `LINE_REAL_PUSH_ENABLED=false` remains in effect.

## Next

Loop 153: Supabase staging DNS / connection preflight and read-smoke remediation.

## Loop 153 Follow-Up

Loop 153 re-ran the Supabase read-smoke diagnosis with redacted DNS / TCP / REST preflight.

```txt
supabase_url_dns=failed; host not displayed
supabase_url_tcp_443=error; host not displayed
supabase_rest_root_fetch=failed; error=TypeError
supabase_db_url_dns=failed; host not displayed
supabase_db_url_tcp_5432=error; host not displayed
general_dns_example_com=success
general_dns_github_com=success
api_admin_customers_no_header_supabase=401
api_admin_customers_dev_header_supabase=500
classification=A_supabase_url_dns_tcp_rest_connection_issue
fix_applied=no
rollback_to_in_memory=completed
line_invalid_signature_post_loop153=401
supabase_ready=false
production_readiness=production_no_go
```

The blocker is now tracked as Supabase endpoint / DNS / connection preflight remediation. Concrete host values are not recorded.
