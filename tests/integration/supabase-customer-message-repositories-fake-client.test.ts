import { describe, expect, it } from "vitest";
import type { Customer, Message } from "@amami-line-crm/domain";

import {
  createSupabaseCustomerMessageRepositories,
  SupabaseCustomerRepository,
  SupabaseMessageRepository,
  SupabaseRepositoryError
} from "@amami-line-crm/db";

import { FakeSupabaseClient } from "../helpers/fake-supabase-client";

const tenantId = "tenant_amamihome";
const otherTenantId = "tenant_other";
const now = "2026-06-15T00:00:00.000Z";

describe("Supabase customer/message repositories with fake client", () => {
  it("writes and maps a tenant-scoped customer payload without dropping profile fields", async () => {
    const client = new FakeSupabaseClient();
    const customer = createCustomer({
      picture_url: "https://example.com/avatar.png",
      phone: "000-0000-0000",
      email: "demo@example.com",
      postal_code: "000-0000",
      address: "鹿児島県奄美市の架空住所",
      interest_tags: ["平屋", "SoToNo MA"],
      response_mode: "human_required",
      status: "active",
      last_message_at: "2026-06-15T00:01:00.000Z",
      last_customer_message_at: "2026-06-15T00:02:00.000Z",
      last_staff_reply_at: "2026-06-15T00:03:00.000Z"
    });
    client.setResult("customers", "single", { data: customer, error: null });
    const repository = new SupabaseCustomerRepository(client.asRepositoryClient());

    const saved = await repository.save(customer);

    expect(saved).toEqual(customer);
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "customers",
        action: "upsert",
        options: { onConflict: "id" },
        payload: expect.objectContaining({
          id: "customer_1",
          tenant_id: tenantId,
          line_user_id: "line_user_1",
          display_name: "Demo Customer",
          picture_url: "https://example.com/avatar.png",
          phone: "000-0000-0000",
          email: "demo@example.com",
          postal_code: "000-0000",
          address: "鹿児島県奄美市の架空住所",
          interest_tags: ["平屋", "SoToNo MA"],
          response_mode: "human_required",
          status: "active",
          last_message_at: "2026-06-15T00:01:00.000Z",
          last_customer_message_at: "2026-06-15T00:02:00.000Z",
          last_staff_reply_at: "2026-06-15T00:03:00.000Z",
          created_at: now,
          updated_at: now
        })
      })
    );
  });

  it("reads only the requested tenant customers and maps null interest_tags safely", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("customers", "list", {
      data: [
        createCustomerRow({ id: "customer_1", interest_tags: null }),
        createCustomerRow({ id: "customer_other", tenant_id: otherTenantId })
      ],
      error: null
    });
    const repository = new SupabaseCustomerRepository(client.asRepositoryClient());

    const customers = await repository.listByTenant(tenantId);

    expect(customers).toEqual([
      expect.objectContaining({
        id: "customer_1",
        tenant_id: tenantId,
        interest_tags: []
      })
    ]);
    expect(client.operations).toContainEqual({
      table: "customers",
      action: "eq",
      column: "tenant_id",
      value: tenantId
    });
  });

  it("writes and maps a tenant-scoped message payload with timeline fields", async () => {
    const client = new FakeSupabaseClient();
    const message = createMessage({
      consultation_id: "consultation_1",
      line_message_id: "line_message_1",
      role: "staff",
      message_type: "text",
      body: "モデルホーム見学の日程を確認します。",
      media_storage_path: "tenants/tenant_amamihome/messages/file.pdf",
      staff_user_id: "staff_1",
      ai_generated: false,
      sent_to_line_at: "2026-06-15T00:04:00.000Z"
    });
    client.setResult("messages", "single", { data: message, error: null });
    const repository = new SupabaseMessageRepository(client.asRepositoryClient());

    const inserted = await repository.insert(message);

    expect(inserted).toEqual(message);
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "messages",
        action: "insert",
        payload: expect.objectContaining({
          id: "message_1",
          tenant_id: tenantId,
          customer_id: "customer_1",
          consultation_id: "consultation_1",
          line_message_id: "line_message_1",
          role: "staff",
          message_type: "text",
          body: "モデルホーム見学の日程を確認します。",
          media_storage_path: "tenants/tenant_amamihome/messages/file.pdf",
          staff_user_id: "staff_1",
          ai_generated: false,
          sent_to_line_at: "2026-06-15T00:04:00.000Z",
          created_at: now
        })
      })
    );
  });

  it("lists timeline messages by tenant and customer with created_at ascending order", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("messages", "list", {
      data: [
        createMessage({ id: "late", created_at: "2026-06-15T00:20:00.000Z" }),
        createMessage({ id: "other_tenant", tenant_id: otherTenantId }),
        createMessage({ id: "other_customer", customer_id: "customer_2" }),
        createMessage({ id: "early", created_at: "2026-06-15T00:10:00.000Z" })
      ],
      error: null
    });
    const repository = new SupabaseMessageRepository(client.asRepositoryClient());

    const messages = await repository.listByCustomer(tenantId, "customer_1");

    expect(messages.map((message) => message.id)).toEqual(["early", "late"]);
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

  it("finds latest messages by tenant and requested customer ids only", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("messages", "list", {
      data: [
        createMessage({ id: "customer_1_old", created_at: "2026-06-15T00:10:00.000Z" }),
        createMessage({ id: "customer_1_latest", created_at: "2026-06-15T00:30:00.000Z" }),
        createMessage({ id: "customer_2_latest", customer_id: "customer_2" }),
        createMessage({ id: "other_tenant_latest", tenant_id: otherTenantId }),
        createMessage({ id: "not_requested_customer", customer_id: "customer_3" })
      ],
      error: null
    });
    const repository = new SupabaseMessageRepository(client.asRepositoryClient());

    const latest = await repository.findLatestByCustomerIds(tenantId, ["customer_1", "customer_2"]);

    expect(Array.from(latest.entries()).map(([customerId, message]) => [customerId, message.id])).toEqual([
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

  it("wraps Supabase errors without leaking secret or URL values", async () => {
    const client = new FakeSupabaseClient();
    const secretValue = "secret-service-role-key-value";
    const urlValue = "https://example.supabase.co";
    client.setResult("messages", "list", {
      data: null,
      error: {
        message: `failed with ${secretValue}`,
        code: "PGRST500",
        details: `connected to ${urlValue}`,
        hint: "check service role key"
      }
    });
    const repository = new SupabaseMessageRepository(client.asRepositoryClient());

    await expect(repository.listByCustomer(tenantId, "customer_1")).rejects.toThrow(
      SupabaseRepositoryError
    );

    try {
      await repository.listByCustomer(tenantId, "customer_1");
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseRepositoryError);
      expect(String(error)).toContain("Supabase messages.listByCustomer failed");
      expect(String(error)).toContain("PGRST500");
      expect(String(error)).not.toContain(secretValue);
      expect(String(error)).not.toContain(urlValue);
      expect(JSON.stringify((error as SupabaseRepositoryError).causeError)).not.toContain(
        secretValue
      );
      expect(JSON.stringify((error as SupabaseRepositoryError).causeError)).not.toContain(urlValue);
    }
  });

  it("builds runtime bundle repositories with fake client and uses the same tenant-scoped mapping", async () => {
    const client = new FakeSupabaseClient();
    client.setResult("customers", "single", { data: createCustomer(), error: null });
    client.setResult("messages", "single", { data: createMessage(), error: null });
    const bundle = createSupabaseCustomerMessageRepositories({
      client: client.asRepositoryClient()
    });

    const customer = await bundle.customerRepository.save(createCustomer());
    const message = await bundle.messageRepository.insert(createMessage());

    expect(bundle.runtime_mode).toBe("supabase");
    expect(customer.tenant_id).toBe(tenantId);
    expect(message.tenant_id).toBe(tenantId);
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "customers",
        action: "upsert",
        payload: expect.objectContaining({ tenant_id: tenantId })
      })
    );
    expect(client.operations).toContainEqual(
      expect.objectContaining({
        table: "messages",
        action: "insert",
        payload: expect.objectContaining({ tenant_id: tenantId })
      })
    );
  });
});

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
    last_customer_message_at: now,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function createCustomerRow(
  overrides: Partial<Customer> & { interest_tags?: string[] | null } = {}
): Customer & { interest_tags: string[] | null } {
  const { interest_tags, ...customerOverrides } = overrides;

  return {
    ...createCustomer(customerOverrides),
    interest_tags: interest_tags === undefined ? [] : interest_tags
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
    created_at: now,
    ...overrides
  };
}
