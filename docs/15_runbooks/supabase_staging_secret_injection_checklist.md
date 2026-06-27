# Supabase Staging Secret Injection Checklist

## Purpose

Prepare Supabase staging secret injection without displaying or recording secret values.

Loop 147-150 did not create or run a Supabase secret helper because deployed API startup does not yet wire `REPOSITORY_RUNTIME=supabase` into `createApiApp()`.

## Current Status

```txt
supabase_implementation_classification=B_repositories_exist_runtime_startup_wiring_incomplete
supabase_repositories_implemented=true
supabase_runtime_bundle_exists=true
api_startup_reads_repository_runtime=false
supabase_runtime_env_file=absent
supabase_secret_helper_created=no
supabase_connected=no
storage_mode=in_memory
production_readiness=production_no_go
```

## Non-Secret Names

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
REPOSITORY_RUNTIME
```

Do not record values.

## Go Conditions Before Secret Injection

- API startup wiring reads a safe runtime mode.
- `REPOSITORY_RUNTIME=supabase` creates and injects the Supabase customer/message/alert/knowledge bundle.
- Missing or invalid Supabase env fails safely before partial runtime activation.
- Rollback to `in_memory` is tested.
- Staging smoke uses dummy/test tenant data only.
- No production data write is performed.

## No-Go Conditions

- API startup ignores `REPOSITORY_RUNTIME`.
- RLS/Auth/staff context is not ready for production.
- Secret owner has not approved staging injection.
- Rollback command is not documented.

## Next

Plan a small remediation Loop before any secret entry:

```txt
Loop 151: production runtime wiring remediation plan
Loop 152: Supabase runtime startup wiring
Loop 153: Supabase staging secret injection and redacted health smoke
```

## Loop 151 Update

Runtime startup wiring is now implemented.

```txt
supabase_implementation_classification=C_runtime_switch_wired_real_connection_pending
api_startup_reads_repository_runtime=true
repository_runtime_switch=implemented
default_data_backend=in_memory
supabase_connected=no
production_readiness=production_no_go
```

Secret injection is still not automatic. Before setting `REPOSITORY_RUNTIME` to `supabase` in an operator-managed environment, run a separate Supabase staging connection Loop with redacted env checks, rollback to `in_memory`, and dummy tenant data only.

## Loop 152 Update

Supabase staging secret was entered by the operator outside Codex and the runtime switch was attempted on the VPS review environment.

```txt
operator_secret_entry=completed_outside_codex
supabase_runtime_env_file=present_root_only
supabase_runtime_env_values_recorded=no
repository_runtime_switch_attempted=REPOSITORY_RUNTIME=supabase
node20_supabase_client_transport_fix=implemented
api_direct_health_with_supabase=200
https_api_health_with_supabase=200
api_direct_admin_customers_with_supabase=500
write_smoke=not_performed
rollback_to_in_memory=completed
supabase_ready=false
production_readiness=production_no_go
```

The Supabase runtime should not be kept active until the DNS / connection preflight and read smoke are remediated. Secret values and concrete endpoints remain unrecorded.

## Loop 153 Update

The existing secret file was reused and checked without displaying values.

```txt
supabase_runtime_env_format_check=passed
supabase_url_dns=failed; host not displayed
supabase_db_url_dns=failed; host not displayed
general_dns_example_com=success
classification=A_supabase_url_dns_tcp_rest_connection_issue
rollback_to_in_memory=completed
supabase_ready=false
production_readiness=production_no_go
```

Next action should be endpoint re-entry or connection preflight with the operator, not migration/RLS/code changes.
