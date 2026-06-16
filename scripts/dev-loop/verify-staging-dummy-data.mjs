#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  checkPsqlVersion,
  loadStagingDatabaseConfig,
  resolvePsqlPath,
  runPsql,
  SafeConfigError
} from "./lib/staging-psql.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = parseArgs(process.argv.slice(2));
const envFile = args.env ?? ".env.staging";
const psqlPath = args.psql ?? resolvePsqlPath();

if (!psqlPath) {
  fail("psql was not found. Check /usr/local/opt/libpq/bin/psql or /opt/homebrew/opt/libpq/bin/psql.");
}

const version = checkPsqlVersion(psqlPath);

if (!version.ok) {
  fail(`psql is not usable: ${version.error}`);
}

try {
  const config = loadStagingDatabaseConfig({ repoRoot, envFile });

  assertCount({
    label: "tenant exists",
    expected: 1,
    actual: queryNumber(config, "select count(*) from tenants where id = 'tenant_amamihome';")
  });
  assertMinimum({
    label: "customers count",
    expectedMinimum: 2,
    actual: queryNumber(
      config,
      "select count(*) from customers where tenant_id = 'tenant_amamihome' and id like 'customer_demo_%';"
    )
  });
  assertMinimum({
    label: "messages count",
    expectedMinimum: 5,
    actual: queryNumber(
      config,
      "select count(*) from messages where tenant_id = 'tenant_amamihome' and customer_id in ('customer_demo_yamada_taro', 'customer_demo_sato_hanako');"
    )
  });
  assertMinimum({
    label: "knowledge pages count",
    expectedMinimum: 10,
    actual: queryNumber(
      config,
      "select count(*) from knowledge_pages where tenant_id = 'tenant_amamihome' and id like 'knowledge_staging_%' and allowed_for_ai = true;"
    )
  });
  assertCount({
    label: "customer tenant filter violations",
    expected: 0,
    actual: queryNumber(
      config,
      "select count(*) from customers where id in ('customer_demo_yamada_taro', 'customer_demo_sato_hanako') and tenant_id <> 'tenant_amamihome';"
    )
  });
  assertCount({
    label: "message tenant filter violations",
    expected: 0,
    actual: queryNumber(
      config,
      "select count(*) from messages where id like 'message_demo_%' and tenant_id <> 'tenant_amamihome';"
    )
  });
  assertCount({
    label: "dummy LINE user marker",
    expected: 2,
    actual: queryNumber(
      config,
      "select count(*) from customers where tenant_id = 'tenant_amamihome' and id like 'customer_demo_%' and line_user_id like 'dummy_line_user_%';"
    )
  });
  assertCount({
    label: "real LINE settings disabled",
    expected: 1,
    actual: queryNumber(
      config,
      "select count(*) from tenant_line_settings where tenant_id = 'tenant_amamihome' and status = 'draft' and channel_secret_encrypted is null and channel_access_token_encrypted is null and staff_line_group_id is null;"
    )
  });

  console.log("[ok] staging dummy data verification passed");
} catch (error) {
  if (error instanceof SafeConfigError) {
    fail(error.message);
  }

  throw error;
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--env" && next) {
      parsed.env = next;
      index += 1;
    } else if (value === "--psql" && next) {
      parsed.psql = next;
      index += 1;
    }
  }

  return parsed;
}

function queryNumber(config, sql) {
  const result = runPsql({
    psqlPath,
    connectionEnv: config.env,
    redactions: config.redactions,
    args: ["-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", sql]
  });

  if (result.status !== 0) {
    fail(result.stderr || result.error || "staging dummy data verification query failed");
  }

  const value = Number.parseInt(result.stdout.trim(), 10);

  if (!Number.isFinite(value)) {
    fail("staging dummy data verification returned an unreadable count");
  }

  return value;
}

function assertCount(input) {
  if (input.actual !== input.expected) {
    fail(`${input.label}: expected ${input.expected}, got ${input.actual}`);
  }

  console.log(`[ok] ${input.label}: ${input.actual}`);
}

function assertMinimum(input) {
  if (input.actual < input.expectedMinimum) {
    fail(`${input.label}: expected >= ${input.expectedMinimum}, got ${input.actual}`);
  }

  console.log(`[ok] ${input.label}: ${input.actual}`);
}

function fail(message) {
  console.error(`[ng] ${message}`);
  process.exit(1);
}
