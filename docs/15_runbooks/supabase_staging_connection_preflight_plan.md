# Supabase Staging Connection Preflight Plan

## Purpose

Prepare the checks required before connecting the app to Supabase staging.

This runbook does not connect to Supabase, run psql, apply migrations, change RLS, display service role keys, display DB URLs, or access real customer data.

## Current State

```txt
supabase_runtime=disconnected
repository=in_memory
supabase_real_connection=not_allowed
service_role_key_injected=no
db_url_injected=no
production_readiness=production_no_go
```

## Required Inputs

Record key names only. Do not record values.

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
staging_project_id
staging_organization_owner
rls_migration_status
backup_restore_policy
service_role_secret_injection_owner
```

## Later Preflight Checks

- Env key presence check without values.
- Migration status check.
- RLS policy status check.
- Staff tenant membership seed status check.
- Customer/Message repository runtime switch readiness.
- Alert repository runtime switch readiness.
- Knowledge/RAG repository runtime switch readiness.
- Read-only smoke with test tenant only.
- Write smoke with test tenant only.
- Rollback to `in_memory`.

## Forbidden Now

- Supabase connection.
- psql connection.
- migration apply.
- RLS changes.
- service role key display.
- DB URL display.
- real customer data access.
- runtime switch.
- `.env` creation, mutation, or display.

## Go / No-Go

```txt
supabase_staging_status=no_go
production_readiness=production_no_go
```

Reasons:

- staging Supabase project unknown.
- secret injection not done.
- RLS/migration apply state unconfirmed.
- backup/rollback undefined.

## Next

Collect staging owners and secret injection approval in a separate Loop.
