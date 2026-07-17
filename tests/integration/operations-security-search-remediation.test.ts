import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SupabaseOperationsRepository } from "@amami-line-crm/db";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

const migrationSql = readFileSync(
  new URL(
    "../../packages/db/migrations/20260717101933_operations_security_and_search_remediation.sql",
    import.meta.url
  ),
  "utf8"
);
const apiSource = readFileSync(new URL("../../apps/api/src/index.ts", import.meta.url), "utf8");

describe("operations security and search remediation", () => {
  it("removes authenticated writes and keeps operations policies read-only", () => {
    expect(migrationSql).toMatch(
      /revoke insert, update, delete, truncate, references, trigger on table[\s\S]*from authenticated;/i
    );
    expect(migrationSql).not.toMatch(/create policy[^;]+for all to authenticated/is);
    expect(migrationSql).toContain("consultations_select_for_active_staff");
    expect(migrationSql).toContain("audit_events_select_for_tenant_managers");
    expect(migrationSql).toContain("array['owner', 'manager']");
  });

  it("enforces tenant-bound customer, consultation, alert and staff references", () => {
    for (const constraint of [
      "consultations_tenant_customer_fk",
      "messages_tenant_customer_fk",
      "alerts_tenant_customer_fk",
      "reservations_tenant_customer_fk",
      "internal_notes_tenant_customer_fk"
    ]) {
      expect(migrationSql).toContain(constraint);
    }

    expect(migrationSql).toContain("operations tenant integrity preflight failed");
    expect(migrationSql).toContain("tenant consultation reference mismatch");
    expect(migrationSql).toContain("tenant alert reference mismatch");
    expect(migrationSql).toContain("tenant staff reference mismatch");
    expect(migrationSql).toContain("tenant mention reference mismatch");
    expect(migrationSql).toContain("messages_validate_tenant_references");
    expect(migrationSql).toContain("audit_events_validate_tenant_references");
  });

  it("lists staff from tenant memberships instead of the home tenant", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("rpc:list_operations_staff_members", "list", {
      data: [
        {
          id: "staff_shared",
          tenant_id: "tenant_a",
          display_name: "Shared Staff",
          email: "shared@example.test",
          role: "manager",
          is_active: true
        },
        {
          id: "staff_other",
          tenant_id: "tenant_b",
          display_name: "Other Staff",
          email: "other@example.test",
          role: "staff",
          is_active: true
        }
      ],
      error: null
    });
    const repository = new SupabaseOperationsRepository(client.asRepositoryClient());

    await expect(repository.listStaffMembers("tenant_a")).resolves.toMatchObject([
      { id: "staff_shared", tenant_id: "tenant_a", role: "manager" }
    ]);
    expect(client.operations).toContainEqual({
      table: "rpc:list_operations_staff_members",
      action: "rpc",
      payload: { target_tenant_id: "tenant_a" }
    });
  });

  it("uses one tenant-scoped database search without the first-100 cutoff", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("rpc:search_operations_workspace", "list", {
      data: {
        customers: [
          { id: "customer_a", tenant_id: "tenant_a" },
          { id: "customer_b", tenant_id: "tenant_b" }
        ],
        messages: [
          {
            customer_id: "customer_a",
            message: { id: "message_a", customer_id: "customer_a", tenant_id: "tenant_a" }
          },
          {
            customer_id: "customer_b",
            message: { id: "message_b", customer_id: "customer_b", tenant_id: "tenant_b" }
          }
        ],
        notes: [
          {
            customer_id: "customer_a",
            note: { id: "note_a", customer_id: "customer_a", tenant_id: "tenant_a" }
          }
        ],
        alerts: [
          { id: "alert_a", tenant_id: "tenant_a" },
          { id: "alert_b", tenant_id: "tenant_b" }
        ]
      },
      error: null
    });
    const repository = new SupabaseOperationsRepository(client.asRepositoryClient());

    await expect(repository.searchWorkspace("tenant_a", "相談")).resolves.toMatchObject({
      customers: [{ id: "customer_a" }],
      messages: [{ message: { id: "message_a" } }],
      notes: [{ note: { id: "note_a" } }],
      alerts: [{ id: "alert_a" }]
    });
    expect(client.operations).toContainEqual({
      table: "rpc:search_operations_workspace",
      action: "rpc",
      payload: { target_tenant_id: "tenant_a", search_query: "相談" }
    });
    expect(apiSource).toContain("operationsRepository.searchWorkspace");
    expect(apiSource).not.toContain("customers.slice(0, 100)");
  });

  it("keeps staff and search RPCs restricted to the service role", () => {
    expect(migrationSql).toMatch(
      /revoke all on function public\.list_operations_staff_members\(text\)\s+from public, anon, authenticated;/i
    );
    expect(migrationSql).toMatch(
      /grant execute on function public\.list_operations_staff_members\(text\) to service_role;/i
    );
    expect(migrationSql).toMatch(
      /revoke all on function public\.search_operations_workspace\(text, text\)\s+from public, anon, authenticated;/i
    );
    expect(migrationSql).toMatch(
      /grant execute on function public\.search_operations_workspace\(text, text\) to service_role;/i
    );
  });
});
