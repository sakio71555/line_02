-- Loop 094A: RLS SQL draft for core tenant-scoped tables.
-- This draft is intentionally not applied in Loop 094A.
-- Apply and verification must happen in a later local/staging-only Loop.
--
-- Policy assumptions:
-- - Supabase Auth provides auth.uid().
-- - staff_users.auth_user_id stores auth.uid() as text.
-- - staff_users.status = 'active' and staff_users.is_active = true are required.
-- - staff_tenant_memberships.status = 'active' is required.
-- - service_role remains server-side only and may bypass RLS.
-- - anon receives no CRM admin data grants or policies in this draft.

grant usage on schema public to authenticated;

grant select on table
  public.tenants,
  public.tenant_line_settings,
  public.tenant_ai_settings,
  public.staff_users,
  public.staff_tenant_memberships,
  public.knowledge_pages
to authenticated;

grant select, insert, update on table
  public.customers,
  public.alerts
to authenticated;

grant select, insert on table
  public.messages
to authenticated;

alter table public.tenants enable row level security;
alter table public.tenants force row level security;
alter table public.tenant_line_settings enable row level security;
alter table public.tenant_line_settings force row level security;
alter table public.tenant_ai_settings enable row level security;
alter table public.tenant_ai_settings force row level security;
alter table public.customers enable row level security;
alter table public.customers force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.alerts enable row level security;
alter table public.alerts force row level security;
alter table public.knowledge_pages enable row level security;
alter table public.knowledge_pages force row level security;
alter table public.staff_users enable row level security;
alter table public.staff_users force row level security;
alter table public.staff_tenant_memberships enable row level security;
alter table public.staff_tenant_memberships force row level security;

drop policy if exists "tenants_select_for_active_staff_membership" on public.tenants;
create policy "tenants_select_for_active_staff_membership"
on public.tenants
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = tenants.id
  )
);

drop policy if exists "tenant_line_settings_select_for_active_staff_membership"
  on public.tenant_line_settings;
create policy "tenant_line_settings_select_for_active_staff_membership"
on public.tenant_line_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = tenant_line_settings.tenant_id
  )
);

drop policy if exists "tenant_ai_settings_select_for_active_staff_membership"
  on public.tenant_ai_settings;
create policy "tenant_ai_settings_select_for_active_staff_membership"
on public.tenant_ai_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = tenant_ai_settings.tenant_id
  )
);

drop policy if exists "customers_select_for_active_staff_membership" on public.customers;
create policy "customers_select_for_active_staff_membership"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = customers.tenant_id
  )
);

drop policy if exists "customers_insert_for_active_staff_membership" on public.customers;
create policy "customers_insert_for_active_staff_membership"
on public.customers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = customers.tenant_id
  )
);

drop policy if exists "customers_update_for_active_staff_membership" on public.customers;
create policy "customers_update_for_active_staff_membership"
on public.customers
for update
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = customers.tenant_id
  )
)
with check (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = customers.tenant_id
  )
);

drop policy if exists "messages_select_for_active_staff_membership" on public.messages;
create policy "messages_select_for_active_staff_membership"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = messages.tenant_id
  )
);

drop policy if exists "messages_insert_for_active_staff_membership" on public.messages;
create policy "messages_insert_for_active_staff_membership"
on public.messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = messages.tenant_id
  )
);

drop policy if exists "alerts_select_for_active_staff_membership" on public.alerts;
create policy "alerts_select_for_active_staff_membership"
on public.alerts
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = alerts.tenant_id
  )
);

drop policy if exists "alerts_insert_for_active_staff_membership" on public.alerts;
create policy "alerts_insert_for_active_staff_membership"
on public.alerts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = alerts.tenant_id
  )
);

drop policy if exists "alerts_update_for_active_staff_membership" on public.alerts;
create policy "alerts_update_for_active_staff_membership"
on public.alerts
for update
to authenticated
using (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = alerts.tenant_id
  )
)
with check (
  exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = alerts.tenant_id
  )
);

drop policy if exists "knowledge_pages_select_allowed_for_active_staff_membership"
  on public.knowledge_pages;
create policy "knowledge_pages_select_allowed_for_active_staff_membership"
on public.knowledge_pages
for select
to authenticated
using (
  allowed_for_ai = true
  and exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm
      on stm.staff_user_id = su.id
    where su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = knowledge_pages.tenant_id
  )
);

drop policy if exists "staff_users_select_own_active_staff_row" on public.staff_users;
create policy "staff_users_select_own_active_staff_row"
on public.staff_users
for select
to authenticated
using (
  auth_user_id = auth.uid()::text
  and status = 'active'
  and is_active = true
);

drop policy if exists "staff_tenant_memberships_select_own_active_memberships"
  on public.staff_tenant_memberships;
create policy "staff_tenant_memberships_select_own_active_memberships"
on public.staff_tenant_memberships
for select
to authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.staff_users su
    where su.id = staff_tenant_memberships.staff_user_id
      and su.auth_user_id = auth.uid()::text
      and su.status = 'active'
      and su.is_active = true
  )
);
