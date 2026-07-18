import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../../packages/db/migrations/20260718143000_first_staff_owner_bootstrap.sql",
    import.meta.url
  ),
  "utf8"
);

describe("first staff owner bootstrap migration", () => {
  it("serializes tenant bootstrap and forces the first membership to owner", () => {
    const tenantLock = migrationSql.indexOf(
      "pg_advisory_xact_lock(pg_catalog.hashtextextended(target_tenant_id, 0))"
    );
    const membershipCount = migrationSql.indexOf("into tenant_membership_count");

    expect(tenantLock).toBeGreaterThan(-1);
    expect(membershipCount).toBeGreaterThan(tenantLock);
    expect(migrationSql).toContain(
      "case when tenant_membership_count = 0 then 'owner' else requested_role end"
    );
    expect(migrationSql.match(/effective_role/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the RPC restricted to the service role", () => {
    expect(migrationSql).toContain(
      "revoke all on function public.create_staff_management_record(jsonb, jsonb)"
    );
    expect(migrationSql).toContain(
      "grant execute on function public.create_staff_management_record(jsonb, jsonb) to service_role"
    );
  });
});
