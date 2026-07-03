import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import { InMemoryCustomerRepository, InMemoryMessageRepository } from "@amami-line-crm/domain";
import type { LineClient, LineReplyMessage, LineUserProfile } from "@amami-line-crm/line";

const channelSecret = "test_line_channel_secret";
const knownWebhookSecret = "wh_dev_amamihome";
const fixtureBody = readFileSync(
  new URL("../fixtures/line-webhook-follow-and-message.json", import.meta.url),
  "utf8"
);

function signedRequest(path: string, body: string, signature = signBody(body)): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-line-signature": signature
    },
    body
  });
}

function signBody(body: string): string {
  return createHmac("sha256", channelSecret).update(body).digest("base64");
}

function createTestContext(
  input: {
    tenantId?: string;
    tenantSlug?: string;
    webhookSecret?: string;
    lineClient?: LineClient;
  } = {}
) {
  const customerRepository = new InMemoryCustomerRepository();
  const messageRepository = new InMemoryMessageRepository();
  const app = createApiApp({
    customerRepository,
    messageRepository,
    ...(input.lineClient ? { lineClient: input.lineClient } : {}),
    env: {
      LINE_CHANNEL_SECRET: channelSecret,
      LINE_WEBHOOK_SECRET_PATH: input.webhookSecret ?? knownWebhookSecret,
      TENANT_ID: input.tenantId ?? "tenant_amamihome",
      TENANT_SLUG: input.tenantSlug ?? "amamihome"
    }
  });

  return {
    app,
    customerRepository,
    messageRepository
  };
}

describe("LINE webhook foundation", () => {
  it("returns 200 and logs follow/text message events for a valid request", async () => {
    const { app, customerRepository, messageRepository } = createTestContext();
    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, fixtureBody)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      tenant_slug: "amamihome",
      destination: "U_TEST_DESTINATION",
      event_count: 2,
      logging: {
        customers_upserted: 2,
        messages_inserted: 1,
        unsupported_events: 0
      }
    });
    expect(body.events[0]).toMatchObject({
      event_id: "01TESTFOLLOWEVENT",
      type: "follow",
      source_user_id: "U_TEST_USER_001"
    });
    expect(body.events[1]).toMatchObject({
      event_id: "01TESTMESSAGEEVENT",
      type: "message",
      message_id: "test-line-message-001",
      message_type: "text",
      text: "モデルホームを見学したいです"
    });

    const customers = customerRepository.list();
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      line_user_id: "U_TEST_USER_001",
      response_mode: "bot_auto",
      last_customer_message_at: new Date(1710000001000).toISOString()
    });

    const messages = messageRepository.list();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customers[0]?.id,
      line_message_id: "test-line-message-001",
      role: "customer",
      message_type: "text",
      body: "モデルホームを見学したいです"
    });
  });

  it("stores the LINE profile display name when profile lookup succeeds", async () => {
    const lineClient = new ProfileLineClient({
      U_TEST_USER_001: {
        userId: "U_TEST_USER_001",
        displayName: "実機 太郎",
        pictureUrl: null,
        statusMessage: null,
        language: null
      }
    });
    const { app, customerRepository } = createTestContext({ lineClient });
    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, fixtureBody)
    );

    expect(response.status).toBe(200);
    expect(lineClient.profileRequests).toEqual(["U_TEST_USER_001"]);
    expect(customerRepository.list()[0]).toMatchObject({
      line_user_id: "U_TEST_USER_001",
      display_name: "実機 太郎"
    });
  });

  it("continues webhook logging when LINE profile lookup fails", async () => {
    const lineClient = new ProfileLineClient({}, { failProfileLookup: true });
    const { app, customerRepository, messageRepository } = createTestContext({ lineClient });
    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, fixtureBody)
    );

    expect(response.status).toBe(200);
    expect(customerRepository.list()[0]).toMatchObject({
      line_user_id: "U_TEST_USER_001",
      display_name: null
    });
    expect(messageRepository.list()).toHaveLength(1);
  });

  it("returns 401 when the raw-body signature is invalid", async () => {
    const { app, customerRepository, messageRepository } = createTestContext();
    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, fixtureBody, "invalid-signature")
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "invalid_line_signature" });
    expect(customerRepository.list()).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("returns 404 for an unknown webhook secret before trusting the body", async () => {
    const { app, customerRepository, messageRepository } = createTestContext();
    const response = await app.fetch(signedRequest("/api/line/webhook/unknown", fixtureBody));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ ok: false, error: "unknown_webhook_path" });
    expect(customerRepository.list()).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("returns 400 for malformed JSON after signature verification passes", async () => {
    const { app, customerRepository, messageRepository } = createTestContext();
    const malformedBody = "{not valid json";
    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, malformedBody)
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, error: "malformed_line_webhook_body" });
    expect(customerRepository.list()).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("keeps the same LINE user separated by webhook-resolved tenant_id", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const amamiApp = createApiApp({
      customerRepository,
      messageRepository,
      env: {
        LINE_CHANNEL_SECRET: channelSecret,
        LINE_WEBHOOK_SECRET_PATH: "wh_dev_amamihome",
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome"
      }
    });
    const otherApp = createApiApp({
      customerRepository,
      messageRepository,
      env: {
        LINE_CHANNEL_SECRET: channelSecret,
        LINE_WEBHOOK_SECRET_PATH: "wh_dev_other",
        TENANT_ID: "tenant_other",
        TENANT_SLUG: "other"
      }
    });

    await amamiApp.fetch(signedRequest("/api/line/webhook/wh_dev_amamihome", fixtureBody));
    await otherApp.fetch(signedRequest("/api/line/webhook/wh_dev_other", fixtureBody));

    expect(customerRepository.list()).toHaveLength(2);
    expect(customerRepository.list().map((customer) => customer.tenant_id).sort()).toEqual([
      "tenant_amamihome",
      "tenant_other"
    ]);
    expect(messageRepository.list()).toHaveLength(2);
    expect(messageRepository.list().map((message) => message.tenant_id).sort()).toEqual([
      "tenant_amamihome",
      "tenant_other"
    ]);
  });
});

class ProfileLineClient implements LineClient {
  readonly profileRequests: string[] = [];

  constructor(
    private readonly profiles: Record<string, LineUserProfile>,
    private readonly options: { failProfileLookup?: boolean } = {}
  ) {}

  async replyMessage(): Promise<void> {
    throw new Error("replyMessage is not used by webhook receive tests.");
  }

  async pushMessage(_to: string, _messages: LineReplyMessage[]): Promise<void> {
    throw new Error("pushMessage is not used by webhook receive tests.");
  }

  async getProfile(userId: string): Promise<LineUserProfile | null> {
    this.profileRequests.push(userId);

    if (this.options.failProfileLookup) {
      throw new Error("profile lookup failed");
    }

    return this.profiles[userId] ?? null;
  }
}
