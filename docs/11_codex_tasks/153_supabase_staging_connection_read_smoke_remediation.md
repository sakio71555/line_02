# Loop 153: Supabase Staging Connection Read-Smoke Remediation

## Goal

Loop 152で `GET /api/admin/customers` が500になった原因を、secret値を表示せずに切り分ける。

今回の目的は、Supabase read smoke 500の原因分類と、可能なら最小修正でread smokeを通すこと。原因がSupabase endpoint / DNS / connection側であれば、コードやmigrationを変更せずrollbackして次Loopへ分ける。

## Scope

- local baselineを確認する。
- runtime switch / admin customers route / tenant header仕様を再確認する。
- VPSでSupabase envのkey名と形式だけをredacted確認する。
- Supabase URL / DB URLのDNS / TCP / REST preflightをhost非表示で確認する。
- `REPOSITORY_RUNTIME=supabase` を一時接続し、healthとcustomers read smokeを再現する。
- sanitized journalで分類する。
- 必要なら最小コード修正する。
- 失敗条件では `in_memory` へrollbackする。
- docs / test / dev logを更新する。

## Out of Scope

- Supabase production data access。
- Supabase migration apply。
- RLS policy変更。
- schema変更。
- write smoke。
- OpenAI実API。
- LINE real push/reply。
- Nginx / DNS / certbot変更。
- `.env` 表示・変更。
- secret値、Supabase host、DB URL、LINE webhook path値、LINE userId、message bodyの記録。
- production Go判定。

## Runtime and Route Findings

```txt
repository_runtime_switch_env=REPOSITORY_RUNTIME
repository_runtime_allowed_values=in_memory,supabase
repository_runtime_default=in_memory
required_supabase_env_names=configured; values not recorded
supabase_repository_bundle=customers,messages,alerts,knowledge_pages
staff_auth_lookup_switch=separate_auth_runtime_boundary
health_reports_runtime_state=true
startup_external_connection=lazy_until_repository_query
```

`GET /api/admin/customers` のVPS runtimeはdevelopment modeのため、read smokeでは `x-tenant-id: tenant_amamihome` が必要。

```txt
vps_app_env=development
vps_node_env=development
customers_no_header_status=401
customers_dev_header_status=500
auth_header_shortage_root_cause=false
```

## Supabase Redacted Preflight

```txt
SUPABASE_URL configured; value not recorded
SUPABASE_ANON_KEY configured; value not recorded
SUPABASE_SERVICE_ROLE_KEY configured; value not recorded
SUPABASE_DB_URL configured; value not recorded
supabase_runtime_env_format_check=passed
supabase_url_dns=failed; host not displayed
supabase_url_tcp_443=error; host not displayed
supabase_rest_root_fetch=failed; error=TypeError
supabase_rest_table_customers_fetch=failed; error=TypeError
supabase_rest_table_messages_fetch=failed; error=TypeError
supabase_rest_table_alerts_fetch=failed; error=TypeError
supabase_rest_table_knowledge_pages_fetch=failed; error=TypeError
supabase_rest_table_staff_users_fetch=failed; error=TypeError
supabase_rest_table_staff_tenant_memberships_fetch=failed; error=TypeError
supabase_url_host_suffix_supabase_co=true; host not displayed
supabase_url_host_label_count=3; host not displayed
supabase_db_url_host_suffix_supabase_co=true; host not displayed
supabase_db_url_host_label_count=4; host not displayed
supabase_db_url_dns=failed; host not displayed
supabase_db_url_tcp_5432=error; host not displayed
general_dns_example_com=success
general_dns_github_com=success
db_metadata_preflight=skipped
psql=not_installed
```

## Runtime Retry Result

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
classification=A_supabase_url_dns_tcp_rest_connection_issue
root_cause=Configured Supabase endpoint does not resolve from VPS; host not recorded
fix_applied=no
```

## Rollback Result

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
supabase_ready=false
production_readiness=production_no_go
```

## Decision

コード側のquery/mapping修正ではなく、Supabase endpoint / DNS / connection preflightの問題として次Loopへ分ける。

今回、migration apply、RLS変更、schema変更、write smokeは行っていない。

## Next Loop Candidate

Loop 154: Supabase staging endpoint re-entry and connection preflight
