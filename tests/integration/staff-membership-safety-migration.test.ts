import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../../packages/db/migrations/20260719090000_staff_membership_display_name_and_owner_invariant.sql",
    import.meta.url
  ),
  "utf8"
);

describe("staff membership safety migration", () => {
  it("stores and reads display names on each tenant membership", () => {
    expect(migrationSql).toContain("add column if not exists display_name text");
    expect(migrationSql).toContain("stm.display_name");
    expect(migrationSql).toContain("display_name = excluded.display_name");
    expect(migrationSql).not.toContain("display_name = excluded.display_name,\n    role = excluded.role,\n    status = excluded.status,\n    line_user_id");
  });

  it("protects both pending and active last owners", () => {
    expect(migrationSql).toContain("stm.status in ('active', 'invited')");
    expect(migrationSql).toContain("current_is_configured_owner");
    expect(migrationSql).toContain("current_is_active_owner");
    expect(migrationSql.match(/last_owner_must_remain_active/g)?.length).toBe(2);
  });
});
