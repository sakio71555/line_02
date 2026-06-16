import { describe, expect, it, vi } from "vitest";
import type { Alert } from "@amami-line-crm/domain";

import { SupabaseAlertRepository, SupabaseRepositoryError } from "@amami-line-crm/db";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

const tenantId = "tenant_amamihome";
const otherTenantId = "tenant_other";
const now = "2026-06-16T00:00:00.000Z";

describe("Supabase alert repository fake-client hardening", () => {
  it("writes a complete tenant-scoped alert payload and maps the returned alert", async () => {
    const client = new FakeSupabaseClient();
    const input = createAlert({
      id: "alert_payload",
      consultation_id: "consultation_1",
      severity: "high",
      message: "customer_1 is waiting for staff reply",
      triggered_at: "2026-06-16T00:01:00.000Z"
    });
    client.setResult("alerts", "single", { data: input, error: null });
    const repository = new SupabaseAlertRepository(client.asRepositoryClient());

    const saved = await repository.create(input);

    expect(saved).toEqual(input);
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "alerts",
        action: "insert",
        payload: {
          id: "alert_payload",
          tenant_id: tenantId,
          customer_id: "customer_1",
          consultation_id: "consultation_1",
          alert_type: "unreplied_customer_message",
          status: "open",
          severity: "high",
          message: "customer_1 is waiting for staff reply",
          triggered_at: "2026-06-16T00:01:00.000Z",
          notified_at: null,
          resolved_at: null,
          created_at: now,
          updated_at: now
        }
      })
    );
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "select",
      columns: "*"
    });
    expect(client.operations).toContainEqual({ table: "alerts", action: "single" });
  });

  it("lists open alerts by tenant, status, and created_at while dropping unsafe rows", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("alerts", "list", {
      data: [
        createAlert({ id: "late", status: "open", created_at: "2026-06-16T00:20:00.000Z" }),
        createAlert({ id: "other_tenant", tenant_id: otherTenantId, status: "open" }),
        createAlert({ id: "already_notified", status: "notified" }),
        createAlert({ id: "early", status: "open", created_at: "2026-06-16T00:10:00.000Z" })
      ],
      error: null
    });
    const repository = new SupabaseAlertRepository(client.asRepositoryClient());

    const alerts = await repository.listOpenByTenant(tenantId);

    expect(alerts.map((alert) => alert.id)).toEqual(["early", "late"]);
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "eq",
      column: "status",
      value: "open"
    });
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "order",
      column: "created_at",
      ascending: true
    });
  });

  it("finds active alerts by tenant, customer, type, active statuses, and limit", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("alerts", "maybeSingle", {
      data: createAlert({ id: "active_notified", status: "notified" }),
      error: null
    });
    const repository = new SupabaseAlertRepository(client.asRepositoryClient());

    const alert = await repository.findActiveByCustomerAndType(
      tenantId,
      "customer_1",
      "unreplied_customer_message"
    );

    expect(alert?.id).toBe("active_notified");
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "eq",
      column: "customer_id",
      value: "customer_1"
    });
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "eq",
      column: "alert_type",
      value: "unreplied_customer_message"
    });
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "in",
      column: "status",
      values: ["open", "notified"]
    });
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "order",
      column: "created_at",
      ascending: true
    });
    expect(client.operations).toContainEqual({ table: "alerts", action: "limit", count: 1 });
  });

  it("returns null when active lookup receives a mismatched tenant, customer, type, or status", async () => {
    const repositoryCases = [
      createAlert({ tenant_id: otherTenantId }),
      createAlert({ customer_id: "customer_2" }),
      createAlert({ alert_type: "stale" }),
      createAlert({ status: "resolved" })
    ];

    for (const row of repositoryCases) {
      const client = new FakeSupabaseClient();
      client.setResult("alerts", "maybeSingle", { data: row, error: null });
      const repository = new SupabaseAlertRepository(client.asRepositoryClient());

      await expect(
        repository.findActiveByCustomerAndType(tenantId, "customer_1", "unreplied_customer_message")
      ).resolves.toBeNull();
    }
  });

  it("updates notified, resolved, and dismissed statuses with tenant and alert id filters", async () => {
    const notifiedAt = "2026-06-16T00:02:00.000Z";
    const resolvedAt = "2026-06-16T00:03:00.000Z";

    const notifiedClient = await updateAlertStatus({
      status: "notified",
      notified_at: notifiedAt,
      row: createAlert({ status: "notified", notified_at: notifiedAt })
    });
    expect(notifiedClient.operations).toContainEqual(
      expect.objectContaining({
        table: "alerts",
        action: "update",
        payload: {
          status: "notified",
          updated_at: now,
          notified_at: notifiedAt
        }
      })
    );

    const resolvedClient = await updateAlertStatus({
      status: "resolved",
      resolved_at: resolvedAt,
      row: createAlert({ status: "resolved", resolved_at: resolvedAt })
    });
    expect(resolvedClient.operations).toContainEqual(
      expect.objectContaining({
        table: "alerts",
        action: "update",
        payload: {
          status: "resolved",
          updated_at: now,
          resolved_at: resolvedAt
        }
      })
    );

    const dismissedClient = await updateAlertStatus({
      status: "dismissed",
      row: createAlert({ status: "dismissed" })
    });
    expect(dismissedClient.operations).toContainEqual(
      expect.objectContaining({
        table: "alerts",
        action: "update",
        payload: {
          status: "dismissed",
          updated_at: now
        }
      })
    );

    for (const client of [notifiedClient, resolvedClient, dismissedClient]) {
      expect(client.operations).toContainEqual({
        table: "alerts",
        action: "eq",
        column: "tenant_id",
        value: tenantId
      });
      expect(client.operations).toContainEqual({
        table: "alerts",
        action: "eq",
        column: "id",
        value: "alert_1"
      });
      expect(client.operations).toContainEqual({ table: "alerts", action: "maybeSingle" });
    }
  });

  it("returns null when updateStatus receives a row outside the requested tenant", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("alerts", "maybeSingle", {
      data: createAlert({ tenant_id: otherTenantId, status: "notified", notified_at: now }),
      error: null
    });
    const repository = new SupabaseAlertRepository(client.asRepositoryClient());

    const alert = await repository.updateStatus({
      tenant_id: tenantId,
      alert_id: "alert_1",
      status: "notified",
      notified_at: now,
      updated_at: now
    });

    expect(alert).toBeNull();
  });

  it("wraps Supabase errors without leaking secret or URL values", async () => {
    const client = new FakeSupabaseClient();
    const secretValue = "secret-service-role-key-value";
    const urlValue = "https://example.supabase.co";
    client.setResult("alerts", "list", {
      data: null,
      error: {
        message: `failed with ${secretValue}`,
        code: "PGRST500",
        details: `connected to ${urlValue}`,
        hint: "check service role key"
      }
    });
    const repository = new SupabaseAlertRepository(client.asRepositoryClient());

    await expect(repository.listOpenByTenant(tenantId)).rejects.toThrow(SupabaseRepositoryError);

    try {
      await repository.listOpenByTenant(tenantId);
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseRepositoryError);
      expect(String(error)).toContain("Supabase alerts.listOpenByTenant failed");
      expect(String(error)).toContain("PGRST500");
      expect(String(error)).not.toContain(secretValue);
      expect(String(error)).not.toContain(urlValue);
      expect(JSON.stringify((error as SupabaseRepositoryError).causeError)).not.toContain(
        secretValue
      );
      expect(JSON.stringify((error as SupabaseRepositoryError).causeError)).not.toContain(urlValue);
    }
  });

  it("uses the fake client without real Supabase env or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = new FakeSupabaseClient();
    client.setResult("alerts", "list", { data: [createAlert()], error: null });
    const repository = new SupabaseAlertRepository(client.asRepositoryClient());

    const alerts = await repository.listByTenant(tenantId);

    expect(alerts).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

async function updateAlertStatus(input: {
  status: Alert["status"];
  notified_at?: string;
  resolved_at?: string;
  row: Alert;
}): Promise<FakeSupabaseClient> {
  const client = new FakeSupabaseClient();
  client.setResult("alerts", "maybeSingle", { data: input.row, error: null });
  const repository = new SupabaseAlertRepository(client.asRepositoryClient());

  const updated = await repository.updateStatus({
    tenant_id: tenantId,
    alert_id: "alert_1",
    status: input.status,
    notified_at: input.notified_at,
    resolved_at: input.resolved_at,
    updated_at: now
  });

  expect(updated?.status).toBe(input.status);
  return client;
}

function createAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert_1",
    tenant_id: tenantId,
    customer_id: "customer_1",
    consultation_id: null,
    alert_type: "unreplied_customer_message",
    status: "open",
    severity: "medium",
    message: "未返信です",
    triggered_at: now,
    notified_at: null,
    resolved_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}
