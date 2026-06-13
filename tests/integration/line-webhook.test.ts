import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { app } from "../../apps/api/src/index";

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

function withLineEnv<T>(callback: () => Promise<T>): Promise<T> {
  const previousSecret = process.env.LINE_CHANNEL_SECRET;
  const previousWebhookPath = process.env.LINE_WEBHOOK_SECRET_PATH;
  const previousTenantId = process.env.TENANT_ID;
  const previousTenantSlug = process.env.TENANT_SLUG;

  process.env.LINE_CHANNEL_SECRET = channelSecret;
  process.env.LINE_WEBHOOK_SECRET_PATH = knownWebhookSecret;
  process.env.TENANT_ID = "tenant_amamihome";
  process.env.TENANT_SLUG = "amamihome";

  return callback().finally(() => {
    restoreEnv("LINE_CHANNEL_SECRET", previousSecret);
    restoreEnv("LINE_WEBHOOK_SECRET_PATH", previousWebhookPath);
    restoreEnv("TENANT_ID", previousTenantId);
    restoreEnv("TENANT_SLUG", previousTenantSlug);
  });
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

describe("LINE webhook foundation", () => {
  it("returns 200 for a known webhook secret and a valid raw-body signature", async () => {
    await withLineEnv(async () => {
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
        event_count: 2
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
    });
  });

  it("returns 401 when the raw-body signature is invalid", async () => {
    await withLineEnv(async () => {
      const response = await app.fetch(
        signedRequest(`/api/line/webhook/${knownWebhookSecret}`, fixtureBody, "invalid-signature")
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({ ok: false, error: "invalid_line_signature" });
    });
  });

  it("returns 404 for an unknown webhook secret before trusting the body", async () => {
    await withLineEnv(async () => {
      const response = await app.fetch(signedRequest("/api/line/webhook/unknown", fixtureBody));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ ok: false, error: "unknown_webhook_path" });
    });
  });

  it("returns 400 for malformed JSON after signature verification passes", async () => {
    await withLineEnv(async () => {
      const malformedBody = "{not valid json";
      const response = await app.fetch(
        signedRequest(`/api/line/webhook/${knownWebhookSecret}`, malformedBody)
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ ok: false, error: "malformed_line_webhook_body" });
    });
  });
});
