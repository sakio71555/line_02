-- Expose one service-role-only readiness check so the API can fail closed
-- before serving traffic against an incomplete production schema.

create or replace function public.assert_api_runtime_schema_ready()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'staff_tenant_memberships'
        and column_name = 'display_name'
        and is_nullable = 'NO'
    )
    and pg_catalog.to_regprocedure(
      'public.list_operations_staff_members(text)'
    ) is not null
    and pg_catalog.to_regprocedure(
      'public.list_staff_management_records(text)'
    ) is not null
    and pg_catalog.to_regprocedure(
      'public.create_staff_management_record(jsonb,jsonb)'
    ) is not null
    and pg_catalog.to_regprocedure(
      'public.save_staff_management_record(jsonb,jsonb)'
    ) is not null;
$$;

revoke all on function public.assert_api_runtime_schema_ready() from public;
revoke all on function public.assert_api_runtime_schema_ready() from anon;
revoke all on function public.assert_api_runtime_schema_ready() from authenticated;
grant execute on function public.assert_api_runtime_schema_ready() to service_role;
