# Supabase Endpoint Value Verification

## Purpose

Record Loop 155, where operator-provided Supabase staging endpoint values were verified by non-secret shape checks, redacted network checks, REST preflight, and a tenant-scoped read-only runtime smoke.

This runbook intentionally does not record Supabase host values, project refs, DB URLs, keys, webhook paths, LINE userIds, message bodies, or production logs.

## Preconditions

```txt
dashboard_status=active
operator_secret_entry=completed_outside_codex
supabase_runtime_env_values_recorded=no
production_readiness=production_no_go
```

The dashboard status was confirmed by the operator. The concrete project URL is not recorded in this repository.

## Redacted Value Shape Diagnosis

```txt
supabase_url_present=true
supabase_url_shape=expected
supabase_url_parse=ok
supabase_url_protocol=https
supabase_url_length_recorded=true
supabase_url_hostname_length_recorded=true
supabase_url_hostname_suffix_kind=supabase.co
supabase_url_has_whitespace=false
supabase_url_contains_postgres=false
supabase_db_url_present=true
supabase_db_url_shape=expected
supabase_db_url_parse=ok
supabase_db_url_protocol=postgresql
supabase_db_url_length_recorded=true
supabase_db_url_hostname_length_recorded=true
supabase_db_url_hostname_suffix_kind=supabase.co
supabase_db_url_has_whitespace=false
supabase_db_url_contains_postgres=true
supabase_anon_key_present=true
supabase_anon_key_looks_jwt=false
supabase_service_role_key_present=true
supabase_service_role_key_looks_jwt=false
supabase_service_role_rest_auth_accepted=true
```

The key values were present but not recorded. REST table preflight accepted the configured service role authorization, so the non-JWT key shape did not block Loop 155.

## Redacted Connectivity

```txt
supabase_rest_host_dns=success; host not displayed
supabase_rest_tcp=success; host not displayed
supabase_db_host_dns=success; host not displayed
supabase_db_tcp=success; host not displayed
```

Concrete host values remain hidden. The result only records reachability.

## REST Preflight

```txt
supabase_rest_root_status=200
supabase_rest_table_customers_status=206
supabase_rest_table_messages_status=206
supabase_rest_table_alerts_status=206
supabase_rest_table_knowledge_pages_status=206
supabase_rest_table_staff_users_status=206
supabase_rest_table_staff_tenant_memberships_status=206
```

The table preflight was read-only. No migration, schema change, or data write was performed.

## Runtime Connection

After the active dashboard and redacted REST / DB preflight passed, the VPS review API runtime was connected to Supabase.

```txt
runtime_connection_performed=yes
repository_runtime_final=supabase
api_service_final=active
api_direct_health_supabase=200
https_api_health_supabase=200
```

## Read-Only Smoke

```txt
customers_no_header_status=401
customers_dev_header_status=200
customers_body_recorded=no
body_sanitized_summary=tenant scoped customer list returned; concrete row fields not recorded
line_invalid_signature_loop155=401
rollback_performed=no
write_smoke=not_performed
```

The tenant-scoped customers read smoke reached the Supabase-backed runtime. Concrete customer fields, message bodies, LINE identifiers, and response body details are not recorded.

## Readiness

```txt
supabase_ready=true
https_ready_for_review=true
line_receive_ready=true
openai_ready=false
line_reply_push_ready=false
production_readiness=production_no_go
```

Supabase staging read-only readiness is now true for the review environment. Production remains No-Go.

## Remaining No-Go Reasons

- Supabase write smoke is not performed.
- OpenAI real API controlled smoke is not performed.
- LINE real push/reply single-message smoke is not performed.
- LINE Official Account auto-response OFF is not confirmed.
- Final operator Go/No-Go is not complete.

## Safety Boundary

- Secret values are not displayed or recorded.
- Supabase host, project ref, DB URL, LINE webhook path, LINE userId, and message bodies are not recorded.
- No production data access was performed.
- No migration apply, schema change, RLS change, write smoke, OpenAI real API, LINE real push/reply, Nginx change, DNS change, or certbot change was performed.

## Next

Loop 156: LINE Official Account auto-response OFF verification.

## Loop 156 Follow-Up

Loop 156 confirmed the Supabase-backed runtime can receive a real LINE message and keep the read smoke valid after an API service restart.

```txt
official_account_auto_response_ready=true
line_receive_ready=true
repository_runtime_after_restart=supabase
customers_safe_header_after_restart=200
supabase_messages_after_restart_status=200
supabase_messages_after_restart_tenant_scoped=true
supabase_receive_persistence_ready=true
line_real_push_reply=not_performed
production_readiness=production_no_go
```

No message body, LINE userId, webhook path value, Supabase endpoint, DB URL, or key value is recorded.
