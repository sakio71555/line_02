create table if not exists public.runtime_leases (
  tenant_id text not null references public.tenants(id) on delete cascade,
  lease_key text not null,
  holder_id text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, lease_key)
);

alter table public.runtime_leases enable row level security;
alter table public.runtime_leases force row level security;

revoke all on table public.runtime_leases from public, anon, authenticated;
grant select, insert, update, delete on table public.runtime_leases to service_role;

create or replace function public.try_acquire_runtime_lease(
  p_tenant_id text,
  p_lease_key text,
  p_holder_id text,
  p_expires_at timestamptz,
  p_now timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  acquired boolean;
begin
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
    p_expires_at,
    p_now
  )
  on conflict (tenant_id, lease_key) do update
  set holder_id = excluded.holder_id,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
  where public.runtime_leases.expires_at <= p_now
     or public.runtime_leases.holder_id = p_holder_id
  returning true into acquired;

  return coalesce(acquired, false);
end;
$$;

create or replace function public.release_runtime_lease(
  p_tenant_id text,
  p_lease_key text,
  p_holder_id text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with released as (
    delete from public.runtime_leases
    where tenant_id = p_tenant_id
      and lease_key = p_lease_key
      and holder_id = p_holder_id
    returning true
  )
  select coalesce((select true from released limit 1), false);
$$;

create or replace function public.renew_runtime_lease(
  p_tenant_id text,
  p_lease_key text,
  p_holder_id text,
  p_expires_at timestamptz,
  p_now timestamptz
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with renewed as (
    update public.runtime_leases
    set expires_at = p_expires_at,
        updated_at = p_now
    where tenant_id = p_tenant_id
      and lease_key = p_lease_key
      and holder_id = p_holder_id
      and expires_at > p_now
    returning true
  )
  select coalesce((select true from renewed limit 1), false);
$$;

revoke all on function public.try_acquire_runtime_lease(
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from public, anon, authenticated;
grant execute on function public.try_acquire_runtime_lease(
  text,
  text,
  text,
  timestamptz,
  timestamptz
) to service_role;

revoke all on function public.release_runtime_lease(text, text, text)
from public, anon, authenticated;
grant execute on function public.release_runtime_lease(text, text, text)
to service_role;

revoke all on function public.renew_runtime_lease(
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from public, anon, authenticated;
grant execute on function public.renew_runtime_lease(
  text,
  text,
  text,
  timestamptz,
  timestamptz
) to service_role;
