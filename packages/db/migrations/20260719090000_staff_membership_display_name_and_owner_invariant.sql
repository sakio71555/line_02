-- Keep tenant-facing staff names on the tenant membership and preserve at least
-- one configured owner, including an owner whose invitation is still pending.

alter table public.staff_tenant_memberships
  add column if not exists display_name text;

update public.staff_tenant_memberships stm
set display_name = su.display_name
from public.staff_users su
where su.id = stm.staff_user_id
  and nullif(trim(stm.display_name), '') is null;

alter table public.staff_tenant_memberships
  alter column display_name set not null;

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
    stm.display_name,
    su.email,
    stm.role,
    su.is_active
  from public.staff_tenant_memberships stm
  join public.staff_users su on su.id = stm.staff_user_id
  where stm.tenant_id = target_tenant_id
    and stm.status = 'active'
    and stm.accepted_at is not null
    and su.auth_user_id is not null
    and su.status = 'active'
    and su.is_active = true
  order by stm.display_name;
$$;

create or replace function public.list_staff_management_records(target_tenant_id text)
returns table (staff_user jsonb, membership jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    to_jsonb(su) || jsonb_build_object('display_name', stm.display_name, 'role', stm.role),
    to_jsonb(stm) - 'display_name'
  from public.staff_tenant_memberships stm
  join public.staff_users su on su.id = stm.staff_user_id
  where stm.tenant_id = target_tenant_id
  order by stm.display_name, su.id;
$$;

create or replace function public.create_staff_management_record(
  staff_record jsonb,
  membership_record jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_tenant_id text := nullif(trim(membership_record ->> 'tenant_id'), '');
  requested_staff_id text := nullif(trim(staff_record ->> 'id'), '');
  normalized_email text := lower(nullif(trim(staff_record ->> 'email'), ''));
  requested_display_name text := nullif(trim(staff_record ->> 'display_name'), '');
  requested_role text := coalesce(nullif(trim(membership_record ->> 'role'), ''), 'staff');
  effective_role text;
  configured_owner_count integer := 0;
  saved_staff public.staff_users%rowtype;
  saved_membership public.staff_tenant_memberships%rowtype;
  accepted_identity boolean := false;
begin
  if target_tenant_id is null or requested_staff_id is null or normalized_email is null
    or requested_display_name is null then
    raise exception using errcode = '22023', message = 'invalid_staff_management_record';
  end if;

  if requested_role not in ('owner', 'manager', 'staff') then
    raise exception using errcode = '22023', message = 'invalid_staff_role';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(target_tenant_id, 0));
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(normalized_email, 0));

  select count(*)
  into configured_owner_count
  from public.staff_tenant_memberships stm
  where stm.tenant_id = target_tenant_id
    and stm.role = 'owner'
    and stm.status in ('active', 'invited');

  effective_role := case when configured_owner_count = 0 then 'owner' else requested_role end;

  if exists (
    select 1
    from public.staff_tenant_memberships stm
    join public.staff_users su on su.id = stm.staff_user_id
    where stm.tenant_id = target_tenant_id
      and lower(su.email) = normalized_email
  ) then
    raise exception using errcode = '23505', message = 'staff_email_already_registered';
  end if;

  select su.* into saved_staff
  from public.staff_users su
  where lower(su.email) = normalized_email
  order by (su.auth_user_id is not null) desc, su.created_at asc, su.id asc
  limit 1;

  if saved_staff.id is null then
    insert into public.staff_users (
      id, tenant_id, auth_user_id, email, display_name, role, status, line_user_id,
      is_active, last_login_at, disabled_at, archived_at, created_at, updated_at
    ) values (
      requested_staff_id, target_tenant_id, nullif(staff_record ->> 'auth_user_id', ''),
      normalized_email, requested_display_name, effective_role,
      coalesce(staff_record ->> 'status', 'active'), nullif(staff_record ->> 'line_user_id', ''),
      coalesce((staff_record ->> 'is_active')::boolean, true),
      nullif(staff_record ->> 'last_login_at', '')::timestamptz,
      nullif(staff_record ->> 'disabled_at', '')::timestamptz,
      nullif(staff_record ->> 'archived_at', '')::timestamptz,
      coalesce(nullif(staff_record ->> 'created_at', '')::timestamptz, now()),
      coalesce(nullif(staff_record ->> 'updated_at', '')::timestamptz, now())
    ) returning * into saved_staff;
  else
    select exists (
      select 1 from public.staff_tenant_memberships stm
      where stm.staff_user_id = saved_staff.id
        and stm.status = 'active'
        and stm.accepted_at is not null
    ) and saved_staff.auth_user_id is not null
      and saved_staff.status = 'active'
      and saved_staff.is_active = true
    into accepted_identity;
  end if;

  insert into public.staff_tenant_memberships (
    id, tenant_id, staff_user_id, display_name, role, status, invited_at, accepted_at,
    disabled_at, archived_at, created_at, updated_at
  ) values (
    membership_record ->> 'id', target_tenant_id, saved_staff.id, requested_display_name,
    effective_role, case when accepted_identity then 'active' else 'invited' end,
    coalesce(nullif(membership_record ->> 'invited_at', '')::timestamptz, now()),
    case when accepted_identity then now() else null end, null, null,
    coalesce(nullif(membership_record ->> 'created_at', '')::timestamptz, now()),
    coalesce(nullif(membership_record ->> 'updated_at', '')::timestamptz, now())
  ) returning * into saved_membership;

  return jsonb_build_object(
    'staff_user', to_jsonb(saved_staff) || jsonb_build_object(
      'display_name', saved_membership.display_name,
      'role', saved_membership.role
    ),
    'membership', to_jsonb(saved_membership) - 'display_name'
  );
