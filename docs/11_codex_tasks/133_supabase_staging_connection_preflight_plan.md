# Loop 133: Supabase staging connection preflight plan

## Goal

Plan the information and safety checks required before any Supabase staging real connection.

No Supabase connection, psql connection, migration apply, RLS change, service role key display, or DB URL display is performed in this Loop.

## Scope

- Record current Supabase runtime state.
- List required env key names without values.
- List required staging ownership and RLS/migration checks.
- Define later preflight checks.
- Keep `supabase_staging_status=no_go`.
- Keep `production_no_go`.

## Out of Scope

- Supabase real connection.
- psql connection.
- migration apply.
- RLS SQL changes.
- service role key display.
- DB URL display.
- real customer data access.
- runtime switch.
- `.env` creation, mutation, or display.

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

Names only:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- staging project id
- staging organization owner
- RLS migration status
- backup/restore policy
- service-role secret injection owner

## Later Preflight Checks

- env key presence check without values.
- migration status.
- RLS policy status.
- staff tenant membership seed status.
- Customer/Message/Alert/Knowledge repository runtime switch status.
- read-only smoke.
- write smoke with test tenant only.
- rollback to `in_memory`.

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

- Loop 138: Supabase staging secret injection checklist.
