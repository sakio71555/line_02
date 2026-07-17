-- Operations security and search remediation.

revoke insert, update, delete, truncate, references, trigger on table
  public.consultations,
  public.reservations,
  public.internal_notes,
  public.reply_templates,
  public.tenant_workspace_settings,
  public.audit_events
from authenticated;

grant select on table
  public.consultations,
  public.reservations,
  public.internal_notes,
  public.reply_templates,
  public.tenant_workspace_settings,
  public.audit_events
to authenticated;

create or replace function private.has_active_tenant_role(
  target_tenant_id text,
  allowed_roles text[]
)
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
      and stm.role = any (allowed_roles)
  );
$$;

revoke all on function private.has_active_tenant_role(text, text[]) from public, anon;
grant execute on function private.has_active_tenant_role(text, text[])
  to authenticated, service_role;

drop policy if exists "consultations_for_active_staff" on public.consultations;
drop policy if exists "consultations_select_for_active_staff" on public.consultations;
create policy "consultations_select_for_active_staff" on public.consultations
  for select to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "reservations_for_active_staff" on public.reservations;
drop policy if exists "reservations_select_for_active_staff" on public.reservations;
create policy "reservations_select_for_active_staff" on public.reservations
  for select to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "internal_notes_for_active_staff" on public.internal_notes;
drop policy if exists "internal_notes_select_for_active_staff" on public.internal_notes;
create policy "internal_notes_select_for_active_staff" on public.internal_notes
  for select to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "reply_templates_for_active_staff" on public.reply_templates;
drop policy if exists "reply_templates_select_for_active_staff" on public.reply_templates;
create policy "reply_templates_select_for_active_staff" on public.reply_templates
  for select to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "workspace_settings_for_active_staff" on public.tenant_workspace_settings;
drop policy if exists "workspace_settings_select_for_active_staff"
  on public.tenant_workspace_settings;
create policy "workspace_settings_select_for_active_staff"
  on public.tenant_workspace_settings
  for select to authenticated
  using ((select private.is_active_tenant_staff(tenant_id)));

drop policy if exists "audit_events_select_for_active_staff" on public.audit_events;
drop policy if exists "audit_events_select_for_tenant_managers" on public.audit_events;
create policy "audit_events_select_for_tenant_managers" on public.audit_events
  for select to authenticated
  using ((select private.has_active_tenant_role(tenant_id, array['owner', 'manager'])));

create unique index if not exists customers_tenant_id_id_unique
  on public.customers (tenant_id, id);
create unique index if not exists consultations_tenant_id_id_unique
  on public.consultations (tenant_id, id);
create unique index if not exists alerts_tenant_id_id_unique
  on public.alerts (tenant_id, id);

alter table public.consultations
  add constraint consultations_tenant_customer_fk
  foreign key (tenant_id, customer_id)
  references public.customers (tenant_id, id)
  on delete cascade
  not valid;
alter table public.consultations validate constraint consultations_tenant_customer_fk;

alter table public.messages
  add constraint messages_tenant_customer_fk
  foreign key (tenant_id, customer_id)
  references public.customers (tenant_id, id)
  on delete cascade
  not valid;
alter table public.messages validate constraint messages_tenant_customer_fk;

alter table public.alerts
  add constraint alerts_tenant_customer_fk
  foreign key (tenant_id, customer_id)
  references public.customers (tenant_id, id)
  on delete cascade
  not valid;
alter table public.alerts validate constraint alerts_tenant_customer_fk;

alter table public.reservations
  add constraint reservations_tenant_customer_fk
  foreign key (tenant_id, customer_id)
  references public.customers (tenant_id, id)
  on delete cascade
  not valid;
alter table public.reservations validate constraint reservations_tenant_customer_fk;

alter table public.internal_notes
  add constraint internal_notes_tenant_customer_fk
  foreign key (tenant_id, customer_id)
  references public.customers (tenant_id, id)
  on delete cascade
  not valid;
alter table public.internal_notes validate constraint internal_notes_tenant_customer_fk;

