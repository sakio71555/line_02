#!/usr/bin/env node
import {
  SafeConfigError,
  checkPsqlVersion,
  loadStagingDatabaseConfig,
  resolvePsqlPath,
  runPsql
} from "./lib/staging-psql.mjs";

const authUsers = {
  tenantA: "11111111-1111-1111-1111-111111111111",
  tenantB: "22222222-2222-2222-2222-222222222222",
  inactiveStaff: "33333333-3333-3333-3333-333333333333"
};

const readChecks = [
  {
    label: "auth uid A resolves",
    authUserId: authUsers.tenantA,
    sql: `select count(*) from (select auth.uid()::text as uid) auth_context
      where uid = '${authUsers.tenantA}'`,
    expected: 1
  },
  {
    label: "tenant A staff reads tenant A customer",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.customers where id = 'customer_rls_a'",
    expected: 1
  },
  {
    label: "tenant A staff cannot read tenant B customer",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.customers where id = 'customer_rls_b'",
    expected: 0
  },
  {
    label: "tenant A staff reads tenant A message",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.messages where id = 'message_rls_a'",
    expected: 1
  },
  {
    label: "tenant A staff cannot read tenant B message",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.messages where id = 'message_rls_b'",
    expected: 0
  },
  {
    label: "tenant A staff reads tenant A alert",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.alerts where id = 'alert_rls_a'",
    expected: 1
  },
  {
    label: "tenant A staff cannot read tenant B alert",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.alerts where id = 'alert_rls_b'",
    expected: 0
  },
  {
    label: "tenant A staff reads allowed tenant A knowledge",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.knowledge_pages where id = 'knowledge_rls_a_allowed'",
    expected: 1
  },
  {
    label: "tenant A staff cannot read disallowed tenant A knowledge",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.knowledge_pages where id = 'knowledge_rls_a_hidden'",
    expected: 0
  },
  {
    label: "tenant A staff cannot read tenant B knowledge",
    authUserId: authUsers.tenantA,
    sql: "select count(*) from public.knowledge_pages where id = 'knowledge_rls_b_allowed'",
    expected: 0
  },
  {
    label: "tenant B staff reads tenant B customer",
    authUserId: authUsers.tenantB,
    sql: "select count(*) from public.customers where id = 'customer_rls_b'",
    expected: 1
  },
  {
    label: "tenant B staff cannot read tenant A customer",
    authUserId: authUsers.tenantB,
    sql: "select count(*) from public.customers where id = 'customer_rls_a'",
    expected: 0
  },
  {
    label: "tenant B staff reads tenant B message",
    authUserId: authUsers.tenantB,
    sql: "select count(*) from public.messages where id = 'message_rls_b'",
    expected: 1
  },
  {
    label: "tenant B staff reads tenant B alert",
    authUserId: authUsers.tenantB,
    sql: "select count(*) from public.alerts where id = 'alert_rls_b'",
    expected: 1
  },
  {
    label: "tenant B staff reads allowed tenant B knowledge",
    authUserId: authUsers.tenantB,
    sql: "select count(*) from public.knowledge_pages where id = 'knowledge_rls_b_allowed'",
    expected: 1
  },
  {
    label: "tenant B staff cannot read disabled tenant A membership",
    authUserId: authUsers.tenantB,
    sql: "select count(*) from public.staff_tenant_memberships where id = 'membership_rls_b_inactive_a'",
    expected: 0
  },
  {
    label: "inactive staff cannot read own staff row",
    authUserId: authUsers.inactiveStaff,
    sql: "select count(*) from public.staff_users where id = 'staff_rls_inactive'",
    expected: 0
  },
  {
    label: "inactive staff cannot read tenant A customer",
    authUserId: authUsers.inactiveStaff,
    sql: "select count(*) from public.customers where id = 'customer_rls_a'",
    expected: 0
  },
  {
    label: "inactive staff cannot read tenant A membership",
    authUserId: authUsers.inactiveStaff,
    sql: "select count(*) from public.staff_tenant_memberships where id = 'membership_rls_inactive_staff_a'",
    expected: 0
  }
];

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
    const psqlPath = args.psql ?? resolvePsqlPath();

    if (!psqlPath) {
      throw new SafeConfigError("psql is not available");
    }

    const version = checkPsqlVersion(psqlPath);

    if (!version.ok) {
      throw new SafeConfigError("psql version check failed");
    }

    if (args.checkConfigOnly) {
      console.log("[ok] staging authenticated RLS smoke config parsed");
      console.log(`[ok] psql path: ${psqlPath}`);
      console.log(`[ok] ${version.version}`);
      console.log("[info] staging authenticated RLS queries not executed in check-config-only mode");
      return;
    }

    const context = {
      psqlPath,
      connectionEnv: config.env,
      redactions: config.redactions
    };
    let failed = false;

    for (const check of readChecks) {
      failed = assertAuthenticatedCount(context, check) || failed;
    }

    failed = assertAuthenticatedCount(context, {
      label: "anon/public broad grants remain zero",
      authUserId: authUsers.tenantA,
      sql: broadAnonPublicGrantCountSql(),
      expected: 0,
      asServiceRole: true
    }) || failed;

    failed = assertAuthenticatedCount(context, {
      label: "tenant A write insert allowed in rollback transaction",
      authUserId: authUsers.tenantA,
      sql: allowedInsertCountSql(),
      expected: 1,
      writeCheck: true
    }) || failed;

    failed = assertAuthenticatedCount(context, {
      label: "tenant A write update allowed in rollback transaction",
      authUserId: authUsers.tenantA,
      sql: allowedUpdateCountSql(),
      expected: 1,
      writeCheck: true
    }) || failed;

    failed = assertAuthenticatedCount(context, {
      label: "tenant A wrong-tenant update returns no rows",
      authUserId: authUsers.tenantA,
      sql: wrongTenantUpdateCountSql(),
      expected: 0,
      writeCheck: true
    }) || failed;

    failed = assertExpectedDeniedInsert(context) || failed;

    if (failed) {
      process.exit(1);
    }

    console.log("[ok] authenticated role/JWT RLS smoke completed");
    console.log("[ok] tenant A/B read separation verified");
    console.log("[ok] inactive staff and inactive membership denial verified");
    console.log("[ok] allowed_for_ai=false knowledge denial verified");
    console.log("[ok] write smoke used rollback-only dummy transactions");
    console.log("[ok] no Supabase Auth user was created");
  } catch (error) {
    console.log("[no-go] staging authenticated RLS smoke was not completed");
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

function assertAuthenticatedCount(context, check) {
  const actual = runNumberQuery(context, authenticatedScalarSql(check));

  if (actual === check.expected) {
    console.log(`[ok] ${check.label}: ${actual}`);
    return false;
  }

  console.log(`[ng] ${check.label}: expected ${check.expected}, got ${actual}`);
  return true;
}

function assertExpectedDeniedInsert(context) {
  const sql = authenticatedScalarSql({
    authUserId: authUsers.tenantA,
    sql: deniedInsertSql(),
    writeCheck: true
  });
  const result = runPsql({
    ...context,
    args: [
      "--no-psqlrc",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-t",
      "-A",
      "-c",
      sql
    ]
  });

  if (result.status !== 0) {
    console.log("[ok] tenant A wrong-tenant insert denied in rollback transaction");
    return false;
  }

  console.log("[ng] tenant A wrong-tenant insert unexpectedly succeeded");
  return true;
}

function runNumberQuery(context, sql) {
  const result = runPsql({
    ...context,
    args: [
      "--no-psqlrc",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-t",
      "-A",
      "-c",
      sql
    ]
  });

  if (result.status !== 0 || result.error) {
    throw new SafeConfigError("authenticated RLS smoke query failed");
  }

  const value = Number.parseInt(extractResultMarker(result.stdout), 10);

  if (!Number.isFinite(value)) {
    throw new SafeConfigError("authenticated RLS smoke returned an unreadable count");
  }

  return value;
}

function authenticatedScalarSql(check) {
  if (check.asServiceRole) {
    return `select '__rls_result__=' || (${check.sql});`;
  }

  const markerQuery = check.writeCheck
    ? `${check.sql};`
    : `select '__rls_result__=' || (${check.sql});`;

  return `
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '${escapeSqlLiteral(check.authUserId)}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
${markerQuery}
rollback;
`;
}

function extractResultMarker(stdout) {
  const markerLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("__rls_result__="));

  if (!markerLine) {
    throw new SafeConfigError("authenticated RLS smoke result marker was missing");
  }

  return markerLine.slice("__rls_result__=".length);
}

