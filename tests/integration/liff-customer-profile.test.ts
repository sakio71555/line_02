import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type Customer
} from "@amami-line-crm/domain";
import {
  LineIdTokenVerificationError,
  type LineIdTokenIdentity,
  type LineIdTokenVerifier
} from "@amami-line-crm/line";

const tenantId = "tenant_amamihome";
const now = "2026-07-03T01:30:00.000Z";

class FakeLineIdTokenVerifier implements LineIdTokenVerifier {
  constructor(private readonly identity: LineIdTokenIdentity | null) {}

  async verify(): Promise<LineIdTokenIdentity> {
    if (!this.identity) {
      throw new LineIdTokenVerificationError();
    }

    return this.identity;
  }
}

function createTestApp(input: {
  customerRepository?: InMemoryCustomerRepository;
  messageRepository?: InMemoryMessageRepository;
  lineIdTokenVerifier?: LineIdTokenVerifier;
}) {
  return createApiApp({
    customerRepository: input.customerRepository ?? new InMemoryCustomerRepository(),
    messageRepository: input.messageRepository ?? new InMemoryMessageRepository(),
    lineIdTokenVerifier:
      input.lineIdTokenVerifier ??
      new FakeLineIdTokenVerifier({
        userId: "U_LIFF_CUSTOMER_001",
        displayName: "LINE表示名",
        pictureUrl: null,
        email: null
      }),
    now: () => now,
    env: {
      TENANT_ID: tenantId,
      TENANT_SLUG: "amamihome",
      LINE_LIFF_CHANNEL_ID: "test-liff-channel",
      LINE_CHANNEL_SECRET: "test-line-channel-secret"
    }
  });
}

function postCustomerProfile(body: Record<string, unknown>) {
  return new Request("http://localhost/api/liff/customer-profile", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function createExistingCustomer(): Customer {
  return {
    id: "customer_existing",
    tenant_id: tenantId,
    line_user_id: "U_LIFF_CUSTOMER_001",
    display_name: "既存のお客様",
    picture_url: null,
    phone: "090-0000-0000",
    email: null,
    postal_code: null,
    address: "既存エリア",
    interest_tags: ["既存タグ"],
    response_mode: "bot_auto",
    status: "new",
    last_message_at: "2026-07-02T00:00:00.000Z",
    last_customer_message_at: "2026-07-02T00:00:00.000Z",
    last_staff_reply_at: null,
    created_at: "2026-07-02T00:00:00.000Z",
    updated_at: "2026-07-02T00:00:00.000Z"
  };
}

describe("LIFF customer profile API", () => {
  it("returns LIFF runtime config without requiring a build-time public env", async () => {
    const app = createApiApp({
      env: {
        TENANT_ID: tenantId,
        TENANT_SLUG: "amamihome",
        LINE_LIFF_ID: "test-liff-id",
        LINE_CHANNEL_SECRET: "test-line-channel-secret"
      }
    });

    const response = await app.fetch(new Request("http://localhost/api/liff/runtime-config"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      liff_id: "test-liff-id",
      liff_id_configured: true
    });
  });

  it("rejects missing required registration fields before CRM writes", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const app = createTestApp({ customerRepository, messageRepository });

    const response = await app.fetch(
      postCustomerProfile({
        id_token: "test-id-token",
        display_name: "山田 太郎"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_liff_customer_profile_body"
    });
    expect(customerRepository.list()).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("records customer registration with LINE identity verification and sanitized response", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const app = createTestApp({ customerRepository, messageRepository });

    const response = await app.fetch(
      postCustomerProfile({
        id_token: "test-id-token",
        mode: "customer_registration",
        display_name: "山田 太郎",
        phone: "090-1234-5678",
        postal_code: "894-0000",
        address: "奄美市",
        consultation_type: "家づくりについて",
        consultation_body: "平屋の相談をしたいです。",
        preferred_contact_method: "LINE",
        preferred_contact_time: "平日18時以降"
      })
    );
    const body = await response.json();
    const savedCustomer = customerRepository.list()[0];
    const savedMessage = messageRepository.list()[0];

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: tenantId,
      customer_id: savedCustomer.id,
      customer: {
        line_display_name: "山田 太郎",
        phone: "090-1234-5678",
        postal_code: "894-0000",
        address: "奄美市"
      },
      verified_line_identity: true,
      line_user_id_recorded: false
    });
    expect(JSON.stringify(body)).not.toContain("U_LIFF_CUSTOMER_001");
    expect(savedCustomer).toMatchObject({
      tenant_id: tenantId,
      line_user_id: "U_LIFF_CUSTOMER_001",
      display_name: "山田 太郎",
      response_mode: "human_required",
      status: "active",
      last_customer_message_at: now
    });
    expect(savedCustomer.interest_tags).toEqual(
      expect.arrayContaining(["情報登録済み", "相談種別:家づくりについて", "希望連絡:LINE"])
    );
    expect(savedMessage).toMatchObject({
      tenant_id: tenantId,
      customer_id: savedCustomer.id,
      role: "customer",
      message_type: "form",
      ai_generated: false,
      created_at: now
    });
    expect(savedMessage.body).toContain("お客様情報登録");
    expect(savedMessage.body).toContain("平屋の相談をしたいです。");
  });

  it("updates an existing customer through contact change mode", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    await customerRepository.save(createExistingCustomer());
    const app = createTestApp({ customerRepository, messageRepository });

    const response = await app.fetch(
      postCustomerProfile({
        id_token: "test-id-token",
        mode: "contact_change",
        display_name: "山田 太郎",
        phone: "080-9999-0000",
        postal_code: "894-1111",
        address: "名瀬エリア",
        email: "customer@example.test",
        preferred_contact_method: "電話",
        preferred_contact_time: "土曜午前",
        notes: "電話番号を変更しました。"
      })
    );
    const savedCustomer = customerRepository.list()[0];
    const savedMessage = messageRepository.list()[0];

    expect(response.status).toBe(200);
    expect(savedCustomer).toMatchObject({
      id: "customer_existing",
      phone: "080-9999-0000",
      email: "customer@example.test",
      postal_code: "894-1111",
      address: "名瀬エリア",
      response_mode: "human_required",
      status: "active"
    });
    expect(savedCustomer.interest_tags).toEqual(
      expect.arrayContaining(["既存タグ", "情報登録済み", "連絡先変更済み", "希望連絡:電話"])
    );
    expect(savedMessage.body).toContain("連絡先変更");
    expect(savedMessage.body).toContain("電話番号を変更しました。");
  });

  it("returns invalid id token without writing customer data", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const app = createTestApp({
      customerRepository,
      messageRepository,
      lineIdTokenVerifier: new FakeLineIdTokenVerifier(null)
    });

    const response = await app.fetch(
      postCustomerProfile({
        id_token: "invalid-id-token",
        mode: "customer_registration",
        display_name: "山田 太郎",
        phone: "090-1234-5678",
        address: "奄美市",
        consultation_type: "家づくりについて",
        consultation_body: "相談したいです。",
        preferred_contact_method: "LINE"
      })
    );

    expect(response.status).toBe(401);
    expect(customerRepository.list()).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });
});
