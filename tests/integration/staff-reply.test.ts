import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Customer
} from "@amami-line-crm/domain";
import { MockLineClient, type LineClient, type LineReplyMessage } from "@amami-line-crm/line";

const channelSecret = "test_line_channel_secret";
const fixtureBody = readFileSync(
  new URL("../fixtures/line-webhook-follow-and-message.json", import.meta.url),
  "utf8"
);

class FailingLineClient implements LineClient {
  readonly pushes: Array<{ to: string; messages: LineReplyMessage[] }> = [];

  async replyMessage(_replyToken: string, _messages: LineReplyMessage[]): Promise<void> {
    throw new Error("replyMessage is not used by staff reply.");
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    this.pushes.push({ to, messages });
    throw new Error("Mock push failure.");
  }
}

function signBody(body: string): string {
  return createHmac("sha256", channelSecret).update(body).digest("base64");
}

function signedLineWebhookRequest(webhookSecret: string, body: string): Request {
  return new Request(`http://localhost/api/line/webhook/${webhookSecret}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-line-signature": signBody(body)
    },
    body
  });
}

function createTestApp(input: {
  tenantId: string;
  tenantSlug: string;
  webhookSecret: string;
  customerRepository: InMemoryCustomerRepository;
  messageRepository: InMemoryMessageRepository;
  lineClient?: LineClient;
}) {
  return createApiApp({
    customerRepository: input.customerRepository,
    messageRepository: input.messageRepository,
    ...(input.lineClient ? { lineClient: input.lineClient } : {}),
    env: {
      LINE_CHANNEL_SECRET: channelSecret,
      LINE_WEBHOOK_SECRET_PATH: input.webhookSecret,
      TENANT_ID: input.tenantId,
      TENANT_SLUG: input.tenantSlug
    }
  });
}

function getCustomerForTenant(
  customerRepository: InMemoryCustomerRepository,
  tenantId: string
): Customer {
  const customer = customerRepository.list().find((item) => item.tenant_id === tenantId);

  if (!customer) {
    throw new Error(`Expected customer for ${tenantId}.`);
  }

  return customer;
}

function makeCustomer(input: {
  id: string;
  tenantId: string;
  lineUserId: string | null;
}): Customer {
  return {
    id: input.id,
    tenant_id: input.tenantId,
    line_user_id: input.lineUserId,
    display_name: null,
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "bot_auto",
    status: "new",
    last_message_at: null,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: "2026-06-13T00:00:00.000Z",
    updated_at: "2026-06-13T00:00:00.000Z"
  };
}

describe("admin staff reply API", () => {
  it("returns 401/403 before reading a staff reply request", async () => {
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository: new InMemoryCustomerRepository(),
      messageRepository: new InMemoryMessageRepository()
    });

    const missingTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_001/reply", {
        method: "POST",
        body: JSON.stringify({ body: "承知しました" })
      })
    );
    const unknownTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_001/reply", {
        method: "POST",
        headers: { "x-tenant-id": "tenant_unknown" },
        body: JSON.stringify({ body: "承知しました" })
      })
    );

    expect(missingTenantResponse.status).toBe(401);
    expect(await missingTenantResponse.json()).toEqual({
      ok: false,
      error: "missing_tenant_id"
    });
    expect(unknownTenantResponse.status).toBe(403);
    expect(await unknownTenantResponse.json()).toEqual({
      ok: false,
      error: "unknown_tenant_id"
    });
  });

  it("returns 404 for missing or another tenant customer", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const amamiApp = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository
    });
    const otherApp = createTestApp({
      tenantId: "tenant_other",
      tenantSlug: "other",
      webhookSecret: "wh_dev_other",
      customerRepository,
      messageRepository
    });

    await otherApp.fetch(signedLineWebhookRequest("wh_dev_other", fixtureBody));
    const otherCustomer = getCustomerForTenant(customerRepository, "tenant_other");

    const missingCustomerResponse = await amamiApp.fetch(
      new Request("http://localhost/api/admin/customers/customer_missing/reply", {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify({ body: "承知しました" })
      })
    );
    const otherTenantResponse = await amamiApp.fetch(
      new Request(`http://localhost/api/admin/customers/${otherCustomer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify({ body: "承知しました" })
      })
    );

    expect(missingCustomerResponse.status).toBe(404);
    expect(await missingCustomerResponse.json()).toEqual({
      ok: false,
      error: "customer_not_found"
    });
    expect(otherTenantResponse.status).toBe(404);
    expect(await otherTenantResponse.json()).toEqual({ ok: false, error: "customer_not_found" });
  });

  it("returns 400 for invalid reply body", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository: new InMemoryMessageRepository()
    });
    await customerRepository.save(
      makeCustomer({
        id: "customer_amami",
        tenantId: "tenant_amamihome",
        lineUserId: "U_TEST_USER_001"
      })
    );

    for (const body of [{ body: "" }, { body: "   " }, { body: 123 }]) {
      const response = await app.fetch(
        new Request("http://localhost/api/admin/customers/customer_amami/reply", {
          method: "POST",
          headers: { "x-tenant-id": "tenant_amamihome" },
          body: JSON.stringify(body)
        })
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error: "invalid_reply_body" });
    }
  });

  it("returns 409 when the customer has no line_user_id", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository: new InMemoryMessageRepository()
    });
    await customerRepository.save(
      makeCustomer({
        id: "customer_without_line",
        tenantId: "tenant_amamihome",
        lineUserId: null
      })
    );

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_without_line/reply", {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify({ body: "承知しました" })
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "cannot_reply_without_line_user_id"
    });
  });

  it("pushes through MockLineClient, saves a staff message, and exposes it in timeline", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new MockLineClient();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient
    });

    await app.fetch(signedLineWebhookRequest("wh_dev_amamihome", fixtureBody));
    const customer = getCustomerForTenant(customerRepository, "tenant_amamihome");

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome",
          "x-staff-id": "staff_001"
        },
        body: JSON.stringify({ body: "ご見学について担当者からご案内します" })
      })
    );
    const body = await response.json();
    const updatedCustomer = await customerRepository.findByIdForTenant(
      "tenant_amamihome",
      customer.id
    );
    const timelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const timelineBody = await timelineResponse.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customer_id: customer.id,
      message: {
        tenant_id: "tenant_amamihome",
        customer_id: customer.id,
        role: "staff",
        message_type: "text",
        body: "ご見学について担当者からご案内します",
        line_message_id: null,
        source_url: null
      },
      customer: {
        tenant_id: "tenant_amamihome",
        response_mode: "human_active"
      }
    });
    expect(lineClient.pushes).toEqual([
      {
        to: "U_TEST_USER_001",
        messages: [{ type: "text", text: "ご見学について担当者からご案内します" }]
      }
    ]);
    expect(updatedCustomer).toMatchObject({
      tenant_id: "tenant_amamihome",
      response_mode: "human_active"
    });
    expect(updatedCustomer?.last_staff_reply_at).toEqual(body.customer.last_staff_reply_at);
    expect(updatedCustomer?.last_staff_reply_at).not.toBeNull();
    expect(messageRepository.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenant_id: "tenant_amamihome",
          customer_id: customer.id,
          role: "staff",
          message_type: "text",
          body: "ご見学について担当者からご案内します",
          staff_user_id: "staff_001"
        })
      ])
    );
    expect(timelineResponse.status).toBe(200);
    expect(timelineBody.messages.at(-1)).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer.id,
      role: "staff",
      message_type: "text",
      body: "ご見学について担当者からご案内します"
    });
  });

  it("does not save a staff message when mock LINE push fails", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new FailingLineClient();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient
    });

    await app.fetch(signedLineWebhookRequest("wh_dev_amamihome", fixtureBody));
    const customer = getCustomerForTenant(customerRepository, "tenant_amamihome");

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify({ body: "送信失敗テスト" })
      })
    );
    const updatedCustomer = await customerRepository.findByIdForTenant(
      "tenant_amamihome",
      customer.id
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "line_send_failed" });
    expect(lineClient.pushes).toHaveLength(1);
    expect(messageRepository.list()).toHaveLength(1);
    expect(messageRepository.list()).not.toEqual([
      expect.objectContaining({ role: "staff", body: "送信失敗テスト" })
    ]);
    expect(updatedCustomer).toMatchObject({
      response_mode: "bot_auto",
      last_staff_reply_at: null
    });
  });
});
