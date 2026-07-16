import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Customer
} from "@amami-line-crm/domain";

const channelSecret = "test_line_channel_secret";
const fixtureBody = readFileSync(
  new URL("../fixtures/line-webhook-follow-and-message.json", import.meta.url),
  "utf8"
);

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
}) {
  return createApiApp({
    customerRepository: input.customerRepository,
    messageRepository: input.messageRepository,
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

describe("admin customer detail and timeline API", () => {
  it("returns 401/403 before reading customer detail or timeline", async () => {
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository: new InMemoryCustomerRepository(),
      messageRepository: new InMemoryMessageRepository()
    });

    const missingTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_001")
    );
    const unknownTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_001/timeline", {
        headers: { "x-tenant-id": "tenant_unknown" }
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

  it("returns 404 for a missing customer", async () => {
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository: new InMemoryCustomerRepository(),
      messageRepository: new InMemoryMessageRepository()
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_missing", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "customer_not_found" });
  });

  it("returns webhook-saved customer detail and tenant-scoped timeline in created_at order", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository
    });

    await app.fetch(signedLineWebhookRequest("wh_dev_amamihome", fixtureBody));
    const customer = getCustomerForTenant(customerRepository, "tenant_amamihome");

    await messageRepository.insert({
      id: "message_earlier_system",
      tenant_id: "tenant_amamihome",
      customer_id: customer.id,
      consultation_id: null,
      line_message_id: null,
      role: "system",
      message_type: "text",
      body: "初回受付メモ",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: false,
      sent_to_line_at: null,
      created_at: new Date(1710000000500).toISOString()
    });
    await customerRepository.save({
      ...customer,
      id: "customer_same_tenant_other",
      line_user_id: "U_TEST_USER_OTHER"
    });
    await messageRepository.insert({
      id: "message_other_customer",
      tenant_id: "tenant_amamihome",
      customer_id: "customer_same_tenant_other",
      consultation_id: null,
      line_message_id: null,
      role: "system",
      message_type: "text",
      body: "別customerのメモ",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: false,
      sent_to_line_at: null,
      created_at: new Date(1710000000600).toISOString()
    });

    const detailResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const timelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const detailBody = await detailResponse.json();
    const timelineBody = await timelineResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailBody).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customer: {
        id: customer.id,
        tenant_id: "tenant_amamihome",
        line_user_id: "U_TEST_USER_001",
        line_display_name: null,
        name: null,
        phone: null,
        email: null,
        status: "new",
        response_mode: "bot_auto",
        assigned_staff_id: null,
        address_area: null,
        planned_area: null,
        has_land: null,
        desired_timing: null,
        temperature_score: null,
        tags: [],
        last_customer_message_at: new Date(1710000001000).toISOString(),
        last_staff_reply_at: null
      }
    });

    expect(timelineResponse.status).toBe(200);
    expect(timelineBody.ok).toBe(true);
    expect(timelineBody.tenant_id).toBe("tenant_amamihome");
    expect(timelineBody.customer_id).toBe(customer.id);
    expect(timelineBody.messages).toHaveLength(3);
    expect(timelineBody.messages.map((message: { body: string | null }) => message.body)).toEqual([
      "初回受付メモ",
      "モデルホームを見学したいです",
      expect.stringContaining("公式ページで確認できます。")
    ]);
    expect(timelineBody.messages[1]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer.id,
      role: "customer",
      message_type: "text",
      body: "モデルホームを見学したいです",
      line_message_id: "test-line-message-001",
      source_url: null,
      attachment_available: false,
      created_at: new Date(1710000001000).toISOString()
    });
    expect(timelineBody.messages[2]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer.id,
      role: "bot",
      message_type: "text",
      source_url: null,
      attachment_available: false,
      created_at: new Date(1710000001000).toISOString()
    });
  });

  it("hides pending LINE replies until delivery is confirmed", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository
    });

    await app.fetch(signedLineWebhookRequest("wh_dev_amamihome", fixtureBody));
    const customer = getCustomerForTenant(customerRepository, "tenant_amamihome");
    const pendingReply = await messageRepository.insert({
      id: "message_pending_line_reply",
      tenant_id: "tenant_amamihome",
      customer_id: customer.id,
      consultation_id: null,
      line_message_id: null,
      role: "bot",
      message_type: "summary",
      body: "まだLINEへ届いていない返信",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: true,
      sent_to_line_at: null,
      created_at: new Date(1710000002000).toISOString()
    });

    const pendingTimelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const pendingTimelineBody = await pendingTimelineResponse.json();
    const latestBeforeConfirmation = await messageRepository.findLatestByCustomerIds(
      "tenant_amamihome",
      [customer.id]
    );

    expect(pendingTimelineResponse.status).toBe(200);
    expect(
      pendingTimelineBody.messages.map((message: { body: string | null }) => message.body)
    ).not.toContain("まだLINEへ届いていない返信");
    expect(latestBeforeConfirmation.get(customer.id)?.id).not.toBe(pendingReply.id);

    await messageRepository.updateSentToLineAt({
      tenant_id: "tenant_amamihome",
      message_id: pendingReply.id,
      sent_to_line_at: new Date(1710000002500).toISOString()
    });

    const confirmedTimelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const confirmedTimelineBody = await confirmedTimelineResponse.json();
    const latestAfterConfirmation = await messageRepository.findLatestByCustomerIds(
      "tenant_amamihome",
      [customer.id]
    );

    expect(confirmedTimelineResponse.status).toBe(200);
    expect(confirmedTimelineBody.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: pendingReply.id,
          role: "bot",
          message_type: "text",
          body: "まだLINEへ届いていない返信"
        })
      ])
    );
    expect(latestAfterConfirmation.get(customer.id)?.id).toBe(pendingReply.id);
  });

  it("returns 404 for another tenant customer detail and timeline", async () => {
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

    const detailResponse = await amamiApp.fetch(
      new Request(`http://localhost/api/admin/customers/${otherCustomer.id}`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const timelineResponse = await amamiApp.fetch(
      new Request(`http://localhost/api/admin/customers/${otherCustomer.id}/timeline`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(detailResponse.status).toBe(404);
    expect(await detailResponse.json()).toEqual({ ok: false, error: "customer_not_found" });
    expect(timelineResponse.status).toBe(404);
    expect(await timelineResponse.json()).toEqual({ ok: false, error: "customer_not_found" });
  });
});
