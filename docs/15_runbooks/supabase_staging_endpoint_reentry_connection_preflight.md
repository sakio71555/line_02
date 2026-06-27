# Supabase Staging Endpoint Re-entry and Connection Preflight

Loop: 154

Date: 2026-06-27

## Purpose

Supabase staging endpoint valuesをoperatorが再入力し、API runtimeへ接続する前にDNS / TCP / REST / DB metadata preflightをsecret値なしで確認する。

## Safety Boundary

実施する:

- Codex外terminalでのSupabase staging env re-entry。
- root-only `/etc/amami-line-crm/supabase-runtime.env` rotation。
- redacted env key / format check。
- Supabase REST host DNS / TCP 443 preflight。
- Supabase DB host DNS / TCP preflight。
- REST DNS/TCPが通った場合だけREST status、runtime connection、customers read smokeへ進む判断。

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
- secret value, Supabase host, DB URL, webhook path, LINE userId, or message body recording。

## Non-Secret Env Names

値は記録しない。

```txt
REPOSITORY_RUNTIME
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
```

## Start State

```txt
branch=main...origin/main
worktree=clean
head_commit=d892575_or_newer
current_runtime_before_loop=in_memory
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

Full test/test:integration/build were also run at the end of the Loop.

## Runtime and Route Confirmation

```txt
repository_runtime_switch_env=REPOSITORY_RUNTIME
repository_runtime_allowed_values=in_memory,supabase
repository_runtime_default=in_memory
required_supabase_env_names=SUPABASE_URL,SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL
supabase_repository_bundle=customers,messages,alerts,knowledge_pages
startup_external_connection=lazy_until_repository_query
```

## Endpoint Re-entry Record

```txt
operator_secret_entry=completed_outside_codex
supabase_runtime_env_file=present_root_only
supabase_runtime_env_file_mode=600
supabase_runtime_env_keys_redacted=true
supabase_runtime_env_values_recorded=no
supabase_runtime_env_format_check=passed
```

The first re-entry produced one empty required value. The helper was updated to reject blank values before writing the env file, and operator re-entry then passed format validation.

## Redacted DNS / TCP Preflight

```txt
supabase_rest_host_dns=failed; host not displayed; error=ENOTFOUND
supabase_rest_tcp=error; host not displayed
supabase_db_host_dns=failed; host not displayed; error=ENOTFOUND
supabase_db_tcp=error; host not displayed
general_dns_example_com=success
general_dns_github_com=success
```

Interpretation:

- VPS general DNS works.
- The configured Supabase REST host and DB host still do not resolve from VPS.
- Concrete host values are not recorded.

## REST and DB Metadata

REST and DB metadata checks were intentionally skipped because the REST/DB DNS and TCP preflight did not reach the minimum condition.

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

## Runtime Connection Decision

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

- Supabase endpoint / DNS / TCP preflight is still unresolved.
- Supabase runtime connection and customers read smoke were skipped.
- Supabase write smoke was not performed.
- OpenAI real API was not performed.
- LINE real push/reply was not performed.
- LINE Official Account auto-response OFF is not confirmed in this Loop.
- Final production Go/No-Go approval is not complete.

## Next

Loop 155: Supabase staging endpoint value verification with owner-provided non-secret diagnosis.

## Loop 155 Follow-Up

Loop 155 confirmed the Supabase staging project became active and re-ran the non-secret verification path.

```txt
dashboard_status=active
supabase_rest_host_dns=success; host not displayed
supabase_rest_tcp=success; host not displayed
supabase_db_host_dns=success; host not displayed
supabase_db_tcp=success; host not displayed
supabase_rest_root_status=200
runtime_connection_performed=yes
repository_runtime_final=supabase
customers_no_header_status=401
customers_dev_header_status=200
customers_body_recorded=no
line_invalid_signature_loop155=401
supabase_ready=true
production_readiness=production_no_go
```

Concrete host values, endpoint values, DB URL, key values, LINE webhook path values, LINE userIds, message bodies, and response body rows are still not recorded.
