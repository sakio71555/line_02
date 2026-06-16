-- Loop 079.1: staging PostgREST service_role grants recovery.
-- This is not RLS policy SQL and does not make the app production-ready.
-- It grants only the server-side Supabase service_role enough access for
-- PostgREST/Data API smoke checks against existing tenant-scoped repositories.

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.tenants,
  public.tenant_line_settings,
  public.tenant_ai_settings,
  public.customers,
  public.messages,
  public.alerts,
  public.knowledge_pages,
  public.staff_users,
  public.staff_tenant_memberships
to service_role;

grant usage, select on all sequences in schema public to service_role;
