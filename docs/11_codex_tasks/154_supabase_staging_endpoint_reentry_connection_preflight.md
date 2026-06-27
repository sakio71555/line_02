# Loop 154: Supabase Staging Endpoint Re-entry and Connection Preflight

## Goal

Loop 153で分類した Supabase endpoint / DNS / connection issue に対して、operatorがSupabase staging endpoint valuesをCodex外terminalで再入力し、API runtimeへ接続する前にredacted preflightを通す。

## Scope

- VPS上の既存 `/etc/amami-line-crm/supabase-runtime.env` をroot-only helperでrotateする。
- Supabase env namesの存在と形式を値非表示で確認する。
- Supabase REST host DNS / TCP 443をhost非表示で確認する。
- Supabase DB host DNS / TCPをhost非表示で確認する。
- REST DNS/TCPが通った場合のみREST root/table statusとruntime read smokeへ進む。
- 失敗時は `REPOSITORY_RUNTIME=in_memory` を維持する。
- docs / test / dev log / runbookを更新する。

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

## Start State

```txt
branch=main...origin/main
worktree=clean
head_commit=d892575_or_newer
runtime_before_loop=in_memory
api_service_before_loop=active
admin_service_before_loop=active
api_direct_health_before_supabase_reentry=200
https_api_health_before_supabase_reentry=200
```

## Local Baseline

```txt
git_diff_check=success
lint=success
typecheck=success
build=success
```

Full test and test:integration were run at the end of the Loop.

## Runtime and Route Confirmation

```txt
repository_runtime_switch_env=REPOSITORY_RUNTIME
repository_runtime_allowed_values=in_memory,supabase
repository_runtime_default=in_memory
required_supabase_env_names=SUPABASE_URL,SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL
supabase_repository_bundle=customers,messages,alerts,knowledge_pages
current_runtime_before_reentry=in_memory
```

## Operator Re-entry

```txt
operator_secret_entry=completed_outside_codex
supabase_runtime_env_file=present_root_only
supabase_runtime_env_file_mode=600
supabase_runtime_env_keys_redacted=true
supabase_runtime_env_values_recorded=no
supabase_runtime_env_format_check=passed
```

The first re-entry attempt was rejected by validation because one required key was empty. The helper was tightened to reject blank or whitespace-only values, then operator re-entry succeeded.

## Redacted DNS / TCP Preflight

```txt
supabase_rest_host_dns=failed; host not displayed; error=ENOTFOUND
supabase_rest_tcp=error; host not displayed
supabase_db_host_dns=failed; host not displayed; error=ENOTFOUND
supabase_db_tcp=error; host not displayed
general_dns_example_com=success
general_dns_github_com=success
```

## REST / DB Metadata Preflight

```txt
supabase_rest_root_status=skipped_due_rest_dns_tcp_failure
supabase_rest_table_customers_status=skipped_due_rest_dns_tcp_failure
supabase_rest_table_messages_status=skipped_due_rest_dns_tcp_failure
supabase_rest_table_alerts_status=skipped_due_rest_dns_tcp_failure
supabase_rest_table_knowledge_pages_status=skipped_due_rest_dns_tcp_failure
supabase_rest_table_staff_users_status=skipped_due_rest_dns_tcp_failure
supabase_rest_table_staff_tenant_memberships_status=skipped_due_rest_dns_tcp_failure
psql_metadata_status=skipped_due_db_dns_tcp_failure
```

## Runtime Result

```txt
repository_runtime_switch_attempted=no
skip_reason=REST DNS/TCP preflight failed
connected_to_supabase_runtime=no
customers_read_smoke_status=skipped_due_rest_dns_tcp_failure
write_smoke=not_performed
final_runtime=in_memory
api_service_final=active
api_direct_health_final=200
https_api_health_final=200
line_invalid_signature_post_loop154=401
```

## Classification

```txt
classification=C_endpoint_still_dns_tcp_failed
root_cause=Configured Supabase endpoint still does not resolve from VPS; host not recorded
fix_applied=no
runtime_rollback_needed=no
supabase_ready=false
production_readiness=production_no_go
```

## Safety

- Supabase secret values were not displayed or recorded.
- Supabase REST host / DB host values were not displayed or recorded.
- Supabase production data access was not performed.
- Migration apply, RLS change, schema change, and write smoke were not performed.
- OpenAI real API was not called.
- LINE real push/reply was not called.
- Nginx, DNS, and certbot were not changed.

## Next Loop Candidate

Loop 155: Supabase staging endpoint value verification with owner-provided non-secret diagnosis
