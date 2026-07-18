import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  InMemoryOperationsRepository,
  type Customer,
  type Message
} from "@amami-line-crm/domain";

const tenantId = "tenant_amamihome";

describe("API customer/message runtime bundle", () => {
  it("uses an injected customer/message bundle for customer detail timeline staff reply and AI summary", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const operationsRepository = new InMemoryOperationsRepository();
    const app = createApiApp({
      customerMessageRepositories: {
        runtime_mode: "supabase",
        customerRepository,
        messageRepository
      },
      operationsRepository,
      now: () => "2026-06-16T00:10:00.000Z",
      env: {
        TENANT_ID: tenantId,
        TENANT_SLUG: "amamihome"
      }
    });

    await customerRepository.save(createCustomer());
    await messageRepository.insert(createMessage());

    const listResponse = await app.fetch(adminRequest("/api/admin/customers"));
    const listBody = (await listResponse.json()) as {
      customers: Array<{ id: string; tenant_id: string; last_message_body: string | null }>;
    };

    expect(listResponse.status).toBe(200);
    expect(listBody.customers).toEqual([
      expect.objectContaining({
        id: "customer_runtime_1",
        tenant_id: tenantId,
        last_message_body: "モデルホーム見学について相談したいです。"
      })
    ]);

    const detailResponse = await app.fetch(adminRequest("/api/admin/customers/customer_runtime_1"));
    const detailBody = (await detailResponse.json()) as {
      customer: { id: string; tenant_id: string };
    };

    expect(detailResponse.status).toBe(200);
    expect(detailBody.customer).toMatchObject({
      id: "customer_runtime_1",
      tenant_id: tenantId
    });

    const initialTimelineResponse = await app.fetch(
      adminRequest("/api/admin/customers/customer_runtime_1/timeline")
    );
    const initialTimelineBody = (await initialTimelineResponse.json()) as {
      messages: Array<{ id: string; role: string; tenant_id: string }>;
    };

    expect(initialTimelineResponse.status).toBe(200);
    expect(initialTimelineBody.messages.map((message) => message.id)).toEqual([
      "message_runtime_1"
    ]);
    expect(initialTimelineBody.messages.every((message) => message.tenant_id === tenantId)).toBe(
      true
    );

    const replyResponse = await app.fetch(
      adminRequest("/api/admin/customers/customer_runtime_1/reply", {
        method: "POST",
        headers: { "content-type": "application/json", "x-staff-id": "staff_runtime_test" },
        body: JSON.stringify({ body: "日程候補を確認します。" })
      })
    );
    const replyBody = (await replyResponse.json()) as {
      delivery_status: string;
      internal_note: { tenant_id: string; customer_id: string; body: string };
    };

    expect(replyResponse.status).toBe(200);
    expect(replyBody).toMatchObject({
      delivery_status: "saved_as_internal_note",
      internal_note: {
        tenant_id: tenantId,
        customer_id: "customer_runtime_1",
        body: "日程候補を確認します。"
      }
    });
    expect(
      await operationsRepository.listInternalNotes(tenantId, "customer_runtime_1")
    ).toHaveLength(1);

    const summaryResponse = await app.fetch(
      adminRequest("/api/admin/customers/customer_runtime_1/ai-summary", {
        method: "POST"
      })
    );
    const summaryBody = (await summaryResponse.json()) as {
      message: { role: string; message_type: string; tenant_id: string };
    };

    expect(summaryResponse.status).toBe(200);
    expect(summaryBody.message).toMatchObject({
      role: "ai",
      message_type: "summary",
      tenant_id: tenantId
    });

    const restartedApp = createApiApp({
      customerMessageRepositories: {
        runtime_mode: "supabase",
        customerRepository,
        messageRepository
      },
      operationsRepository,
      env: {
        TENANT_ID: tenantId,
        TENANT_SLUG: "amamihome"
      }
    });
    const persistedTimelineResponse = await restartedApp.fetch(
      adminRequest("/api/admin/customers/customer_runtime_1/timeline")
    );
    const persistedTimelineBody = (await persistedTimelineResponse.json()) as {
      messages: Array<{ role: string; message_type: string; tenant_id: string }>;
    };

    expect(persistedTimelineResponse.status).toBe(200);
    expect(persistedTimelineBody.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "customer", message_type: "text", tenant_id: tenantId }),
        expect.objectContaining({ role: "ai", message_type: "summary", tenant_id: tenantId })
      ])
    );
  });

  it("keeps explicit repository injection compatible with existing tests", async () => {
    const explicitCustomerRepository = new InMemoryCustomerRepository();
    const explicitMessageRepository = new InMemoryMessageRepository();
    const bundleCustomerRepository = new InMemoryCustomerRepository();
    const bundleMessageRepository = new InMemoryMessageRepository();
    const app = createApiApp({
      customerRepository: explicitCustomerRepository,
      messageRepository: explicitMessageRepository,
      customerMessageRepositories: {
        runtime_mode: "supabase",
        customerRepository: bundleCustomerRepository,
        messageRepository: bundleMessageRepository
      },
      env: {
        TENANT_ID: tenantId,
        TENANT_SLUG: "amamihome"
      }
    });

    await explicitCustomerRepository.save(createCustomer({ id: "customer_explicit" }));
    await bundleCustomerRepository.save(createCustomer({ id: "customer_bundle" }));

    const response = await app.fetch(adminRequest("/api/admin/customers"));
    const body = (await response.json()) as { customers: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.customers.map((customer) => customer.id)).toEqual(["customer_explicit"]);
  });
});

function adminRequest(
  path: string,
  init: RequestInit & { headers?: HeadersInit } = {}
): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      "x-tenant-id": tenantId,
      ...init.headers
    }
  });
}

function createCustomer(input: Partial<Customer> = {}): Customer {
  return {
    id: "customer_runtime_1",
    tenant_id: tenantId,
    line_user_id: "dummy_line_user_runtime_1",
    display_name: "Runtime Demo",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: ["モデルホーム"],
    response_mode: "human_required",
    status: "active",
    last_message_at: "2026-06-16T00:00:00.000Z",
    last_customer_message_at: "2026-06-16T00:00:00.000Z",
    last_staff_reply_at: null,
    created_at: "2026-06-16T00:00:00.000Z",
    updated_at: "2026-06-16T00:00:00.000Z",
    ...input
  };
}

function createMessage(input: Partial<Message> = {}): Message {
  return {
    id: "message_runtime_1",
    tenant_id: tenantId,
    customer_id: "customer_runtime_1",
    consultation_id: null,
    line_message_id: "dummy_line_message_runtime_1",
    role: "customer",
    message_type: "text",
    body: "モデルホーム見学について相談したいです。",
    media_storage_path: null,
    staff_user_id: null,
    ai_generated: false,
    sent_to_line_at: null,
    created_at: "2026-06-16T00:00:00.000Z",
    ...input
  };
}
