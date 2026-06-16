# Supabase Runtime Boundary Skill

## Purpose

Use this skill when working near Supabase client, repository, runtime switch, or persistence planning.

## Current Boundary

- Runtime modes are `in_memory` and `supabase`.
- The default runtime is `in_memory`.
- Fake client injection is maintained for tests.
- Supabase env/config errors must not leak secret values or URL values.
- API runtime connection is a separate Loop.

## Hard Stops

- Do not connect to Supabase unless the Loop explicitly requests it.
- Do not create or modify `.env`.
- Do not run migration apply.
- Do not write RLS SQL unless the Loop is specifically for RLS SQL.
- Do not move the default runtime away from in-memory inside an unrelated Loop.
- Do not expose service role key to browser, LIFF, or Next.js client components.

## Expected Checks

- tenant_id filters are present on repository reads.
- tenant_id is present on write payloads.
- fake client tests remain possible without real keys or network access.
