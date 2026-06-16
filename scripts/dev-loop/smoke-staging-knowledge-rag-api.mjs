#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { constants, accessSync } from "node:fs";

const args = parseArgs(process.argv.slice(2));
const envFile = args.env ?? ".env.staging";
const psqlPath = args.psql ?? resolvePsqlPath();

if (!psqlPath) {
  fail("psql was not found. Check /usr/local/opt/libpq/bin/psql or /opt/homebrew/opt/libpq/bin/psql.");
}

run(psqlPath, ["--version"]);
run("node", ["scripts/dev-loop/verify-staging-env.mjs", "--file", envFile]);
run("node", ["scripts/dev-loop/verify-staging-schema.mjs", "--env", envFile, "--psql", psqlPath]);
run("node", [
  "scripts/dev-loop/verify-staging-postgrest-grants.mjs",
  "--env",
  envFile,
  "--psql",
  psqlPath
]);
run("node", ["scripts/dev-loop/verify-staging-dummy-data.mjs", "--env", envFile, "--psql", psqlPath]);
run("npx", [
  "pnpm@10.12.1",
  "exec",
  "vitest",
  "run",
  "tests/integration/staging-knowledge-rag-api-smoke.test.ts"
], {
  RUN_STAGING_KNOWLEDGE_RAG_SMOKE: "1",
  STAGING_ENV_FILE: envFile
});
console.log("[ok] staging knowledge/RAG smoke completed");
console.log("[ok] Supabase runtime bundle used for knowledge_pages/RAG");
console.log("[ok] MockAiProvider used; real LINE/OpenAI remained disabled");
console.log("[ok] restart-equivalent read confirmed");
console.log("[ok] staging extension verification reached 100%");

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

function resolvePsqlPath() {
  const commandResult = spawnSync("zsh", ["-lc", "command -v psql || true"], {
    encoding: "utf8"
  });
  const commandPath = commandResult.stdout?.trim().split(/\r?\n/).find(Boolean);
  const candidates = [
    commandPath,
    "/usr/local/opt/libpq/bin/psql",
    "/opt/homebrew/opt/libpq/bin/psql"
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);

  return candidates.find(isExecutable) ?? null;
}

function isExecutable(filePath) {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
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
    fail(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function fail(message) {
  console.error(`[ng] ${message}`);
  process.exit(1);
}
