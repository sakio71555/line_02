import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import { InMemoryCustomerRepository, InMemoryMessageRepository } from "@amami-line-crm/domain";
import type { LineClient, LineReplyMessage } from "@amami-line-crm/line";

class FailingLineClient implements LineClient {
  async replyMessage(_replyToken: string, _messages: LineReplyMessage[]): Promise<never> {
    throw new Error("LINE reply must not be called by demo seed.");
  }

  async pushMessage(_to: string, _messages: LineReplyMessage[]): Promise<never> {
    throw new Error("LINE push must not be called by demo seed.");
  }
}

function createTestApp(input: {
  customerRepository?: InMemoryCustomerRepository;
  messageRepository?: InMemoryMessageRepository;
  env?: NodeJS.ProcessEnv;
} = {}) {
  const customerRepository = input.customerRepository ?? new InMemoryCustomerRepository();
  const messageRepository = input.messageRepository ?? new InMemoryMessageRepository();
  const app = createApiApp({
    customerRepository,
    messageRepository,
    lineClient: new FailingLineClient(),
    env: {
      TENANT_ID: "tenant_amamihome",
      TENANT_SLUG: "amamihome",
      ...input.env
    }
  });

  return {
    app,
    customerRepository,
    messageRepository
  };
}

function seedRequest(tenantId?: string): Request {
  const headers: HeadersInit = {};

  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  return new Request("http://localhost/api/dev/seed-demo-data", {
    method: "POST",
    headers
  });
}

describe("development demo seed API", () => {
  it("is disabled in production-like runtime", async () => {
    const { app, customerRepository, messageRepository } = createTestApp({
      env: { APP_ENV: "production" }
    });

    const response = await app.fetch(seedRequest("tenant_amamihome"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "dev_seed_disabled" });
    expect(customerRepository.list()).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("requires a known tenant header", async () => {
    const { app } = createTestApp();

    const missingTenantResponse = await app.fetch(seedRequest());
    const unknownTenantResponse = await app.fetch(seedRequest("tenant_unknown"));

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

  it("creates tenant-scoped demo customers and messages for the admin read-only UI", async () => {
    const { app, customerRepository, messageRepository } = createTestApp();

    const seedResponse = await app.fetch(seedRequest("tenant_amamihome"));
    const seedBody = await seedResponse.json();

    expect(seedResponse.status).toBe(200);
    expect(seedBody).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customer_ids: ["customer_demo_yamada_taro", "customer_demo_sato_hanako"],
      message_count: 4
    });
    expect(customerRepository.list()).toHaveLength(2);
    expect(messageRepository.list()).toHaveLength(4);
    expect(customerRepository.list().every((customer) => customer.tenant_id === "tenant_amamihome"))
      .toBe(true);
    expect(messageRepository.list().every((message) => message.tenant_id === "tenant_amamihome"))
      .toBe(true);

    const listResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.customers).toHaveLength(2);
    expect(
      listBody.customers.map((customer: { display_name: string | null }) => customer.display_name)
    ).toEqual(["佐藤 花子", "山田 太郎"]);

    const timelineResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_demo_yamada_taro/timeline", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );
    const timelineBody = await timelineResponse.json();

    expect(timelineResponse.status).toBe(200);
    expect(timelineBody).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customer_id: "customer_demo_yamada_taro"
    });
    expect(timelineBody.messages).toHaveLength(2);
    expect(
      timelineBody.messages.map((message: { body: string | null }) => message.body)
    ).toEqual([
      "平屋の施工事例とSoToNo MAについて相談したいです。",
      "モデルホーム見学の日程も知りたいです。"
    ]);
    expect(
      timelineBody.messages.every(
        (message: { tenant_id: string; customer_id: string }) =>
          message.tenant_id === "tenant_amamihome" &&
          message.customer_id === "customer_demo_yamada_taro"
      )
    ).toBe(true);
  });
});
