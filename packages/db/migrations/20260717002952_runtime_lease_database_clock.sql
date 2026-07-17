revoke all on function public.try_acquire_runtime_lease(
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from public, anon, authenticated, service_role;
drop function public.try_acquire_runtime_lease(text, text, text, timestamptz, timestamptz);

revoke all on function public.renew_runtime_lease(
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from public, anon, authenticated, service_role;
drop function public.renew_runtime_lease(text, text, text, timestamptz, timestamptz);

create function public.try_acquire_runtime_lease(
  p_tenant_id text,
  p_lease_key text,
  p_holder_id text,
  p_lease_ttl_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  acquired boolean;
  lease_now timestamptz;
  lease_expires_at timestamptz;
begin
  if p_lease_ttl_seconds is null
     or p_lease_ttl_seconds < 1
     or p_lease_ttl_seconds > 86400 then
    raise exception 'runtime_lease_ttl_invalid';
  end if;

  lease_now := clock_timestamp();
  lease_expires_at := lease_now + make_interval(secs => p_lease_ttl_seconds);

  insert into public.runtime_leases (
    tenant_id,
    lease_key,
    holder_id,
    expires_at,
    updated_at
  )
  values (
    p_tenant_id,
    p_lease_key,
    p_holder_id,
    lease_expires_at,
    lease_now
  )
  on conflict (tenant_id, lease_key) do update
  set holder_id = excluded.holder_id,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
  where public.runtime_leases.expires_at <= lease_now
     or public.runtime_leases.holder_id = p_holder_id
  returning true into acquired;

  return coalesce(acquired, false);
end;
$$;

create function public.renew_runtime_lease(
  p_tenant_id text,
  p_lease_key text,
  p_holder_id text,
  p_lease_ttl_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  lease_now timestamptz;
  renewed boolean;
begin
  if p_lease_ttl_seconds is null
     or p_lease_ttl_seconds < 1
     or p_lease_ttl_seconds > 86400 then
    raise exception 'runtime_lease_ttl_invalid';
  end if;

  lease_now := clock_timestamp();

  update public.runtime_leases
  set expires_at = lease_now + make_interval(secs => p_lease_ttl_seconds),
      updated_at = lease_now
  where tenant_id = p_tenant_id
    and lease_key = p_lease_key
    and holder_id = p_holder_id
    and expires_at > lease_now
  returning true into renewed;

  return coalesce(renewed, false);
end;
$$;

revoke all on function public.try_acquire_runtime_lease(text, text, text, integer)
from public, anon, authenticated;
grant execute on function public.try_acquire_runtime_lease(text, text, text, integer)
to service_role;

revoke all on function public.renew_runtime_lease(text, text, text, integer)
from public, anon, authenticated;
grant execute on function public.renew_runtime_lease(text, text, text, integer)
to service_role;
