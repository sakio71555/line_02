#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));
const envFile = args.env ?? ".env.staging";

run("node", ["scripts/dev-loop/verify-staging-dummy-data.mjs", "--env", envFile]);
run("npx", [
  "pnpm@10.12.1",
  "exec",
  "vitest",
  "run",
  "tests/integration/staging-customer-message-api-smoke.test.ts"
], {
  RUN_STAGING_SMOKE: "1",
  STAGING_ENV_FILE: envFile
});

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--env" && next) {
      parsed.env = next;
      index += 1;
    }
  }

  return parsed;
}

function run(command, commandArgs, extraEnv = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv
    }
  });

  if (result.error) {
    console.error(`[ng] ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
