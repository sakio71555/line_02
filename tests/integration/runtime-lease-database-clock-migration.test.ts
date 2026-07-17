import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "packages/db/migrations/20260717002952_runtime_lease_database_clock.sql"
);

describe("runtime lease database clock migration", () => {
  it("calculates acquisition and renewal expiry from one database clock reading", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration.match(/clock_timestamp\(\)/giu)).toHaveLength(2);
    expect(migration).toMatch(/make_interval\(secs\s*=>\s*p_lease_ttl_seconds\)/iu);
    expect(migration).toMatch(/p_lease_ttl_seconds integer/iu);
    expect(migration).not.toMatch(/p_now/iu);
    expect(migration).not.toMatch(/p_expires_at/iu);
  });

  it("removes caller-clock overloads and exposes only TTL RPCs to service role", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(
      /drop function public\.try_acquire_runtime_lease\(text, text, text, timestamptz, timestamptz\)/iu
    );
    expect(migration).toMatch(
      /drop function public\.renew_runtime_lease\(text, text, text, timestamptz, timestamptz\)/iu
    );
    expect(migration).toMatch(
      /grant execute on function public\.try_acquire_runtime_lease\(text, text, text, integer\)\s+to service_role/iu
    );
    expect(migration).toMatch(
      /grant execute on function public\.renew_runtime_lease\(text, text, text, integer\)\s+to service_role/iu
    );
  });
});
