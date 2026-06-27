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
