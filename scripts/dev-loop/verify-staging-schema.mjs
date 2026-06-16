#!/usr/bin/env node
import {
  SafeConfigError,
  checkPsqlVersion,
  loadStagingDatabaseConfig,
  resolvePsqlPath,
  runPsql
} from "./lib/staging-psql.mjs";

const expectedTables = [
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

const expectedColumns = [
  ["customers", "tenant_id"],
  ["customers", "last_customer_message_at"],
  ["messages", "tenant_id"],
  ["messages", "customer_id"],
  ["knowledge_pages", "allowed_for_ai"],
  ["staff_users", "auth_user_id"],
  ["staff_tenant_memberships", "tenant_id"],
  ["staff_tenant_memberships", "staff_user_id"]
];

const expectedIndexes = [
  "customers_tenant_line_user_id_unique",
  "messages_tenant_line_message_id_unique",
  "messages_tenant_customer_created_at_idx",
  "alerts_tenant_status_severity_idx",
  "knowledge_pages_tenant_allowed_for_ai_idx",
  "staff_tenant_memberships_tenant_status_idx"
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
      console.log("[ok] staging schema verification config parsed");
      console.log(`[ok] psql path: ${psqlPath}`);
      console.log(`[ok] ${version.version}`);
      console.log("[info] schema queries not executed in check-config-only mode");
      return;
    }

    const context = {
      psqlPath,
      connectionEnv: config.env,
      redactions: config.redactions
    };
    let hasMissingObject = false;

    for (const table of expectedTables) {
      const exists = runBooleanQuery(
        context,
        `select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = '${escapeSqlLiteral(table)}'
        );`
      );
      hasMissingObject = printObjectResult("table", table, exists) || hasMissingObject;
    }

    for (const [table, column] of expectedColumns) {
      const exists = runBooleanQuery(
        context,
        `select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = '${escapeSqlLiteral(table)}'
            and column_name = '${escapeSqlLiteral(column)}'
        );`
      );
      hasMissingObject = printObjectResult("column", `${table}.${column}`, exists) || hasMissingObject;
    }

    for (const index of expectedIndexes) {
      const exists = runBooleanQuery(
        context,
        `select exists (
          select 1
          from pg_indexes
          where schemaname = 'public'
            and indexname = '${escapeSqlLiteral(index)}'
        );`
      );
      hasMissingObject = printObjectResult("index", index, exists) || hasMissingObject;
    }

    const rlsSummary = runSingleValueQuery(
      context,
      `select
        coalesce(sum(case when c.relrowsecurity then 1 else 0 end), 0)::text || '/' || count(*)::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r';`
    );
    const policiesCount = runSingleValueQuery(
      context,
      "select count(*)::text from pg_policies where schemaname = 'public';"
    );

    console.log(`[info] RLS enabled tables: ${rlsSummary}`);
    console.log(`[info] policies count: ${policiesCount}`);

    if (hasMissingObject) {
      process.exit(1);
    }
  } catch (error) {
    console.log("[no-go] staging schema verification was not completed");
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

function runBooleanQuery(context, sql) {
  return runSingleValueQuery(context, sql) === "t";
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
    throw new SafeConfigError("schema verification query failed");
  }

  return result.stdout.trim();
}

function printObjectResult(kind, name, exists) {
  if (exists) {
    console.log(`[ok] ${kind} ${name} exists`);
    return false;
  }

  console.log(`[ng] ${kind} ${name} missing`);
  return true;
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
  node scripts/dev-loop/verify-staging-schema.mjs --env .env.staging [--psql /usr/local/opt/libpq/bin/psql]

This helper verifies expected public schema objects and RLS summary without
printing connection strings, project refs, or env values.`);
}

main();