do $$
begin
  if exists (
    select 1
    from public.messages m
    join public.consultations c on c.id = m.consultation_id
    where m.consultation_id is not null and c.tenant_id <> m.tenant_id
    union all
    select 1
    from public.alerts a
    join public.consultations c on c.id = a.consultation_id
    where a.consultation_id is not null and c.tenant_id <> a.tenant_id
    union all
    select 1
    from public.reservations r
    join public.consultations c on c.id = r.consultation_id
    where r.consultation_id is not null and c.tenant_id <> r.tenant_id
    union all
    select 1
    from public.internal_notes n
    join public.alerts a on a.id = n.alert_id
    where n.alert_id is not null and a.tenant_id <> n.tenant_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'operations tenant integrity preflight failed';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.consultations c
    where c.assigned_staff_user_id is not null
      and not exists (
        select 1 from public.staff_tenant_memberships stm
        where stm.staff_user_id = c.assigned_staff_user_id
          and stm.tenant_id = c.tenant_id
      )
    union all
    select 1
    from public.messages m
    where m.staff_user_id is not null
      and not exists (
        select 1 from public.staff_tenant_memberships stm
        where stm.staff_user_id = m.staff_user_id
          and stm.tenant_id = m.tenant_id
      )
    union all
    select 1
    from public.alerts a
    where a.assigned_staff_user_id is not null
      and not exists (
        select 1 from public.staff_tenant_memberships stm
        where stm.staff_user_id = a.assigned_staff_user_id
          and stm.tenant_id = a.tenant_id
      )
    union all
    select 1
    from public.reservations r
    where r.staff_user_id is not null
      and not exists (
        select 1 from public.staff_tenant_memberships stm
        where stm.staff_user_id = r.staff_user_id
          and stm.tenant_id = r.tenant_id
      )
    union all
    select 1
    from public.internal_notes n
    where n.author_staff_user_id is not null
      and not exists (
        select 1 from public.staff_tenant_memberships stm
        where stm.staff_user_id = n.author_staff_user_id
          and stm.tenant_id = n.tenant_id
      )
    union all
    select 1
    from public.internal_notes n
    cross join lateral unnest(n.mention_staff_user_ids) mentioned_staff_user_id
    where not exists (
      select 1 from public.staff_tenant_memberships stm
      where stm.staff_user_id = mentioned_staff_user_id
        and stm.tenant_id = n.tenant_id
    )
    union all
    select 1
    from public.audit_events ae
    where ae.actor_staff_user_id is not null
      and not exists (
        select 1 from public.staff_tenant_memberships stm
        where stm.staff_user_id = ae.actor_staff_user_id
          and stm.tenant_id = ae.tenant_id
      )
  ) then
    raise exception using
      errcode = '23503',
      message = 'operations tenant staff integrity preflight failed';
  end if;
end;
$$;

create or replace function private.validate_operations_tenant_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(new);
  reference_id text;
begin
  reference_id := nullif(row_data ->> 'consultation_id', '');
  if reference_id is not null and not exists (
    select 1 from public.consultations c
    where c.id = reference_id and c.tenant_id = new.tenant_id
  ) then
    raise exception using errcode = '23503', message = 'tenant consultation reference mismatch';
  end if;

  reference_id := nullif(row_data ->> 'alert_id', '');
  if reference_id is not null and not exists (
    select 1 from public.alerts a
    where a.id = reference_id and a.tenant_id = new.tenant_id
  ) then
    raise exception using errcode = '23503', message = 'tenant alert reference mismatch';
  end if;

  foreach reference_id in array array[
    nullif(row_data ->> 'assigned_staff_user_id', ''),
    nullif(row_data ->> 'staff_user_id', ''),
    nullif(row_data ->> 'author_staff_user_id', ''),
    nullif(row_data ->> 'actor_staff_user_id', '')
  ] loop
    if reference_id is not null and not exists (
      select 1 from public.staff_tenant_memberships stm
      where stm.staff_user_id = reference_id and stm.tenant_id = new.tenant_id
    ) then
      raise exception using errcode = '23503', message = 'tenant staff reference mismatch';
    end if;
  end loop;

  if row_data ? 'mention_staff_user_ids' and exists (
    select 1
    from jsonb_array_elements_text(row_data -> 'mention_staff_user_ids') mentioned(staff_user_id)
    where not exists (
      select 1 from public.staff_tenant_memberships stm
      where stm.staff_user_id = mentioned.staff_user_id
        and stm.tenant_id = new.tenant_id
    )
  ) then
    raise exception using errcode = '23503', message = 'tenant mention reference mismatch';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_operations_tenant_references() from public, anon, authenticated;
