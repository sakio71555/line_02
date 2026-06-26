#!/usr/bin/env node
import {
  SafeConfigError,
  checkPsqlVersion,
  loadStagingDatabaseConfig,
  resolvePsqlPath,
  runPsql
} from "./lib/staging-psql.mjs";

const seedCounts = {
  tenants: 2,
  staff_users: 3,
  staff_tenant_memberships: 4,
  customers: 2,
  messages: 2,
  alerts: 2,
  knowledge_pages: 4
};

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printUsage();
      process.exit(0);
    }

    const repoRoot = process.cwd();
    const envFile = args.env ?? ".env.staging";
    const config = loadStagingDatabaseConfig({ repoRoot, envFile });

    if (args.checkConfigOnly) {
      console.log("[ok] staging authenticated RLS seed config parsed");
      console.log("[info] psql version not checked in check-config-only mode");
      console.log("[info] staging seed queries not executed in check-config-only mode");
      return;
    }

    const psqlPath = args.psql ?? resolvePsqlPath();

    if (!psqlPath) {
      throw new SafeConfigError("psql is not available");
    }

    const version = checkPsqlVersion(psqlPath);

    if (!version.ok) {
      throw new SafeConfigError("psql version check failed");
    }

    const result = runPsql({
      psqlPath,
      connectionEnv: config.env,
      redactions: config.redactions,
      args: [
        "--no-psqlrc",
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-c",
        seedSql()
      ]
    });

    if (result.status !== 0 || result.error) {
      throw new SafeConfigError("staging authenticated RLS seed failed");
    }

    console.log("[ok] staging authenticated RLS dummy seed completed");

    for (const [label, expected] of Object.entries(seedCounts)) {
      console.log(`[ok] dummy ${label}: ${expected}`);
    }

    console.log("[ok] dummy auth users only; no Supabase Auth users were created");
    console.log("[ok] no real customer, LINE userId, phone, email, or address was seeded");
  } catch (error) {
    console.log("[no-go] staging authenticated RLS dummy seed was not completed");
    console.log(`[no-go] ${toSafeErrorMessage(error)}`);
    process.exit(1);
  }
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--check-config-only") {
      args.checkConfigOnly = true;
    } else if (token === "--env") {
      args.env = argv[index + 1];
      index += 1;
    } else if (token === "--psql") {
      args.psql = argv[index + 1];
      index += 1;
    } else {
      throw new SafeConfigError(`unknown argument: ${token}`);
    }
  }

  return args;
}

