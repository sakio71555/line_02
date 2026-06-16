import { spawnSync } from "node:child_process";
import { constants, existsSync, readFileSync, accessSync } from "node:fs";
import { resolve, sep, relative } from "node:path";
import { URL } from "node:url";

const absolutePsqlCandidates = [
  "/usr/local/opt/libpq/bin/psql",
  "/opt/homebrew/opt/libpq/bin/psql"
];

const requiredSafetyFlags = {
  APP_ENV: "staging",
  LINE_MESSAGING_ENABLED: "false",
  LINE_REAL_PUSH_ENABLED: "false",
  AI_PROVIDER: "mock",
  REPOSITORY_RUNTIME: "in_memory"
};

export function resolvePsqlPath(spawnImpl = spawnSync) {
  const commandResult = spawnImpl("zsh", ["-lc", "command -v psql || true"], {
    encoding: "utf8"
  });
  const commandPath = commandResult.stdout?.trim().split(/\r?\n/).find(Boolean);
  const candidates = [
    commandPath,
    ...absolutePsqlCandidates
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);

  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function checkPsqlVersion(psqlPath, spawnImpl = spawnSync) {
  const result = spawnImpl(psqlPath, ["--version"], {
    encoding: "utf8"
  });

  if (result.error || result.status !== 0) {
    return {
      ok: false,
      version: null,
      error: result.error?.message ?? result.stderr ?? "psql version check failed"
    };
  }

  const version = `${result.stdout ?? result.stderr ?? ""}`
    .trim()
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0);

  return {
    ok: true,
    version: version ?? "psql version detected",
    error: null
  };
}

export function loadStagingDatabaseConfig({ repoRoot, envFile }) {
  const envPath = resolveProjectPath(repoRoot, envFile);

  if (!existsSync(envPath)) {
    throw new SafeConfigError("env file is missing");
  }

  const env = parseEnvFile(readFileSync(envPath, "utf8"));
  validateSafetyFlags(env);

  const dbUrlValue = env.get("SUPABASE_DB_URL");

  if (!dbUrlValue || dbUrlValue.trim().length === 0) {
    throw new SafeConfigError("SUPABASE_DB_URL is missing");
  }

  return parseDatabaseUrl(dbUrlValue);
}

export function parseDatabaseUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new SafeConfigError("SUPABASE_DB_URL could not be parsed safely");
  }

  if (!["postgresql:", "postgres:"].includes(url.protocol)) {
    throw new SafeConfigError("SUPABASE_DB_URL uses an unsupported protocol");
  }

  const host = url.hostname;
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);

  if (!host || !database || !user || !password) {
    throw new SafeConfigError("SUPABASE_DB_URL is missing required connection parts");
  }

  return {
    env: {
      PGHOST: host,
      PGPORT: url.port || "5432",
      PGDATABASE: database,
      PGUSER: user,
      PGPASSWORD: password,
      PGSSLMODE: url.searchParams.get("sslmode") || "require"
    },
    redactions: buildRedactions({ rawUrl: value, host, user, password })
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

export function runPsql({ psqlPath, connectionEnv, args, redactions }) {
  const result = spawnSync(psqlPath, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      ...connectionEnv
    },
    maxBuffer: 1024 * 1024 * 10
  });

  return {
    status: result.status,
    error: result.error ? redactText(result.error.message, redactions) : null,
    stdout: redactText(result.stdout ?? "", redactions),
    stderr: redactText(result.stderr ?? "", redactions)
  };
}

export function redactText(text, redactions) {
  let safeText = text;

  for (const token of redactions) {
    if (token.length < 4) {
      continue;
    }

    safeText = safeText.split(token).join("[redacted]");
  }

  return safeText;
}

export function resolveProjectPath(repoRoot, filePath) {
  const resolved = resolve(repoRoot, filePath);
  const rootPrefix = repoRoot.endsWith(sep) ? repoRoot : `${repoRoot}${sep}`;

  if (resolved !== repoRoot && !resolved.startsWith(rootPrefix)) {
    throw new SafeConfigError("refusing to read outside project");
  }

  return resolved;
}

export function projectRelativePath(repoRoot, filePath) {
  return relative(repoRoot, resolveProjectPath(repoRoot, filePath));
}

export class SafeConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "SafeConfigError";
  }
}

function validateSafetyFlags(env) {
  for (const [name, expected] of Object.entries(requiredSafetyFlags)) {
    if (env.get(name)?.trim() !== expected) {
      throw new SafeConfigError(`${name} is missing or unsafe`);
    }
  }
}

function buildRedactions({ rawUrl, host, user, password }) {
  const redactions = new Set([
    rawUrl,
    host,
    password
  ]);

  if (user.includes(".")) {
    redactions.add(user);
  }

  return [...redactions].filter(Boolean);
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

function isExecutable(filePath) {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
