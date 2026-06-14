import { afterEach, describe, expect, it, vi } from "vitest";
import type { Customer, Message } from "@amami-line-crm/domain";

import {
  SupabaseCustomerRepository,
  SupabaseMessageRepository,
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
  options?: unknown;
  columns?: string;
  ascending?: boolean;
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

  insert(payload: unknown): this {
    this.client.push({ table: this.table, action: "insert", payload });
    return this;
  }

  upsert(payload: unknown, options: unknown): this {
    this.client.push({ table: this.table, action: "upsert", payload, options });
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

describe("Supabase customer/message repositories", () => {
  it("exports repositories without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("@amami-line-crm/db")).resolves.toHaveProperty(
      "SupabaseCustomerRepository"
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("finds a customer by tenant and id with tenant-scoped filters", async () => {
    const client = createFakeClient();
    client.setResult("customers", "maybeSingle", { data: createCustomer(), error: null });
    const repository = new SupabaseCustomerRepository(asRepositoryClient(client));

    const customer = await repository.findByIdForTenant(tenantId, "customer_1");

    expect(customer?.id).toBe("customer_1");
    expect(customer?.tenant_id).toBe(tenantId);
    expect(client.operations).toContainEqual({
      table: "customers",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
    expect(client.operations).toContainEqual({
      table: "customers",
      action: "eq",
      column: "id",
      value: "customer_1"
    });
  });

  it("finds a customer by tenant and LINE user id without cross-tenant lookup", async () => {
    const client = createFakeClient();
    client.setResult("customers", "maybeSingle", { data: createCustomer(), error: null });
    const repository = new SupabaseCustomerRepository(asRepositoryClient(client));

    await repository.findByTenantAndLineUserId(tenantId, "line_user_1");

    expect(client.operations).toContainEqual({
      table: "customers",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
    expect(client.operations).toContainEqual({
      table: "customers",
      action: "eq",
      column: "line_user_id",
      value: "line_user_1"
    });
  });

  it("lists only customers from the requested tenant", async () => {
    const client = createFakeClient();
    client.setResult("customers", "list", {
      data: [createCustomer(), createCustomer({ id: "customer_other", tenant_id: otherTenantId })],
      error: null
    });
    const repository = new SupabaseCustomerRepository(asRepositoryClient(client));

    const customers = await repository.listByTenant(tenantId);

    expect(customers.map((customer) => customer.id)).toEqual(["customer_1"]);
    expect(client.operations).toContainEqual({
      table: "customers",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
  });

  it("upserts a customer with tenant_id in the payload", async () => {
    const client = createFakeClient();
    client.setResult("customers", "single", { data: createCustomer(), error: null });
    const repository = new SupabaseCustomerRepository(asRepositoryClient(client));

    const customer = await repository.save(createCustomer());

    expect(customer.tenant_id).toBe(tenantId);
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "customers",
        action: "upsert",
        payload: expect.objectContaining({
          id: "customer_1",
          tenant_id: tenantId,
          line_user_id: "line_user_1"
        }),
        options: { onConflict: "id" }
      })
    );
  });

  it("throws a repository error when Supabase returns an error", async () => {
    const client = createFakeClient();
    client.setResult("customers", "maybeSingle", {
      data: null,
      error: { message: "database unavailable" }
    });
    const repository = new SupabaseCustomerRepository(asRepositoryClient(client));

    await expect(repository.findByIdForTenant(tenantId, "customer_1")).rejects.toThrow(
      SupabaseRepositoryError
    );
  });

  it("inserts a message with tenant_id in the payload", async () => {
    const client = createFakeClient();
    client.setResult("messages", "single", { data: createMessage(), error: null });
    const repository = new SupabaseMessageRepository(asRepositoryClient(client));

    const message = await repository.insert(createMessage());

    expect(message.tenant_id).toBe(tenantId);
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "messages",
        action: "insert",
        payload: expect.objectContaining({
          id: "message_1",
          tenant_id: tenantId,
          customer_id: "customer_1"
        })
      })
    );
  });

  it("lists a customer timeline by tenant and customer in ascending order", async () => {
    const client = createFakeClient();
    client.setResult("messages", "list", {
      data: [
        createMessage({ id: "message_late", created_at: "2026-06-14T00:20:00.000Z" }),
        createMessage({ id: "message_other_tenant", tenant_id: otherTenantId }),
        createMessage({ id: "message_other_customer", customer_id: "customer_2" }),
        createMessage({ id: "message_early", created_at: "2026-06-14T00:10:00.000Z" })
      ],
      error: null
    });
    const repository = new SupabaseMessageRepository(asRepositoryClient(client));

    const messages = await repository.listByCustomer(tenantId, "customer_1");

    expect(messages.map((message) => message.id)).toEqual(["message_early", "message_late"]);
    expect(client.operations).toContainEqual({
      table: "messages",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
    expect(client.operations).toContainEqual({
      table: "messages",
      action: "eq",
      column: "customer_id",
      value: "customer_1"
    });
    expect(client.operations).toContainEqual({
      table: "messages",
      action: "order",
      column: "created_at",
      ascending: true
    });
  });

  it("finds latest messages by tenant and customer ids", async () => {
    const client = createFakeClient();
    client.setResult("messages", "list", {
      data: [
        createMessage({ id: "customer_1_old", created_at: "2026-06-14T00:10:00.000Z" }),
        createMessage({ id: "customer_2_latest", customer_id: "customer_2" }),
        createMessage({ id: "other_tenant_latest", tenant_id: otherTenantId }),
        createMessage({ id: "customer_1_latest", created_at: "2026-06-14T00:30:00.000Z" })
      ],
      error: null
    });
    const repository = new SupabaseMessageRepository(asRepositoryClient(client));

    const latest = await repository.findLatestByCustomerIds(tenantId, ["customer_1", "customer_2"]);

    expect(
      Array.from(latest.entries()).map(([customerId, message]) => [customerId, message.id])
    ).toEqual([
      ["customer_1", "customer_1_latest"],
      ["customer_2", "customer_2_latest"]
    ]);
    expect(client.operations).toContainEqual({
      table: "messages",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
    expect(client.operations).toContainEqual({
      table: "messages",
      action: "in",
      column: "customer_id",
      values: ["customer_1", "customer_2"]
    });
    expect(client.operations).toContainEqual({
      table: "messages",
      action: "order",
      column: "created_at",
      ascending: false
    });
  });

  it("does not query Supabase when latest message customer ids are empty", async () => {
    const client = createFakeClient();
    const repository = new SupabaseMessageRepository(asRepositoryClient(client));

    const latest = await repository.findLatestByCustomerIds(tenantId, []);

    expect(latest.size).toBe(0);
    expect(client.operations).toEqual([]);
  });
});

function createFakeClient(): FakeSupabaseClient {
  return new FakeSupabaseClient();
}

function asRepositoryClient(client: FakeSupabaseClient): SupabaseRepositoryClient {
  return client as unknown as SupabaseRepositoryClient;
}

function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "customer_1",
    tenant_id: tenantId,
    line_user_id: "line_user_1",
    display_name: "Demo Customer",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "bot_auto",
    status: "new",
    last_message_at: now,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "message_1",
    tenant_id: tenantId,
    customer_id: "customer_1",
    consultation_id: null,
    line_message_id: "line_message_1",
    role: "customer",
    message_type: "text",
    body: "こんにちは",
    media_storage_path: null,
    staff_user_id: null,
    ai_generated: false,
    sent_to_line_at: null,
    created_at: "2026-06-14T00:20:00.000Z",
    ...overrides
  };
}
