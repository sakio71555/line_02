-- Loop 001: initial schema for the AI customer chart LINE CRM.
-- This migration is written for Supabase PostgreSQL but is not applied in Loop 001.
-- RLS policy definitions are intentionally deferred; every tenant-owned table is
-- shaped so future RLS policies can enforce tenant_id isolation.

create table if not exists tenants (
  id text primary key,
  slug text not null unique,
  name text not null,
  official_domain text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_line_settings (
  tenant_id text primary key references tenants(id) on delete cascade,
  channel_id text,
  channel_secret_encrypted text,
  channel_access_token_encrypted text,
  webhook_secret_path text not null,
  liff_id text,
  staff_line_group_id text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_ai_settings (
  tenant_id text primary key references tenants(id) on delete cascade,
  provider text not null default 'openai' check (provider in ('openai')),
  model text,
  summary_enabled boolean not null default true,
  reply_draft_enabled boolean not null default true,
  auto_reply_enabled boolean not null default false,
  rag_enabled boolean not null default false,
  allowed_source_policy text not null default 'approved_tenant_sources_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_users (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  line_user_id text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table if not exists customers (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  line_user_id text,
  display_name text,
  picture_url text,
  phone text,
  email text,
  postal_code text,
  address text,
  interest_tags text[] not null default '{}',
  response_mode text not null default 'bot_auto' check (
    response_mode in ('bot_auto', 'human_required', 'human_active', 'emergency', 'closed')
  ),
  status text not null default 'new' check (status in ('new', 'active', 'archived')),
  last_message_at timestamptz,
  last_customer_message_at timestamptz,
  last_staff_reply_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_tenant_line_user_id_unique
  on customers (tenant_id, line_user_id)
  where line_user_id is not null;

create index if not exists customers_tenant_id_idx on customers (tenant_id);
create index if not exists customers_tenant_response_mode_idx on customers (tenant_id, response_mode);

create table if not exists consultations (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  subject text not null,
  category text not null default 'other' check (
    category in (
      'new_build',
      'land',
      'built_house',
      'reservation',
      'after_support',
      'document_request',
      'other'
    )
  ),
  status text not null default 'open' check (
    status in ('open', 'waiting_customer', 'waiting_staff', 'closed')
  ),
  assigned_staff_user_id text references staff_users(id) on delete set null,
  priority integer not null default 0,
  summary text,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists consultations_tenant_customer_idx
  on consultations (tenant_id, customer_id);

create table if not exists messages (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  consultation_id text references consultations(id) on delete set null,
  line_message_id text,
  role text not null check (role in ('customer', 'bot', 'staff', 'system', 'ai')),
  message_type text not null default 'text' check (
    message_type in ('text', 'image', 'file', 'form', 'reservation', 'alert', 'summary')
  ),
  body text,
  media_storage_path text,
  staff_user_id text references staff_users(id) on delete set null,
  ai_generated boolean not null default false,
  sent_to_line_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists messages_tenant_line_message_id_unique
  on messages (tenant_id, line_message_id)
  where line_message_id is not null;

create index if not exists messages_tenant_customer_created_at_idx
  on messages (tenant_id, customer_id, created_at desc);

create index if not exists messages_tenant_consultation_created_at_idx
  on messages (tenant_id, consultation_id, created_at desc);

create table if not exists alerts (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  consultation_id text references consultations(id) on delete set null,
  alert_type text not null check (
    alert_type in ('unreplied', 'unreplied_customer_message', 'stale', 'emergency', 'ai_risk')
  ),
  status text not null default 'open' check (status in ('open', 'notified', 'resolved', 'dismissed')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  message text not null,
  triggered_at timestamptz not null default now(),
  notified_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alerts_tenant_status_severity_idx
  on alerts (tenant_id, status, severity);

create table if not exists knowledge_pages (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  url text not null,
  category text not null,
  source_type text not null check (source_type in ('official_site', 'faq', 'manual', 'campaign')),
  title text not null,
  content text not null,
  checksum text,
  allowed_for_ai boolean not null default false,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_pages_tenant_id_idx on knowledge_pages (tenant_id);
create index if not exists knowledge_pages_tenant_allowed_for_ai_idx
  on knowledge_pages (tenant_id, allowed_for_ai);

create table if not exists construction_cases (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  source_url text not null,
  title text not null,
  description text,
  style_tags text[] not null default '{}',
  family_tags text[] not null default '{}',
  price_band_label text,
  area_label text,
  thumbnail_storage_path text,
  published_at timestamptz,
  allowed_for_recommendation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_cases_tenant_id_idx on construction_cases (tenant_id);
create index if not exists construction_cases_tenant_recommendation_idx
  on construction_cases (tenant_id, allowed_for_recommendation);

create table if not exists reservations (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  consultation_id text references consultations(id) on delete set null,
  reservation_type text not null check (
    reservation_type in ('model_home', 'online_consultation', 'office_visit', 'after_support')
  ),
  preferred_dates jsonb not null default '[]'::jsonb,
  confirmed_start_at timestamptz,
  confirmed_end_at timestamptz,
  status text not null default 'requested' check (
    status in ('requested', 'confirmed', 'cancelled', 'completed')
  ),
  staff_user_id text references staff_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_tenant_customer_idx
  on reservations (tenant_id, customer_id);

create index if not exists reservations_tenant_status_idx
  on reservations (tenant_id, status);
