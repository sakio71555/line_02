import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import { InMemoryCustomerRepository, InMemoryMessageRepository } from "@amami-line-crm/domain";

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

describe("admin customer list API", () => {
  it("returns 401 when x-tenant-id is missing", async () => {
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository: new InMemoryCustomerRepository(),
      messageRepository: new InMemoryMessageRepository()
    });

    const response = await app.fetch(new Request("http://localhost/api/admin/customers"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "missing_tenant_id" });
  });

  it("returns 403 when x-tenant-id is not a known development tenant", async () => {
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository: new InMemoryCustomerRepository(),
      messageRepository: new InMemoryMessageRepository()
    });

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_unknown" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ ok: false, error: "unknown_tenant_id" });
  });

  it("lists only customers for the requested tenant and includes latest message fields", async () => {
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

    await amamiApp.fetch(signedLineWebhookRequest("wh_dev_amamihome", fixtureBody));
    await otherApp.fetch(signedLineWebhookRequest("wh_dev_other", fixtureBody));

    const response = await amamiApp.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.tenant_id).toBe("tenant_amamihome");
    expect(body.customers).toHaveLength(1);
    expect(body.customers[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      line_user_id: "U_TEST_USER_001",
      response_mode: "human_required",
      last_message_body: "モデルホームを見学したいです",
      last_message_at: new Date(1710000001000).toISOString(),
      last_customer_message_at: new Date(1710000001000).toISOString()
    });
  });
});
