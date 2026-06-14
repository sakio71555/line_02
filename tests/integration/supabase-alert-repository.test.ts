import { afterEach, describe, expect, it, vi } from "vitest";
import type { Alert } from "@amami-line-crm/domain";

import {
  SupabaseAlertRepository,
  SupabaseRepositoryError,
  type SupabaseRepositoryClient,
  type SupabaseRepositoryErrorLike
} from "@amami-line-crm/db";

type Terminal = "maybeSingle" | "single" | "list";

interface FakeResult {
  data: unknown;
  error: SupabaseRepositoryErrorLike | null;
}

interface FakeOperation {
  table: string;
  action: string;
  column?: string;
  value?: unknown;
  values?: unknown[];
  payload?: unknown;
  columns?: string;
  ascending?: boolean;
  count?: number;
}

class FakeSupabaseClient {
  readonly operations: FakeOperation[] = [];
  private readonly results = new Map<string, FakeResult>();

  from(table: string): FakeQueryBuilder {
    this.operations.push({ table, action: "from" });
    return new FakeQueryBuilder(this, table);
  }

  setResult(table: string, terminal: Terminal, result: FakeResult): void {
    this.results.set(`${table}:${terminal}`, result);
  }

  getResult(table: string, terminal: Terminal): FakeResult {
    return this.results.get(`${table}:${terminal}`) ?? { data: null, error: null };
  }

  push(operation: FakeOperation): void {
    this.operations.push(operation);
  }
}

class FakeQueryBuilder implements PromiseLike<FakeResult> {
  constructor(
    private readonly client: FakeSupabaseClient,
    private readonly table: string
  ) {}

  select(columns = "*"): this {
    this.client.push({ table: this.table, action: "select", columns });
    return this;
  }

