#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function main() {
  const result = checkPsqlReadiness();

  for (const line of result.lines) {
    console.log(line);
  }

  process.exit(result.ok ? 0 : 1);
}

export function checkPsqlReadiness(spawnImpl = spawnSync) {
  const result = spawnImpl("psql", ["--version"], {
    encoding: "utf8"
  });

  if (result.error || result.status !== 0) {
    return {
      ok: false,
      lines: [
        "[no-go] psql is not available",
        "[no-go] migration apply must not be executed in this state"
      ]
    };
  }

  const versionLine = `${result.stdout ?? result.stderr ?? ""}`
    .trim()
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0);

  return {
    ok: true,
    lines: [
      "[ok] psql is available",
      `[ok] ${versionLine ?? "psql version detected"}`,
      "[info] migration apply is not executed by this readiness check"
    ]
  };
}

main();
