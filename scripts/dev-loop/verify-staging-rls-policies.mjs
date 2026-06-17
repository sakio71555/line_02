#!/usr/bin/env node
import {
  SafeConfigError,
  checkPsqlVersion,
  loadStagingDatabaseConfig,
  resolvePsqlPath,
  runPsql
} from "./lib/staging-psql.mjs";

const targetTables = [
  "tenants",
  "tenant_line_settings",
  "tenant_ai_settings",
  "customers",
  "messages",
  "alerts",
  "knowledge_pages",
  "staff_users",
  "staff_tenant_memberships"
];

const expectedPolicyNames = [
  "tenants_select_for_active_staff_membership",
  "tenant_line_settings_select_for_active_staff_membership",
  "tenant_ai_settings_select_for_active_staff_membership",
  "customers_select_for_active_staff_membership",
  "customers_insert_for_active_staff_membership",
  "customers_update_for_active_staff_membership",
  "messages_select_for_active_staff_membership",
  "messages_insert_for_active_staff_membership",
  "alerts_select_for_active_staff_membership",
  "alerts_insert_for_active_staff_membership",
  "alerts_update_for_active_staff_membership",
  "knowledge_pages_select_allowed_for_active_staff_membership",
  "staff_users_select_own_active_staff_row",
  "staff_tenant_memberships_select_own_active_memberships"
];

const authenticatedGrantMatrix = {
  tenants: ["SELECT"],
  tenant_line_settings: ["SELECT"],
  tenant_ai_settings: ["SELECT"],
  customers: ["SELECT", "INSERT", "UPDATE"],
  messages: ["SELECT", "INSERT"],
  alerts: ["SELECT", "INSERT", "UPDATE"],
  knowledge_pages: ["SELECT"],
  staff_users: ["SELECT"],
  staff_tenant_memberships: ["SELECT"]
};

const checkedPrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

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
      console.log("[ok] staging RLS policy verification config parsed");
      console.log(`[ok] psql path: ${psqlPath}`);
      console.log(`[ok] ${version.version}`);
      console.log("[info] RLS policy queries not executed in check-config-only mode");
      return;
    }

    const context = {
      psqlPath,
      connectionEnv: config.env,
      redactions: config.redactions
    };
    let failed = false;

    failed = assertCount({
      context,
      label: "target tables exist",
      sql: targetTablesExistSql(),
      expected: targetTables.length
    }) || failed;

    failed = assertCount({
      context,
      label: "RLS enabled tables",
      sql: rlsTableCountSql("relrowsecurity"),
      expected: targetTables.length
    }) || failed;

    failed = assertCount({
      context,
      label: "FORCE RLS tables",
      sql: rlsTableCountSql("relforcerowsecurity"),
      expected: targetTables.length
    }) || failed;

    failed = assertCount({
      context,
      label: "policies verified",
      sql: expectedPoliciesCountSql(),
      expected: expectedPolicyNames.length
    }) || failed;

    failed = assertCount({
      context,
      label: "authenticated policy roles",
      sql: expectedPoliciesWhereSql("'authenticated' = any(roles)"),
      expected: expectedPolicyNames.length
    }) || failed;

    failed = assertMinimum({
      context,
      label: "policies referencing auth.uid()",
      sql: policyExpressionCountSql("auth.uid()"),
      expectedMinimum: expectedPolicyNames.length
    }) || failed;

    failed = assertMinimum({
      context,
      label: "policies referencing staff_users",
      sql: policyExpressionCountSql("staff_users"),
      expectedMinimum: 12
    }) || failed;

    failed = assertMinimum({
      context,
      label: "policies referencing staff_tenant_memberships",
      sql: policyExpressionCountSql("staff_tenant_memberships"),
      expectedMinimum: 12
    }) || failed;

    failed = assertMinimum({
      context,
      label: "knowledge_pages allowed_for_ai=true policy",
      sql: policyExpressionCountSql("allowed_for_ai = true"),
      expectedMinimum: 1
    }) || failed;

    failed = assertCount({
      context,
      label: "broad anon/public table grants",
      sql: broadAnonPublicGrantsSql(),
      expected: 0
    }) || failed;

    failed = assertAuthenticatedGrantMatrix(context) || failed;
    failed = assertServiceRoleGrants(context) || failed;

    if (failed) {
      process.exit(1);
    }
  } catch (error) {
    console.log("[no-go] staging RLS policy verification was not completed");
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

function assertAuthenticatedGrantMatrix(context) {
  let failed = false;

  for (const table of targetTables) {
    const expected = authenticatedGrantMatrix[table] ?? [];

    for (const privilege of checkedPrivileges) {
      const actual = runBooleanQuery(
        context,
        `select has_table_privilege('authenticated', 'public.${escapeSqlLiteral(table)}', '${privilege}');`
      );
      const shouldHavePrivilege = expected.includes(privilege);

      if (actual === shouldHavePrivilege) {
        continue;
      }

      console.log(`[ng] authenticated ${privilege.toLowerCase()} grant mismatch on ${table}`);
      failed = true;
    }
  }

  if (!failed) {
    console.log("[ok] authenticated minimal grants verified");
  }

  return failed;
}

function assertServiceRoleGrants(context) {
  let failed = false;

  failed = assertBoolean({
    context,
    label: "service_role has usage on public schema",
    sql: "select has_schema_privilege('service_role', 'public', 'USAGE');"
  }) || failed;

  for (const table of targetTables) {
    for (const privilege of checkedPrivileges) {
      failed = assertBoolean({
        context,
        label: `service_role can ${privilege.toLowerCase()} ${table}`,
        sql: `select has_table_privilege('service_role', 'public.${escapeSqlLiteral(table)}', '${privilege}');`
      }) || failed;
    }
  }

  if (!failed) {
    console.log("[ok] service_role grants remain usable");
  }

  return failed;
}

function assertBoolean(input) {
  if (runBooleanQuery(input.context, input.sql)) {
    return false;
  }

  console.log(`[ng] ${input.label}`);
  return true;
}

function assertCount(input) {
  const actual = runNumberQuery(input.context, input.sql);

  if (actual === input.expected) {
    console.log(`[ok] ${input.label}: ${actual}/${input.expected}`);
    return false;
  }

  console.log(`[ng] ${input.label}: expected ${input.expected}, got ${actual}`);
  return true;
}

function assertMinimum(input) {
  const actual = runNumberQuery(input.context, input.sql);

  if (actual >= input.expectedMinimum) {
    console.log(`[ok] ${input.label}: ${actual}`);
    return false;
  }

  console.log(`[ng] ${input.label}: expected >= ${input.expectedMinimum}, got ${actual}`);
  return true;
}

function runBooleanQuery(context, sql) {
  return runSingleValueQuery(context, sql) === "t";
}

function runNumberQuery(context, sql) {
  const value = Number.parseInt(runSingleValueQuery(context, sql), 10);

  if (!Number.isFinite(value)) {
    throw new SafeConfigError("RLS policy verification returned an unreadable count");
  }

  return value;
}

function runSingleValueQuery(context, sql) {
  const result = runPsql({
    ...context,
    args: [
      "--no-psqlrc",
      "-v",
      "ON_ERROR_STOP=1",
      "-t",
      "-A",
      "-c",
      sql
    ]
  });

  if (result.status !== 0 || result.error) {
    throw new SafeConfigError("RLS policy verification query failed");
  }

  return result.stdout.trim();
}

function targetTablesExistSql() {
  return `select count(*)::text
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (${sqlLiteralList(targetTables)});`;
}

function rlsTableCountSql(columnName) {
  return `select count(*)::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (${sqlLiteralList(targetTables)})
      and c.${columnName} = true;`;
}

function expectedPoliciesCountSql() {
  return `select count(*)::text
    from pg_policies
    where schemaname = 'public'
      and policyname in (${sqlLiteralList(expectedPolicyNames)});`;
}

function expectedPoliciesWhereSql(condition) {
  return `select count(*)::text
    from pg_policies
    where schemaname = 'public'
      and policyname in (${sqlLiteralList(expectedPolicyNames)})
      and ${condition};`;
}

function policyExpressionCountSql(pattern) {
  return expectedPoliciesWhereSql(
    `(coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%${escapeSqlLike(pattern)}%'`
  );
}

function broadAnonPublicGrantsSql() {
  return `select count(*)::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (${sqlLiteralList(targetTables)})
      and upper(grantee) in ('ANON', 'PUBLIC')
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');`;
}

function sqlLiteralList(values) {
  return values.map((value) => `'${escapeSqlLiteral(value)}'`).join(", ");
}

function escapeSqlLiteral(value) {
  return value.replaceAll("'", "''");
}

function escapeSqlLike(value) {
  return escapeSqlLiteral(value).replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function toSafeErrorMessage(error) {
  if (error instanceof SafeConfigError) {
    return error.message;
  }

  return "unexpected error";
}

function printUsage() {
  console.log(`Usage:
  node scripts/dev-loop/verify-staging-rls-policies.mjs --env .env.staging [--psql /usr/local/opt/libpq/bin/psql]

This helper verifies RLS table state, policy shape, authenticated grants,
anon/public grant safety, and service_role grants without printing connection
strings, project refs, SQL result dumps, or env values.`);
}

main();
