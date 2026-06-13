-- Initial non-secret seed for the first tenant.
-- Do not seed LINE tokens, OpenAI keys, Supabase service keys, or other secrets.

insert into tenants (id, slug, name, official_domain, status)
values ('tenant_amamihome', 'amamihome', 'アマミホーム', 'amamihome.net', 'active')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  official_domain = excluded.official_domain,
  status = excluded.status,
  updated_at = now();
