alter table public.tenant_workspace_settings
  add column if not exists line_experience jsonb not null default '{}'::jsonb;

comment on column public.tenant_workspace_settings.line_experience is
  'Tenant-owned LINE menu labels, actions, guide replies, and consultation entry text.';
