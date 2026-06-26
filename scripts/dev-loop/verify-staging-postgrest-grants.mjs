#!/usr/bin/env node
import {
  SafeConfigError,
  checkPsqlVersion,
  loadStagingDatabaseConfig,
  resolvePsqlPath,
  runPsql
} from "./lib/staging-psql.mjs";

const serviceRoleGrantTables = [
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
      console.log("[ok] staging PostgREST grants verification config parsed");
      console.log("[info] psql version not checked in check-config-only mode");
      console.log("[info] grant queries not executed in check-config-only mode");
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

    const context = {
      psqlPath,
      connectionEnv: config.env,
      redactions: config.redactions
    };
    let failed = false;

    failed = assertBoolean({
      context,
      label: "service_role has usage on public schema",
      sql: "select has_schema_privilege('service_role', 'public', 'USAGE');"
    }) || failed;

    for (const table of serviceRoleGrantTables) {
      for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
        failed = assertBoolean({
          context,
          label: `service_role can ${privilege.toLowerCase()} ${table}`,
          sql: `select has_table_privilege('service_role', 'public.${escapeSqlLiteral(table)}', '${privilege}');`
        }) || failed;
      }
    }

    for (const role of ["anon", "authenticated"]) {
      const broadGrantDetected = hasBroadTableDmlGrant(context, role);

      if (broadGrantDetected) {
        console.log(`[ng] broad ${role} table DML grant detected`);
        failed = true;
      } else {
        console.log(`[ok] no broad ${role} table DML grant detected`);
      }
    }

    if (failed) {
      process.exit(1);
    }
  } catch (error) {
    console.log("[no-go] staging PostgREST grants verification was not completed");
    console.log(`[no-go] ${toSafeErrorMessage(error)}`);
    process.exit(1);
  }
}

function hasBroadTableDmlGrant(context, role) {
  for (const table of serviceRoleGrantTables) {
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      if (
        !runBooleanQuery(
          context,
          `select has_table_privilege('${role}', 'public.${escapeSqlLiteral(table)}', '${privilege}');`
        )
      ) {
        return false;
      }
    }
  }

  return true;
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

function assertBoolean(input) {
  if (runBooleanQuery(input.context, input.sql)) {
    console.log(`[ok] ${input.label}`);
    return false;
  }

  console.log(`[ng] ${input.label}`);
  return true;
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
    throw new SafeConfigError("PostgREST grant verification query failed");
  }

  return result.stdout.trim();
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
  node scripts/dev-loop/verify-staging-postgrest-grants.mjs --env .env.staging [--psql /usr/local/opt/libpq/bin/psql]

This helper verifies service_role PostgREST grants and checks that broad
anon/authenticated DML grants were not introduced. It does not print connection
strings, project refs, or env values.`);
}

main();