function seedSql() {
  return `
insert into public.tenants (id, slug, name, official_domain, status)
values
  ('tenant_rls_a', 'rls-a', 'RLS Smoke Tenant A', 'rls-a.invalid', 'active'),
  ('tenant_rls_b', 'rls-b', 'RLS Smoke Tenant B', 'rls-b.invalid', 'active')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  official_domain = excluded.official_domain,
  status = excluded.status,
  updated_at = now();

insert into public.staff_users (
  id,
  tenant_id,
  auth_user_id,
  email,
  display_name,
  role,
  status,
  is_active
)
values
  (
    'staff_rls_a',
    'tenant_rls_a',
    '11111111-1111-1111-1111-111111111111',
    'staff-rls-a@example.invalid',
    'RLS Smoke Staff A',
    'manager',
    'active',
    true
  ),
  (
    'staff_rls_b',
    'tenant_rls_b',
    '22222222-2222-2222-2222-222222222222',
    'staff-rls-b@example.invalid',
    'RLS Smoke Staff B',
    'manager',
    'active',
    true
  ),
  (
    'staff_rls_inactive',
    'tenant_rls_a',
    '33333333-3333-3333-3333-333333333333',
    'staff-rls-inactive@example.invalid',
    'RLS Smoke Inactive Staff',
    'staff',
    'disabled',
    false
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  auth_user_id = excluded.auth_user_id,
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  status = excluded.status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.staff_tenant_memberships (
  id,
  tenant_id,
  staff_user_id,
  role,
  status,
  accepted_at
)
values
  ('membership_rls_a_active', 'tenant_rls_a', 'staff_rls_a', 'manager', 'active', now()),
  ('membership_rls_b_active', 'tenant_rls_b', 'staff_rls_b', 'manager', 'active', now()),
  ('membership_rls_b_inactive_a', 'tenant_rls_a', 'staff_rls_b', 'staff', 'disabled', null),
  ('membership_rls_inactive_staff_a', 'tenant_rls_a', 'staff_rls_inactive', 'staff', 'active', now())
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  staff_user_id = excluded.staff_user_id,
  role = excluded.role,
  status = excluded.status,
  accepted_at = excluded.accepted_at,
  updated_at = now();

insert into public.customers (
  id,
  tenant_id,
  line_user_id,
  display_name,
  response_mode,
  status,
  last_message_at,
  last_customer_message_at
)
values
  (
    'customer_rls_a',
    'tenant_rls_a',
    'dummy_line_user_rls_a',
    'RLS Smoke Customer A',
    'human_required',
    'active',
    now() - interval '20 minutes',
    now() - interval '20 minutes'
  ),
  (
    'customer_rls_b',
    'tenant_rls_b',
    'dummy_line_user_rls_b',
    'RLS Smoke Customer B',
    'human_active',
    'active',
    now() - interval '10 minutes',
    now() - interval '10 minutes'
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  line_user_id = excluded.line_user_id,
  display_name = excluded.display_name,
  response_mode = excluded.response_mode,
  status = excluded.status,
  last_message_at = excluded.last_message_at,
  last_customer_message_at = excluded.last_customer_message_at,
  updated_at = now();

insert into public.messages (
  id,
  tenant_id,
  customer_id,
  line_message_id,
  role,
  message_type,
  body,
  created_at
)
values
  (
    'message_rls_a',
    'tenant_rls_a',
    'customer_rls_a',
    'dummy_line_message_rls_a',
    'customer',
    'text',
    'RLS smoke dummy message A',
    now() - interval '20 minutes'
  ),
  (
    'message_rls_b',
    'tenant_rls_b',
    'customer_rls_b',
    'dummy_line_message_rls_b',
    'customer',
    'text',
    'RLS smoke dummy message B',
    now() - interval '10 minutes'
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  customer_id = excluded.customer_id,
  line_message_id = excluded.line_message_id,
  role = excluded.role,
  message_type = excluded.message_type,
  body = excluded.body,
  created_at = excluded.created_at;

insert into public.alerts (
  id,
  tenant_id,
  customer_id,
  alert_type,
  status,
  severity,
  message,
  triggered_at
)
values
  (
    'alert_rls_a',
    'tenant_rls_a',
    'customer_rls_a',
    'unreplied_customer_message',
    'open',
    'medium',
    'RLS smoke dummy alert A',
    now() - interval '20 minutes'
  ),
  (
    'alert_rls_b',
    'tenant_rls_b',
    'customer_rls_b',
    'unreplied_customer_message',
    'open',
    'medium',
    'RLS smoke dummy alert B',
    now() - interval '10 minutes'
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  customer_id = excluded.customer_id,
  alert_type = excluded.alert_type,
  status = excluded.status,
  severity = excluded.severity,
  message = excluded.message,
  triggered_at = excluded.triggered_at,
  updated_at = now();

insert into public.knowledge_pages (
  id,
  tenant_id,
  url,
  category,
  source_type,
  title,
  content,
  checksum,
  allowed_for_ai,
  last_crawled_at
)
values
  (
    'knowledge_rls_a_allowed',
    'tenant_rls_a',
    'https://rls-a.invalid/allowed',
    'RLS smoke',
    'official_site',
    'RLS Smoke Allowed A',
    'RLS smoke allowed tenant A content',
    'rls-a-allowed',
    true,
    now()
  ),
  (
    'knowledge_rls_a_hidden',
    'tenant_rls_a',
    'https://rls-a.invalid/hidden',
    'RLS smoke',
    'official_site',
    'RLS Smoke Hidden A',
    'RLS smoke hidden tenant A content',
    'rls-a-hidden',
    false,
    now()
  ),
  (
    'knowledge_rls_b_allowed',
    'tenant_rls_b',
    'https://rls-b.invalid/allowed',
    'RLS smoke',
    'official_site',
    'RLS Smoke Allowed B',
    'RLS smoke allowed tenant B content',
    'rls-b-allowed',
    true,
    now()
  ),
  (
    'knowledge_rls_b_hidden',
    'tenant_rls_b',
    'https://rls-b.invalid/hidden',
    'RLS smoke',
    'official_site',
    'RLS Smoke Hidden B',
    'RLS smoke hidden tenant B content',
    'rls-b-hidden',
    false,
    now()
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  url = excluded.url,
  category = excluded.category,
  source_type = excluded.source_type,
  title = excluded.title,
  content = excluded.content,
  checksum = excluded.checksum,
  allowed_for_ai = excluded.allowed_for_ai,
  last_crawled_at = excluded.last_crawled_at,
  updated_at = now();
`;
}

function toSafeErrorMessage(error) {
  if (error instanceof SafeConfigError) {
    return error.message;
  }

  return "unexpected error";
}

function printUsage() {
  console.log(`Usage:
  node scripts/dev-loop/seed-staging-rls-smoke-data.mjs --env .env.staging [--psql /usr/local/opt/libpq/bin/psql]

This helper idempotently seeds dummy RLS smoke data in staging only. It does not
create Supabase Auth users and does not print connection strings, project refs,
SQL result dumps, or env values.`);
}

main();