  eq(column: string, value: unknown): this {
    this.client.push({ table: this.table, action: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.client.push({ table: this.table, action: "in", column, values });
    return this;
  }

  order(column: string, options: { ascending: boolean }): this {
    this.client.push({
      table: this.table,
      action: "order",
      column,
      ascending: options.ascending
    });
    return this;
  }

  limit(count: number): this {
    this.client.push({ table: this.table, action: "limit", count });
    return this;
  }

  insert(payload: unknown): this {
    this.client.push({ table: this.table, action: "insert", payload });
    return this;
  }

  update(payload: unknown): this {
    this.client.push({ table: this.table, action: "update", payload });
    return this;
  }

  maybeSingle(): Promise<FakeResult> {
    this.client.push({ table: this.table, action: "maybeSingle" });
    return Promise.resolve(this.client.getResult(this.table, "maybeSingle"));
  }

  single(): Promise<FakeResult> {
    this.client.push({ table: this.table, action: "single" });
    return Promise.resolve(this.client.getResult(this.table, "single"));
  }

  then<TResult1 = FakeResult, TResult2 = never>(
    onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    this.client.push({ table: this.table, action: "execute" });
    return Promise.resolve(this.client.getResult(this.table, "list")).then(
      onfulfilled,
      onrejected
    );
  }
}

const tenantId = "tenant_amamihome";
const otherTenantId = "tenant_other";
const now = "2026-06-14T00:00:00.000Z";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Supabase alert repository", () => {
  it("exports repository without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("@amami-line-crm/db")).resolves.toHaveProperty(
      "SupabaseAlertRepository"
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates an alert with tenant_id in the insert payload", async () => {
    const client = createFakeClient();
    client.setResult("alerts", "single", { data: createAlert(), error: null });
    const repository = new SupabaseAlertRepository(asRepositoryClient(client));

    const alert = await repository.create(createAlert());

    expect(alert.tenant_id).toBe(tenantId);
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "alerts",
        action: "insert",
        payload: expect.objectContaining({
          id: "alert_1",
          tenant_id: tenantId,
          customer_id: "customer_1",
          alert_type: "unreplied_customer_message"
        })
      })
    );
  });

  it("lists alerts by tenant and filters out defensive tenant mismatches", async () => {
    const client = createFakeClient();
    client.setResult("alerts", "list", {
      data: [
        createAlert({ id: "alert_late", created_at: "2026-06-14T00:20:00.000Z" }),
        createAlert({ id: "alert_other", tenant_id: otherTenantId }),
        createAlert({ id: "alert_early", created_at: "2026-06-14T00:10:00.000Z" })
      ],
      error: null
    });
    const repository = new SupabaseAlertRepository(asRepositoryClient(client));

    const alerts = await repository.listByTenant(tenantId);

    expect(alerts.map((alert) => alert.id)).toEqual(["alert_early", "alert_late"]);
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
    expect(client.operations).toContainEqual({
      table: "alerts",
      action: "order",
      column: "created_at",
      ascending: true
    });
  });

  it("lists open alerts by tenant and status", async () => {
    const client = createFakeClient();
    client.setResult("alerts", "list", {
      data: [
        createAlert({ id: "alert_open", status: "open" }),
        createAlert({ id: "alert_notified", status: "notified" }),
        createAlert({ id: "alert_other", tenant_id: otherTenantId, status: "open" })
      ],
      error: null
    });
    const repository = new SupabaseAlertRepository(asRepositoryClient(client));

    const alerts = await repository.listOpenByTenant(tenantId);

    expect(alerts.map((alert) => alert.id)).toEqual(["alert_open"]);
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
  });

  it("finds active alert by tenant, customer, type, and active statuses", async () => {
    const client = createFakeClient();
    client.setResult("alerts", "maybeSingle", { data: createAlert(), error: null });
    const repository = new SupabaseAlertRepository(asRepositoryClient(client));

    const alert = await repository.findActiveByCustomerAndType(
      tenantId,
      "customer_1",
      "unreplied_customer_message"
    );

    expect(alert?.id).toBe("alert_1");
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
    expect(client.operations).toContainEqual({ table: "alerts", action: "limit", count: 1 });
  });

  it("returns null when the active alert row is outside the tenant scope", async () => {
    const client = createFakeClient();
    client.setResult("alerts", "maybeSingle", {
      data: createAlert({ tenant_id: otherTenantId }),
      error: null
    });
    const repository = new SupabaseAlertRepository(asRepositoryClient(client));

    await expect(
      repository.findActiveByCustomerAndType(tenantId, "customer_1", "unreplied_customer_message")
    ).resolves.toBeNull();
  });

  it("updates status by tenant_id and alert id", async () => {
    const client = createFakeClient();
    client.setResult("alerts", "maybeSingle", {
      data: createAlert({ status: "notified", notified_at: now }),
      error: null
    });
    const repository = new SupabaseAlertRepository(asRepositoryClient(client));

    const alert = await repository.updateStatus({
      tenant_id: tenantId,
      alert_id: "alert_1",
      status: "notified",
      notified_at: now,
      updated_at: now
    });

    expect(alert?.status).toBe("notified");
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "alerts",
        action: "update",
        payload: {
          status: "notified",
          updated_at: now,
          notified_at: now
        }
      })
    );
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
  });

  it("does not clear timestamps when updateStatus receives null timestamp fields", async () => {
    const client = createFakeClient();
    client.setResult("alerts", "maybeSingle", {
      data: createAlert({ status: "resolved", resolved_at: now }),
      error: null
    });
    const repository = new SupabaseAlertRepository(asRepositoryClient(client));

    await repository.updateStatus({
      tenant_id: tenantId,
      alert_id: "alert_1",
      status: "resolved",
      notified_at: null,
      resolved_at: null,
      updated_at: now
    });

    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "alerts",
        action: "update",
        payload: {
          status: "resolved",
          updated_at: now
        }
      })
    );
  });

  it("throws repository errors from Supabase failures", async () => {
    const client = createFakeClient();
    client.setResult("alerts", "list", {
      data: null,
      error: { message: "database unavailable" }
    });
    const repository = new SupabaseAlertRepository(asRepositoryClient(client));

    await expect(repository.listByTenant(tenantId)).rejects.toThrow(SupabaseRepositoryError);
  });
});

function createFakeClient(): FakeSupabaseClient {
  return new FakeSupabaseClient();
}

function asRepositoryClient(client: FakeSupabaseClient): SupabaseRepositoryClient {
  return client as unknown as SupabaseRepositoryClient;
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
