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
  requested_role text := coalesce(nullif(trim(membership_record ->> 'role'), ''), 'staff');
  effective_role text;
  tenant_membership_count integer := 0;
  saved_staff public.staff_users%rowtype;
  saved_membership public.staff_tenant_memberships%rowtype;
  accepted_identity boolean := false;
begin
  if target_tenant_id is null or requested_staff_id is null or normalized_email is null then
    raise exception using errcode = '22023', message = 'invalid_staff_management_record';
  end if;

  if requested_role not in ('owner', 'manager', 'staff') then
    raise exception using errcode = '22023', message = 'invalid_staff_role';
  end if;

  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(target_tenant_id, 0));
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(normalized_email, 0));

  select count(*)
  into tenant_membership_count
  from public.staff_tenant_memberships stm
  where stm.tenant_id = target_tenant_id;

  effective_role := case when tenant_membership_count = 0 then 'owner' else requested_role end;

  if exists (
    select 1
    from public.staff_tenant_memberships stm
    join public.staff_users su on su.id = stm.staff_user_id
    where stm.tenant_id = target_tenant_id
      and lower(su.email) = normalized_email
  ) then
    raise exception using errcode = '23505', message = 'staff_email_already_registered';
  end if;

  select su.*
  into saved_staff
  from public.staff_users su
  where lower(su.email) = normalized_email
  order by (su.auth_user_id is not null) desc, su.created_at asc, su.id asc
  limit 1;

  if saved_staff.id is null then
    insert into public.staff_users (
      id,
      tenant_id,
      auth_user_id,
      email,
      display_name,
      role,
      status,
      line_user_id,
      is_active,
      last_login_at,
      disabled_at,
      archived_at,
      created_at,
      updated_at
    ) values (
      requested_staff_id,
      target_tenant_id,
      nullif(staff_record ->> 'auth_user_id', ''),
      normalized_email,
      staff_record ->> 'display_name',
      effective_role,
      coalesce(staff_record ->> 'status', 'active'),
      nullif(staff_record ->> 'line_user_id', ''),
      coalesce((staff_record ->> 'is_active')::boolean, true),
      nullif(staff_record ->> 'last_login_at', '')::timestamptz,
      nullif(staff_record ->> 'disabled_at', '')::timestamptz,
      nullif(staff_record ->> 'archived_at', '')::timestamptz,
      coalesce(nullif(staff_record ->> 'created_at', '')::timestamptz, now()),
      coalesce(nullif(staff_record ->> 'updated_at', '')::timestamptz, now())
    )
    returning * into saved_staff;
  else
    select exists (
      select 1
      from public.staff_tenant_memberships stm
      where stm.staff_user_id = saved_staff.id
        and stm.status = 'active'
        and stm.accepted_at is not null
    )
      and saved_staff.auth_user_id is not null
      and saved_staff.status = 'active'
      and saved_staff.is_active = true
    into accepted_identity;
  end if;

  insert into public.staff_tenant_memberships (
    id,
    tenant_id,
    staff_user_id,
    role,
    status,
    invited_at,
    accepted_at,
    disabled_at,
    archived_at,
    created_at,
    updated_at
  ) values (
    membership_record ->> 'id',
    target_tenant_id,
    saved_staff.id,
    effective_role,
    case when accepted_identity then 'active' else 'invited' end,
    coalesce(nullif(membership_record ->> 'invited_at', '')::timestamptz, now()),
    case when accepted_identity then now() else null end,
    null,
    null,
    coalesce(nullif(membership_record ->> 'created_at', '')::timestamptz, now()),
    coalesce(nullif(membership_record ->> 'updated_at', '')::timestamptz, now())
  )
  returning * into saved_membership;

  return jsonb_build_object(
    'staff_user', to_jsonb(saved_staff),
    'membership', to_jsonb(saved_membership)
  );
end;
$$;

revoke all on function public.create_staff_management_record(jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_staff_management_record(jsonb, jsonb) to service_role;