function allowedInsertCountSql() {
  return `with inserted as (
    insert into public.customers (
      id,
      tenant_id,
      line_user_id,
      display_name,
      response_mode,
      status
    )
    values (
      'customer_rls_write_allowed_a',
      'tenant_rls_a',
      'dummy_line_user_rls_write_allowed_a',
      'RLS Smoke Write Allowed A',
      'human_required',
      'active'
    )
    returning 1
  )
  select '__rls_result__=' || count(*) from inserted`;
}

function allowedUpdateCountSql() {
  return `with updated as (
    update public.customers
    set display_name = 'RLS Smoke Customer A Updated In Rollback'
    where id = 'customer_rls_a'
    returning 1
  )
  select '__rls_result__=' || count(*) from updated`;
}

function wrongTenantUpdateCountSql() {
  return `with updated as (
    update public.customers
    set display_name = 'RLS Smoke Customer B Wrong Tenant Update'
    where id = 'customer_rls_b'
    returning 1
  )
  select '__rls_result__=' || count(*) from updated`;
}

function deniedInsertSql() {
  return `with inserted as (
    insert into public.customers (
      id,
      tenant_id,
      line_user_id,
      display_name,
      response_mode,
      status
    )
    values (
      'customer_rls_write_denied_b',
      'tenant_rls_b',
      'dummy_line_user_rls_write_denied_b',
      'RLS Smoke Write Denied B',
      'human_required',
      'active'
    )
    returning 1
  )
  select '__rls_result__=' || count(*) from inserted`;
}

function broadAnonPublicGrantCountSql() {
  return `select count(*)::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'tenants',
        'tenant_line_settings',
        'tenant_ai_settings',
        'customers',
        'messages',
        'alerts',
        'knowledge_pages',
        'staff_users',
        'staff_tenant_memberships'
      )
      and upper(grantee) in ('ANON', 'PUBLIC')
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')`;
}

function escapeSqlLiteral(value) {
  return value.replaceAll("'", "''");
}

function toSafeErrorMessage(error) {
  if (error instanceof SafeConfigError) {
    return error.message;
  }

  return "unexpected error";
}

function printUsage() {
  console.log(`Usage:
  node scripts/dev-loop/smoke-staging-authenticated-rls.mjs --env .env.staging [--psql /usr/local/opt/libpq/bin/psql]

This helper verifies authenticated role RLS behavior with SET LOCAL ROLE
authenticated and request.jwt.claim.sub in rollback-only transactions. It does
not create Supabase Auth users and does not print connection strings, project
refs, SQL result dumps, or env values.`);
}

main();