end;
$$;

create or replace function public.save_staff_management_record(
  staff_record jsonb,
  membership_record jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_staff_id text := nullif(trim(staff_record ->> 'id'), '');
  target_tenant_id text := nullif(trim(membership_record ->> 'tenant_id'), '');
  requested_display_name text := nullif(trim(staff_record ->> 'display_name'), '');
  saved_staff public.staff_users%rowtype;
  saved_membership public.staff_tenant_memberships%rowtype;
  current_is_configured_owner boolean := false;
  next_is_configured_owner boolean := false;
  configured_owner_count integer := 0;
  current_is_active_owner boolean := false;
  next_is_active_owner boolean := false;
  active_owner_count integer := 0;
begin
  if target_staff_id is null or target_tenant_id is null or requested_display_name is null
    or target_staff_id <> nullif(trim(membership_record ->> 'staff_user_id'), '') then
    raise exception using errcode = '22023', message = 'invalid_staff_management_record';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(target_tenant_id, 0));

  select exists (
    select 1 from public.staff_tenant_memberships stm
    where stm.staff_user_id = target_staff_id
      and stm.tenant_id = target_tenant_id
      and stm.role = 'owner'
      and stm.status in ('active', 'invited')
  ) into current_is_configured_owner;

  next_is_configured_owner :=
    coalesce(membership_record ->> 'role', '') = 'owner'
    and coalesce(membership_record ->> 'status', '') in ('active', 'invited');

  select exists (
    select 1
    from public.staff_users su
    join public.staff_tenant_memberships stm on stm.staff_user_id = su.id
    where stm.staff_user_id = target_staff_id
      and stm.tenant_id = target_tenant_id
      and stm.role = 'owner'
      and stm.status = 'active'
      and stm.accepted_at is not null
      and su.status = 'active'
      and su.is_active = true
      and su.auth_user_id is not null
  ) into current_is_active_owner;

  next_is_active_owner :=
    coalesce(membership_record ->> 'role', '') = 'owner'
    and coalesce(membership_record ->> 'status', '') = 'active'
    and nullif(membership_record ->> 'accepted_at', '') is not null
    and coalesce(staff_record ->> 'status', '') = 'active'
    and coalesce((staff_record ->> 'is_active')::boolean, false)
    and nullif(staff_record ->> 'auth_user_id', '') is not null;

  if current_is_configured_owner and not next_is_configured_owner then
    select count(*) into configured_owner_count
    from public.staff_tenant_memberships stm
    where stm.tenant_id = target_tenant_id
      and stm.role = 'owner'
      and stm.status in ('active', 'invited');

    if configured_owner_count <= 1 then
      raise exception using errcode = 'P0001', message = 'last_owner_must_remain_active';
    end if;
  end if;

  if current_is_active_owner and not next_is_active_owner then
    select count(*) into active_owner_count
    from public.staff_users su
    join public.staff_tenant_memberships stm on stm.staff_user_id = su.id
    where stm.tenant_id = target_tenant_id
      and stm.role = 'owner'
      and stm.status = 'active'
      and stm.accepted_at is not null
      and su.status = 'active'
      and su.is_active = true
      and su.auth_user_id is not null;

    if active_owner_count <= 1 then
      raise exception using errcode = 'P0001', message = 'last_owner_must_remain_active';
    end if;
  end if;

  update public.staff_users su
  set
    auth_user_id = nullif(staff_record ->> 'auth_user_id', ''),
    email = lower(staff_record ->> 'email'),
    status = staff_record ->> 'status',
    line_user_id = nullif(staff_record ->> 'line_user_id', ''),
    is_active = (staff_record ->> 'is_active')::boolean,
    last_login_at = nullif(staff_record ->> 'last_login_at', '')::timestamptz,
    disabled_at = nullif(staff_record ->> 'disabled_at', '')::timestamptz,
    archived_at = nullif(staff_record ->> 'archived_at', '')::timestamptz,
    updated_at = (staff_record ->> 'updated_at')::timestamptz
  where su.id = target_staff_id
  returning * into saved_staff;

  if saved_staff.id is null then
    raise exception using errcode = 'P0002', message = 'staff_member_not_found';
  end if;

  insert into public.staff_tenant_memberships (
    id, tenant_id, staff_user_id, display_name, role, status, invited_at, accepted_at,
    disabled_at, archived_at, created_at, updated_at
  ) values (
    membership_record ->> 'id', target_tenant_id, target_staff_id, requested_display_name,
    membership_record ->> 'role', membership_record ->> 'status',
    nullif(membership_record ->> 'invited_at', '')::timestamptz,
    nullif(membership_record ->> 'accepted_at', '')::timestamptz,
    nullif(membership_record ->> 'disabled_at', '')::timestamptz,
    nullif(membership_record ->> 'archived_at', '')::timestamptz,
    (membership_record ->> 'created_at')::timestamptz,
    (membership_record ->> 'updated_at')::timestamptz
  )
  on conflict (tenant_id, staff_user_id) do update set
    display_name = excluded.display_name,
    role = excluded.role,
    status = excluded.status,
    invited_at = excluded.invited_at,
    accepted_at = excluded.accepted_at,
    disabled_at = excluded.disabled_at,
    archived_at = excluded.archived_at,
    updated_at = excluded.updated_at
  returning * into saved_membership;

  return jsonb_build_object(
    'staff_user', to_jsonb(saved_staff) || jsonb_build_object(
      'display_name', saved_membership.display_name,
      'role', saved_membership.role
    ),
    'membership', to_jsonb(saved_membership) - 'display_name'
  );
end;
$$;

revoke all on function public.list_operations_staff_members(text)
  from public, anon, authenticated;
revoke all on function public.list_staff_management_records(text)
  from public, anon, authenticated;
revoke all on function public.create_staff_management_record(jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.save_staff_management_record(jsonb, jsonb)
  from public, anon, authenticated;

grant execute on function public.list_operations_staff_members(text) to service_role;
grant execute on function public.list_staff_management_records(text) to service_role;
grant execute on function public.create_staff_management_record(jsonb, jsonb) to service_role;
grant execute on function public.save_staff_management_record(jsonb, jsonb) to service_role;
