#!/usr/bin/env node
import {
  SafeConfigError,
  checkPsqlVersion,
  loadStagingDatabaseConfig,
  projectRelativePath,
  resolveProjectPath,
  resolvePsqlPath,
  runPsql
} from "./lib/staging-psql.mjs";

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printUsage();
      process.exit(0);
    }

    const repoRoot = process.cwd();
    const envFile = args.env ?? ".env.staging";
    const migrationFile = args.migration;
    const config = loadStagingDatabaseConfig({ repoRoot, envFile });

    if (args.checkConfigOnly) {
      console.log("[ok] staging migration config parsed");
      if (migrationFile) {
        console.log(`[ok] migration file: ${projectRelativePath(repoRoot, migrationFile)}`);
      }
      console.log("[info] psql version not checked in check-config-only mode");
      console.log("[info] migration apply not executed in check-config-only mode");
      return;
    }

    if (!migrationFile) {
      throw new SafeConfigError("migration file is required");
    }

    const psqlPath = args.psql ?? resolvePsqlPath();

    if (!psqlPath) {
      throw new SafeConfigError("psql is not available");
    }

    const version = checkPsqlVersion(psqlPath);

    if (!version.ok) {
      throw new SafeConfigError("psql version check failed");
    }

    const migrationPath = resolveProjectPath(repoRoot, migrationFile);
    const migrationRelativePath = projectRelativePath(repoRoot, migrationFile);

    const result = runPsql({
      psqlPath,
      connectionEnv: config.env,
      redactions: config.redactions,
      args: [
        "--no-psqlrc",
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        migrationPath
      ]
    });

    if (result.status !== 0 || result.error) {
      console.log("[ng] staging migration apply failed");
      console.log(`[ng] psql exit code: ${result.status ?? "unknown"}`);

      if (result.error) {
        console.log(`[ng] ${result.error}`);
      }

      printSanitizedOutput(result);
      process.exit(1);
    }

    console.log("[ok] staging migration apply completed");
    console.log(`[ok] psql path: ${psqlPath}`);
    console.log(`[ok] migration file: ${migrationRelativePath}`);
  } catch (error) {
    console.log("[no-go] staging migration apply was not executed");
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
    } else if (token === "--migration") {
      args.migration = argv[index + 1];
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

function printSanitizedOutput(result) {
  if (result.stdout.trim().length > 0) {
    console.log("[info] psql stdout:");
    console.log(result.stdout.trim());
  }

  if (result.stderr.trim().length > 0) {
    console.log("[info] psql stderr:");
    console.log(result.stderr.trim());
  }
}

function toSafeErrorMessage(error) {
  if (error instanceof SafeConfigError) {
    return error.message;
  }

  return "unexpected error";
}

function printUsage() {
  console.log(`Usage:
  node scripts/dev-loop/apply-staging-migration.mjs \\
    --env .env.staging \\
    --migration packages/db/migrations/0001_initial_schema.sql \\
    [--psql /usr/local/opt/libpq/bin/psql]

This helper reads local staging env values without printing them and passes
connection settings to psql through PG* environment variables. It does not use
Supabase CLI apply commands.`);
}

main();