grant execute on function private.validate_operations_tenant_references() to service_role;

create trigger consultations_validate_tenant_references
before insert or update on public.consultations
for each row execute function private.validate_operations_tenant_references();
create trigger messages_validate_tenant_references
before insert or update on public.messages
for each row execute function private.validate_operations_tenant_references();
create trigger alerts_validate_tenant_references
before insert or update on public.alerts
for each row execute function private.validate_operations_tenant_references();
create trigger reservations_validate_tenant_references
before insert or update on public.reservations
for each row execute function private.validate_operations_tenant_references();
create trigger internal_notes_validate_tenant_references
before insert or update on public.internal_notes
for each row execute function private.validate_operations_tenant_references();
create trigger audit_events_validate_tenant_references
before insert or update on public.audit_events
for each row execute function private.validate_operations_tenant_references();

create or replace function public.list_operations_staff_members(target_tenant_id text)
returns table (
  id text,
  tenant_id text,
  display_name text,
  email text,
  role text,
  is_active boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    su.id,
    stm.tenant_id,
    su.display_name,
    su.email,
    stm.role,
    su.is_active
  from public.staff_tenant_memberships stm
  join public.staff_users su on su.id = stm.staff_user_id
  where stm.tenant_id = target_tenant_id
    and stm.status = 'active'
    and su.status = 'active'
    and su.is_active = true
  order by su.display_name;
$$;

revoke all on function public.list_operations_staff_members(text)
  from public, anon, authenticated;
grant execute on function public.list_operations_staff_members(text) to service_role;

create or replace function public.search_operations_workspace(
  target_tenant_id text,
  search_query text
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select lower(trim(search_query)) as value
  )
  select jsonb_build_object(
    'customers', coalesce((
      select jsonb_agg(hit.payload order by hit.sort_at desc)
      from (
        select to_jsonb(c) as payload, c.updated_at as sort_at
        from public.customers c, query q
        where c.tenant_id = target_tenant_id
          and q.value <> ''
          and strpos(lower(concat_ws(' ', c.display_name, c.phone, c.email, c.address,
            array_to_string(c.interest_tags, ' '))), q.value) > 0
        order by c.updated_at desc
        limit 20
      ) hit
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(hit.payload order by hit.sort_at desc)
      from (
        select jsonb_build_object('customer_id', m.customer_id, 'message', to_jsonb(m)) as payload,
          m.created_at as sort_at
        from public.messages m, query q
        where m.tenant_id = target_tenant_id
          and q.value <> ''
          and strpos(lower(coalesce(m.body, '')), q.value) > 0
        order by m.created_at desc
        limit 30
      ) hit
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(hit.payload order by hit.sort_at desc)
      from (
        select jsonb_build_object('customer_id', n.customer_id, 'note', to_jsonb(n)) as payload,
          n.created_at as sort_at
        from public.internal_notes n, query q
        where n.tenant_id = target_tenant_id
          and q.value <> ''
          and strpos(lower(n.body), q.value) > 0
        order by n.created_at desc
        limit 20
      ) hit
    ), '[]'::jsonb),
    'alerts', coalesce((
      select jsonb_agg(hit.payload order by hit.sort_at desc)
      from (
        select to_jsonb(a) as payload, a.updated_at as sort_at
        from public.alerts a, query q
        where a.tenant_id = target_tenant_id
          and q.value <> ''
          and strpos(lower(a.message), q.value) > 0
        order by a.updated_at desc
        limit 20
      ) hit
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.search_operations_workspace(text, text)
  from public, anon, authenticated;
grant execute on function public.search_operations_workspace(text, text) to service_role;
