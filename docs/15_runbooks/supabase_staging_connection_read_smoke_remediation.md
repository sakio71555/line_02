# Supabase Staging Connection Read-Smoke Remediation

Loop: 153

Date: 2026-06-27

## Purpose

Loop 152で発生した Supabase runtime customers read smoke 500 を、secret値を表示せずに再診断し、最小修正可能かを判定する。

## Safety Boundary

実施する:

- Supabase stagingへのread-only DNS / TCP / REST preflight。
- `REPOSITORY_RUNTIME=supabase` の一時接続。
- `/health` と `GET /api/admin/customers` read smoke。
- sanitized journal確認。
- 失敗時の `in_memory` rollback。

実施しない:

- Supabase production data access。
- migration apply。
- RLS change。
- schema change。
- write smoke。
- OpenAI real API。
- LINE real push/reply。
- Nginx / DNS / certbot changes。
- `.env` display or edit。
- secret value recording。

## Start State

```txt
branch=main...origin/main
worktree=clean
head_commit=6a18186_or_newer
current_runtime_before_loop=in_memory
api_service_before_loop=active
admin_service_before_loop=active
api_direct_health_before_supabase=200
https_api_health_before_supabase=200
https_customers_before_supabase=200
```

## Local Baseline

```txt
git_diff_check=success
lint=success
typecheck=success
build=success
```

Full test/test:integration/build were also run at the end of the Loop.

## Runtime and Route Confirmation

```txt
repository_runtime_switch_env=REPOSITORY_RUNTIME
repository_runtime_allowed_values=in_memory,supabase
repository_runtime_default=in_memory
required_supabase_env_names=SUPABASE_URL,SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL
supabase_repository_bundle=customers,messages,alerts,knowledge_pages
staff_auth_lookup_switch=separate_auth_runtime_boundary
health_reports_runtime_state=true
startup_external_connection=lazy_until_repository_query
```

`GET /api/admin/customers` in the VPS review environment uses the development tenant header path.

```txt
vps_app_env=development
vps_node_env=development
customers_required_header=x-tenant-id
customers_required_tenant_id=tenant_amamihome
customers_no_header_expected_status=401
customers_dev_header_expected_path=repository_read
```

## Redacted Supabase Env Check

```txt
SUPABASE_URL configured; value not recorded
SUPABASE_ANON_KEY configured; value not recorded
SUPABASE_SERVICE_ROLE_KEY configured; value not recorded
SUPABASE_DB_URL configured; value not recorded
REPOSITORY_RUNTIME configured; value not recorded
supabase_runtime_env_file=present_root_only
supabase_runtime_env_mode=600
supabase_runtime_env_format_check=passed
```

## Redacted DNS / TCP / REST Preflight

```txt
supabase_url_parse=success
supabase_url_host_suffix_supabase_co=true; host not displayed
supabase_url_host_label_count=3; host not displayed
supabase_url_dns=failed; host not displayed
supabase_url_tcp_443=error; host not displayed
supabase_rest_root_fetch=failed; error=TypeError
supabase_rest_table_customers_fetch=failed; error=TypeError
supabase_rest_table_messages_fetch=failed; error=TypeError
supabase_rest_table_alerts_fetch=failed; error=TypeError
supabase_rest_table_knowledge_pages_fetch=failed; error=TypeError
supabase_rest_table_staff_users_fetch=failed; error=TypeError
supabase_rest_table_staff_tenant_memberships_fetch=failed; error=TypeError
supabase_db_url_parse=success
supabase_db_url_host_suffix_supabase_co=true; host not displayed
supabase_db_url_host_label_count=4; host not displayed
supabase_db_url_dns=failed; host not displayed
supabase_db_url_tcp_5432=error; host not displayed
general_dns_example_com=success
general_dns_github_com=success
psql=not_installed
db_metadata_preflight=skipped
```

Interpretation:

- VPS general DNS works.
- The configured Supabase REST host and DB host do not resolve from VPS.
- Concrete host values are not recorded.

## Supabase Runtime Retry

```txt
repository_runtime_switch_attempted=REPOSITORY_RUNTIME=supabase
api_service=active
api_direct_health_supabase=200
https_api_health_supabase=200
runtime_data_backend_with_supabase=supabase
runtime_ai_provider=mock
runtime_line_real_push_enabled=false
health_secret_free=true
api_admin_customers_no_header_supabase=401
api_admin_customers_dev_header_supabase=500
response_body_sanitized=Internal Server Error
sanitized_journal_summary=Supabase customers.listByTenant failed through SupabaseRepositoryError
```

## Classification

```txt
classification=A_supabase_url_dns_tcp_rest_connection_issue
root_cause=Configured Supabase endpoint does not resolve from VPS; host not recorded
auth_header_shortage_root_cause=false
schema_table_missing_root_cause=not_evaluated_due_dns_failure
rls_permission_root_cause=not_evaluated_due_dns_failure
repository_mapping_bug_root_cause=not_indicated
fix_applied=no
redeploy_performed=no
```

## Rollback

```txt
rollback_to_in_memory=completed
api_service_after_rollback=active
api_direct_health_after_rollback=200
https_api_health_after_rollback=200
runtime_data_backend_after_rollback=in_memory
runtime_ai_provider_after_rollback=mock
runtime_line_real_push_enabled_after_rollback=false
health_secret_free_after_rollback=true
line_invalid_signature_post_loop153=401
write_smoke=not_performed
write_smoke_skipped_reason=read_smoke_failed_and_dns_preflight_failed
```

## Readiness

```txt
supabase_ready=false
https_ready_for_review=true
line_receive_ready=true
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

## Remaining No-Go Reasons

- Supabase endpoint / DNS / connection preflight is unresolved.
- Supabase read smoke still returns 500 when runtime is switched to Supabase.
- Supabase write smoke was not performed.
- OpenAI real API was not performed.
- LINE real push/reply was not performed.
- LINE Official Account auto-response OFF is not confirmed in this Loop.
- Final production Go/No-Go approval is not complete.

## Next

Loop 154: Supabase staging endpoint re-entry and connection preflight.
