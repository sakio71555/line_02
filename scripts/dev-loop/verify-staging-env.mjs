#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

const defaultEnvPath = ".env.staging";

const requiredSupabaseNames = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL"
];

const requiredFlags = {
  LINE_MESSAGING_ENABLED: "false",
  LINE_REAL_PUSH_ENABLED: "false",
  AI_PROVIDER: "mock",
  REPOSITORY_RUNTIME: "in_memory",
  APP_ENV: "staging",
  TENANT_ID: "tenant_amamihome",
  TENANT_SLUG: "amamihome"
};

const optionalProviderNames = [
  "LINE_CHANNEL_ID",
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_WEBHOOK_SECRET_PATH",
  "STAFF_LINE_GROUP_ID",
  "OPENAI_API_KEY",
  "OPENAI_MODEL"
];

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const repoRoot = process.cwd();
  const envPath = resolveEnvPath(repoRoot, args.file ?? defaultEnvPath);
  const result = verifyStagingEnvFile(envPath);

  for (const line of result.lines) {
    console.log(line);
  }

  process.exit(result.ok ? 0 : 1);
}

export function verifyStagingEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {
      ok: false,
      lines: [
        "[ng] staging env verification failed",
        "[ng] env file is missing",
        "[ng] missing/unsafe keys:",
        "- .env.staging"
      ]
    };
  }

  const env = parseEnvFile(readFileSync(filePath, "utf8"));
  const lines = [];
  const errors = [];

  for (const name of requiredSupabaseNames) {
    const value = env.get(name);

    if (isFilledNonPlaceholder(value)) {
      lines.push(`[ok] ${name} is present`);
    } else {
      lines.push(`[ng] ${name} is missing or unsafe`);
      errors.push(name);
    }
  }

  for (const [name, expected] of Object.entries(requiredFlags)) {
    const value = env.get(name)?.trim();

    if (value === expected) {
      lines.push(`[ok] ${name}=${expected}`);
    } else {
      lines.push(`[ng] ${name} is missing or unsafe; expected ${expected}`);
      errors.push(name);
    }
  }

  for (const name of optionalProviderNames) {
    const value = env.get(name);

    if (!isFilledNonPlaceholder(value)) {
      continue;
    }

    if (name.startsWith("LINE_")) {
      lines.push(`[info] ${name} is present but LINE_REAL_PUSH_ENABLED=false`);
    } else if (name.startsWith("OPENAI_")) {
      lines.push(`[info] ${name} is present but AI_PROVIDER=mock`);
    } else {
      lines.push(`[info] ${name} is present`);
    }
  }

  if (errors.length > 0) {
    lines.unshift("[ng] staging env verification failed");
    lines.push("[ng] missing/unsafe keys:");
    lines.push(...errors.map((name) => `- ${name}`));

    return {
      ok: false,
      lines
    };
  }

  lines.unshift("[ok] staging env verification passed");

  return {
    ok: true,
    lines
  };
}

export function parseEnvFile(content) {
  const env = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const equalsIndex = normalizedLine.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, equalsIndex).trim();
    const value = stripWrappingQuotes(normalizedLine.slice(equalsIndex + 1).trim());

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      env.set(key, value);
    }
  }

  return env;
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--file") {
      args.file = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`unknown argument: ${token}`);
    }
  }

  return args;
}

function resolveEnvPath(repoRoot, filePath) {
  const resolved = resolve(repoRoot, filePath);
  const rootPrefix = repoRoot.endsWith(sep) ? repoRoot : `${repoRoot}${sep}`;

  if (resolved !== repoRoot && !resolved.startsWith(rootPrefix)) {
    throw new Error("refusing to read outside project");
  }

  return resolved;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function isFilledNonPlaceholder(value) {
  if (!value) {
    return false;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return false;
  }

  if (normalized.startsWith("<") && normalized.endsWith(">")) {
    return false;
  }

  return !/(FILL_ME|TODO|CHANGE_ME|\[YOUR-PASSWORD\]|PLACEHOLDER)/i.test(normalized);
}

function printUsage() {
  console.log(`Usage:
  node scripts/dev-loop/verify-staging-env.mjs [--file .env.staging]

This script verifies local staging env presence and safe flags without printing values.
It does not connect to Supabase, LINE, OpenAI, or any external service.`);
}

main();
