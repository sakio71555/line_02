# Loop 155: Supabase endpoint value verification

## Goal

Verify the operator-provided Supabase staging endpoint values with non-secret diagnostics, connect the VPS review API runtime to Supabase only after the project is healthy, and record the read-only smoke result without writing secrets, concrete endpoints, or production data.

## Scope

- Confirm the Supabase project dashboard is active before runtime connection.
- Inspect only redacted env shape, key presence, protocol shape, string length, whitespace checks, and suffix class.
- Confirm redacted REST / DB DNS and TCP reachability without recording host values.
- Confirm REST table preflight status for the expected tables.
- Switch the VPS review API runtime to `REPOSITORY_RUNTIME=supabase` after the preflight passes.
- Run health, invalid-signature LINE safety, and admin customers read-only smoke.
- Record docs, tests, and dev log.

## Out Of Scope

- Supabase migration apply.
- Supabase write smoke or production data mutation.
- RLS SQL changes.
- OpenAI real API smoke.
- LINE real push/reply.
- LINE Official Account auto-response setting changes.
- Nginx / DNS / certbot changes.
- Secret, endpoint, DB URL, project ref, webhook path, LINE userId, or message body recording.

## Result

```txt
dashboard_status=active
supabase_runtime_env_values_recorded=no
supabase_url_shape=expected
supabase_url_parse=ok
supabase_url_protocol=https
supabase_url_length_recorded=true
supabase_url_hostname_length_recorded=true
supabase_url_hostname_suffix_kind=supabase.co
supabase_url_has_whitespace=false
supabase_url_contains_postgres=false
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

Key values were present but not recorded. The configured REST authorization accepted the service-role value during table preflight, so the non-JWT key shape did not block this Loop.

## Redacted Connectivity

```txt
supabase_rest_host_dns=success; host not displayed
supabase_rest_tcp=success; host not displayed
supabase_db_host_dns=success; host not displayed
supabase_db_tcp=success; host not displayed
supabase_rest_root_status=200
supabase_rest_table_customers_status=206
supabase_rest_table_messages_status=206
supabase_rest_table_alerts_status=206
supabase_rest_table_knowledge_pages_status=206
supabase_rest_table_staff_users_status=206
supabase_rest_table_staff_tenant_memberships_status=206
```

## Runtime Smoke

```txt
runtime_connection_performed=yes
repository_runtime_final=supabase
api_direct_health_supabase=200
https_api_health_supabase=200
customers_no_header_status=401
customers_dev_header_status=200
customers_body_recorded=no
line_invalid_signature_loop155=401
rollback_performed=no
write_smoke=not_performed
supabase_ready=true
production_readiness=production_no_go
```

The customers read-only smoke used the tenant-scoped admin API path. Concrete row fields, message bodies, LINE user identifiers, endpoint values, and keys are not recorded.

## Tenant Isolation

- Missing tenant context returned `401`.
- The read-only smoke used the development tenant context for `tenant_amamihome`.
- No cross-tenant read or write was performed in this Loop.
- No write smoke was performed.

## Safety Boundary

- Secrets and concrete Supabase endpoint values are not recorded.
- Supabase runtime is connected only in the VPS review environment.
- LINE real push/reply remains disabled.
- OpenAI real API was not performed.
- Nginx, DNS, certbot, migration, schema, and RLS were not changed.
- `production_readiness=production_no_go` remains.

## Remaining No-Go Reasons

- Supabase write smoke is not performed.
- OpenAI real API controlled smoke is not performed.
- LINE real push/reply single-message smoke is not performed.
- LINE Official Account auto-response OFF is not confirmed.
- Final operator Go/No-Go is not complete.

## Next

Loop 156: LINE Official Account auto-response OFF verification.
