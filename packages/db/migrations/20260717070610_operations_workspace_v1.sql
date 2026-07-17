-- Operations workspace: task ownership, SLA, notes, templates, onboarding and audit history.

alter table public.alerts
  add column if not exists workflow_status text not null default 'open'
    check (workflow_status in ('open', 'in_progress', 'waiting_customer', 'completed')),
  add column if not exists assigned_staff_user_id text references public.staff_users(id) on delete set null,
  add column if not exists due_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.alerts
set workflow_status = 'completed',
    completed_at = coalesce(resolved_at, updated_at)
where status in ('resolved', 'dismissed')
  and workflow_status <> 'completed';

create index if not exists alerts_tenant_workflow_due_idx
  on public.alerts (tenant_id, workflow_status, due_at);
create index if not exists alerts_tenant_assignee_idx
  on public.alerts (tenant_id, assigned_staff_user_id, workflow_status);

create table if not exists public.internal_notes (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  alert_id text references public.alerts(id) on delete set null,
  author_staff_user_id text references public.staff_users(id) on delete set null,
  body text not null,
  mention_staff_user_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists internal_notes_tenant_customer_created_idx
  on public.internal_notes (tenant_id, customer_id, created_at desc);

create table if not exists public.reply_templates (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reply_templates_tenant_active_idx
  on public.reply_templates (tenant_id, is_active, title);

create table if not exists public.tenant_workspace_settings (
  tenant_id text primary key references public.tenants(id) on delete cascade,
  company_name text not null default '',
  product_name text not null default 'LINE相談CRM',
  accent_preset text not null default 'forest'
    check (accent_preset in ('forest', 'ocean', 'charcoal', 'sunrise')),
  sla_minutes integer not null default 240 check (sla_minutes between 15 and 43200),
  rich_menu_auto_switch_enabled boolean not null default false,
  customer_status_notifications_enabled boolean not null default false,
  setup_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  actor_staff_user_id text references public.staff_users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_tenant_created_idx
  on public.audit_events (tenant_id, created_at desc);
create index if not exists audit_events_tenant_resource_idx
  on public.audit_events (tenant_id, resource_type, resource_id);

grant select, insert, update on table
  public.consultations,
  public.reservations,
  public.internal_notes,
  public.reply_templates,
  public.tenant_workspace_settings
to authenticated;

grant select on table public.audit_events to authenticated;

grant all on table
  public.consultations,
  public.reservations,
  public.internal_notes,
  public.reply_templates,
  public.tenant_workspace_settings,
  public.audit_events
to service_role;

alter table public.consultations enable row level security;
alter table public.consultations force row level security;
alter table public.reservations enable row level security;
alter table public.reservations force row level security;
alter table public.internal_notes enable row level security;
alter table public.internal_notes force row level security;
alter table public.reply_templates enable row level security;
alter table public.reply_templates force row level security;
alter table public.tenant_workspace_settings enable row level security;
alter table public.tenant_workspace_settings force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_active_tenant_staff(target_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm on stm.staff_user_id = su.id
    where su.auth_user_id = (select auth.uid())::text
      and su.status = 'active'
      and su.is_active = true
      and stm.status = 'active'
      and stm.tenant_id = target_tenant_id
  );
$$;

revoke all on function private.is_active_tenant_staff(text) from public, anon;
grant execute on function private.is_active_tenant_staff(text) to authenticated, service_role;

drop policy if exists "consultations_for_active_staff" on public.consultations;
create policy "consultations_for_active_staff" on public.consultations
  for all to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)))
  with check ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "reservations_for_active_staff" on public.reservations;
create policy "reservations_for_active_staff" on public.reservations
  for all to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)))
  with check ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "internal_notes_for_active_staff" on public.internal_notes;
create policy "internal_notes_for_active_staff" on public.internal_notes
  for all to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)))
  with check ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "reply_templates_for_active_staff" on public.reply_templates;
create policy "reply_templates_for_active_staff" on public.reply_templates
  for all to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)))
  with check ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "workspace_settings_for_active_staff" on public.tenant_workspace_settings;
create policy "workspace_settings_for_active_staff" on public.tenant_workspace_settings
  for all to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)))
  with check ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "audit_events_select_for_active_staff" on public.audit_events;
create policy "audit_events_select_for_active_staff" on public.audit_events
  for select to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)));
