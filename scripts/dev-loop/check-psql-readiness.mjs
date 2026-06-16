#!/usr/bin/env node
import { spawnSync } from "node:child_process";

import { checkPsqlVersion, resolvePsqlPath } from "./lib/staging-psql.mjs";

function main() {
  const result = checkPsqlReadiness();

  for (const line of result.lines) {
    console.log(line);
  }

  process.exit(result.ok ? 0 : 1);
}

export function checkPsqlReadiness(spawnImpl = spawnSync) {
  const psqlPath = resolvePsqlPath(spawnImpl);

  if (!psqlPath) {
    return {
      ok: false,
      lines: [
        "[no-go] psql is not available",
        "[no-go] checked command path and known libpq absolute paths",
        "[no-go] migration apply must not be executed in this state"
      ]
    };
  }

  const version = checkPsqlVersion(psqlPath, spawnImpl);

  if (!version.ok) {
    return {
      ok: false,
      lines: [
        "[no-go] psql is not available",
        "[no-go] psql version check failed",
        "[no-go] migration apply must not be executed in this state"
      ]
    };
  }

  return {
    ok: true,
    lines: [
      "[ok] psql is available",
      `[ok] psql path: ${psqlPath}`,
      `[ok] ${version.version}`,
      "[info] migration apply is not executed by this readiness check"
    ]
  };
}

main();
