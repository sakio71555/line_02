import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  type Customer,
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository
} from "@amami-line-crm/domain";
import { MockLineClient, type LineClient, type LineReplyMessage, type LineUserProfile } from "@amami-line-crm/line";

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
  const alertRepository = new InMemoryAlertRepository();
  const app = createApiApp({
    alertRepository,
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
    alertRepository,
    customerRepository,
    messageRepository
  };
}

function lineTextMessageBody(input: {
  userId: string;
  eventId: string;
  messageId: string;
  replyToken: string;
  text: string;
  timestamp: number;
}): string {
  return JSON.stringify({
    destination: "U_TEST_DESTINATION",
    events: [
      {
        type: "message",
        mode: "active",
        timestamp: input.timestamp,
        source: {
          type: "user",
          userId: input.userId
        },
        webhookEventId: input.eventId,
        deliveryContext: {
          isRedelivery: false
        },
        replyToken: input.replyToken,
        message: {
          id: input.messageId,
          type: "text",
          text: input.text
        }
      }
    ]
  });
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
        alerts_created: 1,
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
      response_mode: "human_required",
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

  it("creates one open staff follow-up alert for a customer LINE update", async () => {
    const { app, alertRepository, customerRepository } = createTestContext();
    const firstResponse = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, fixtureBody)
    );
    const secondResponse = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, fixtureBody)
    );
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();
    const customer = customerRepository.list()[0];

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstBody.logging.alerts_created).toBe(1);
    expect(secondBody.logging.alerts_created).toBe(0);
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer?.id,
      alert_type: "unreplied_customer_message",
      status: "open",
      severity: "high"
    });
    expect(alertRepository.list()[0]?.message).not.toContain("モデルホームを見学したいです");
  });

  it("replies with the model house reservation guide and records page guidance without an alert", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const menuBody = JSON.stringify({
      destination: "U_TEST_DESTINATION",
      events: [
        {
          type: "message",
          mode: "active",
          timestamp: 1710000002000,
          source: {
            type: "user",
            userId: "U_TEST_USER_MENU"
          },
          webhookEventId: "01TESTMODELHOUSEMENU",
          deliveryContext: {
            isRedelivery: false
          },
          replyToken: "reply_token_model_house",
          message: {
            id: "test-line-message-menu-001",
            type: "text",
            text: "モデルハウス見学予約"
          }
        }
      ]
    });

    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, menuBody)
    );
    const body = await response.json();
    const customer = customerRepository.list()[0];
    const messages = messageRepository.list();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      line_menu_replies: {
        sent: 1,
        failed: 0,
        skipped: 0
      },
      logging: {
        customers_upserted: 1,
        messages_inserted: 1,
        alerts_created: 0,
        rich_menu_guides_logged: 1,
        unsupported_events: 0
      }
    });
    expect(lineClient.replies).toEqual([
      {
        replyToken: "reply_token_model_house",
        messages: [
          {
            type: "text",
            text: [
              "モデルハウス見学のご予約はこちらからお願いいたします。",
              "ご希望日時を入力して送信してください。",
              "",
              "https://amamihome.net/reservation/"
            ].join("\n")
          }
        ]
      }
    ]);
    expect(customer).toMatchObject({
      tenant_id: "tenant_amamihome",
      line_user_id: "U_TEST_USER_MENU",
      response_mode: "bot_auto",
      last_customer_message_at: null
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer?.id,
      role: "system",
      message_type: "reservation",
      body: "モデルハウス見学予約ページ案内済み",
      line_message_id: null,
      media_storage_path: "https://amamihome.net/reservation/",
      created_at: new Date(1710000002000).toISOString()
    });
    expect(alertRepository.list()).toHaveLength(0);
  });

  it("replies with the home building consultation guide and records page guidance without an alert", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const menuBody = JSON.stringify({
      destination: "U_TEST_DESTINATION",
      events: [
        {
          type: "message",
          mode: "active",
          timestamp: 1710000003000,
          source: {
            type: "user",
            userId: "U_TEST_USER_CONSULTATION_MENU"
          },
          webhookEventId: "01TESTCONSULTATIONMENU",
          deliveryContext: {
            isRedelivery: false
          },
          replyToken: "reply_token_home_building_consultation",
          message: {
            id: "test-line-message-menu-002",
            type: "text",
            text: "家づくり相談"
          }
        }
      ]
    });

    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, menuBody)
    );
    const body = await response.json();
    const customer = customerRepository.list()[0];
    const messages = messageRepository.list();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      line_menu_replies: {
        sent: 1,
        failed: 0,
        skipped: 0
      },
      logging: {
        customers_upserted: 1,
        messages_inserted: 1,
        alerts_created: 0,
        rich_menu_guides_logged: 1,
        unsupported_events: 0
      }
    });
    expect(lineClient.replies).toEqual([
      {
        replyToken: "reply_token_home_building_consultation",
        messages: [
          {
            type: "text",
            text: [
              "家づくり相談はこちらからお願いいたします。",
              "ご相談内容を入力して送信してください。",
              "",
              "https://amamihome.net/consultation/"
            ].join("\n")
          }
        ]
      }
    ]);
    expect(customer).toMatchObject({
      tenant_id: "tenant_amamihome",
      line_user_id: "U_TEST_USER_CONSULTATION_MENU",
      response_mode: "bot_auto",
      last_customer_message_at: null
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer?.id,
      role: "system",
      message_type: "text",
      body: "家づくり相談ページ案内済み",
      line_message_id: null,
      media_storage_path: "https://amamihome.net/consultation/",
      created_at: new Date(1710000003000).toISOString()
    });
    expect(alertRepository.list()).toHaveLength(0);
  });

  it("replies with the works guide and records page guidance without an alert", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const menuBody = JSON.stringify({
      destination: "U_TEST_DESTINATION",
      events: [
        {
          type: "message",
          mode: "active",
          timestamp: 1710000004000,
          source: {
            type: "user",
            userId: "U_TEST_USER_WORKS_MENU"
          },
          webhookEventId: "01TESTWORKSMENU",
          deliveryContext: {
            isRedelivery: false
          },
          replyToken: "reply_token_works",
          message: {
            id: "test-line-message-menu-003",
            type: "text",
            text: "施工事例を見る"
          }
        }
      ]
    });

    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, menuBody)
    );
    const body = await response.json();
    const customer = customerRepository.list()[0];
    const messages = messageRepository.list();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      line_menu_replies: {
        sent: 1,
        failed: 0,
        skipped: 0
      },
      logging: {
        customers_upserted: 1,
        messages_inserted: 1,
        alerts_created: 0,
        rich_menu_guides_logged: 1,
        unsupported_events: 0
      }
    });
    expect(lineClient.replies).toEqual([
      {
        replyToken: "reply_token_works",
        messages: [
          {
            type: "text",
            text: [
              "施工事例はこちらからご覧いただけます。",
              "気になる施工事例があれば、そのままLINEでお知らせください。",
              "",
              "https://amamihome.net/works/"
            ].join("\n")
          }
        ]
      }
    ]);
    expect(customer).toMatchObject({
      tenant_id: "tenant_amamihome",
      line_user_id: "U_TEST_USER_WORKS_MENU",
      response_mode: "bot_auto",
      last_customer_message_at: null
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer?.id,
      role: "system",
      message_type: "text",
      body: "施工事例ページ案内済み",
      line_message_id: null,
      media_storage_path: "https://amamihome.net/works/",
      created_at: new Date(1710000004000).toISOString()
    });
    expect(alertRepository.list()).toHaveLength(0);
  });

  it("replies with the catalog request guide and records page guidance without an alert", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const menuBody = JSON.stringify({
      destination: "U_TEST_DESTINATION",
      events: [
        {
          type: "message",
          mode: "active",
          timestamp: 1710000005000,
          source: {
            type: "user",
            userId: "U_TEST_USER_CATALOG_MENU"
          },
          webhookEventId: "01TESTCATALOGMENU",
          deliveryContext: {
            isRedelivery: false
          },
          replyToken: "reply_token_catalog_request",
          message: {
            id: "test-line-message-menu-004",
            type: "text",
            text: "資料請求"
          }
        }
      ]
    });

    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, menuBody)
    );
    const body = await response.json();
    const customer = customerRepository.list()[0];
    const messages = messageRepository.list();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      line_menu_replies: {
        sent: 1,
        failed: 0,
        skipped: 0
      },
      logging: {
        customers_upserted: 1,
        messages_inserted: 1,
        alerts_created: 0,
        rich_menu_guides_logged: 1,
        unsupported_events: 0
      }
    });
    expect(lineClient.replies).toEqual([
      {
        replyToken: "reply_token_catalog_request",
        messages: [
          {
            type: "text",
            text: [
              "資料請求はこちらからお願いいたします。",
              "家づくり資料のご請求内容を入力して送信してください。",
              "",
              "https://amamihome.net/download/"
            ].join("\n")
          }
        ]
      }
    ]);
    expect(customer).toMatchObject({
      tenant_id: "tenant_amamihome",
      line_user_id: "U_TEST_USER_CATALOG_MENU",
      response_mode: "bot_auto",
      last_customer_message_at: null
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer?.id,
      role: "system",
      message_type: "text",
      body: "資料請求ページ案内済み",
      line_message_id: null,
      media_storage_path: "https://amamihome.net/download/",
      created_at: new Date(1710000005000).toISOString()
    });
    expect(alertRepository.list()).toHaveLength(0);
  });

  it("guides an unregistered customer through contact-staff category, contact info, and alert creation", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const userId = "U_TEST_USER_CONTACT_STAFF";

    const triggerResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFTRIGGER",
          messageId: "test-contact-staff-trigger",
          replyToken: "reply_token_contact_staff_trigger",
          text: "担当者に相談",
          timestamp: 1710000006000
        })
      )
    );
    const categoryResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFCATEGORY",
          messageId: "test-contact-staff-category",
          replyToken: "reply_token_contact_staff_category",
          text: "費用・ローンについて",
          timestamp: 1710000007000
        })
      )
    );
    const contactResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFCONTACT",
          messageId: "test-contact-staff-contact",
          replyToken: "reply_token_contact_staff_contact",
          text: "佐藤花子 / 090-1111-2222",
          timestamp: 1710000008000
        })
      )
    );
    const bodyResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFBODY",
          messageId: "test-contact-staff-body",
          replyToken: "reply_token_contact_staff_body",
          text: "住宅ローンと予算について相談したいです。",
          timestamp: 1710000009000
        })
      )
    );
    const body = await bodyResponse.json();
    const customer = customerRepository.list()[0];
    const messages = messageRepository.list();

    expect(triggerResponse.status).toBe(200);
    expect(categoryResponse.status).toBe(200);
    expect(contactResponse.status).toBe(200);
    expect(bodyResponse.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      line_menu_replies: {
        sent: 1,
        failed: 0,
        skipped: 0
      },
      logging: {
        customers_upserted: 1,
        messages_inserted: 2,
        alerts_created: 1,
        contact_staff_flows_logged: 1,
        contact_staff_alerts_created: 1,
        unsupported_events: 0
      }
    });
    expect(lineClient.replies).toHaveLength(4);
    expect(lineClient.replies[0]).toMatchObject({
      replyToken: "reply_token_contact_staff_trigger",
      messages: [
        {
          type: "text",
          text: expect.stringContaining("相談カテゴリを次から選んで"),
          quickReply: {
            items: expect.arrayContaining([
              {
                type: "action",
                action: {
                  type: "message",
                  label: "費用・ローンについて",
                  text: "費用・ローンについて"
                }
              }
            ])
          }
        }
      ]
    });
    expect(lineClient.replies[1]?.messages[0]?.text).toContain("お名前と電話番号");
    expect(lineClient.replies[2]?.messages[0]?.text).toContain("相談内容をこのままLINEで");
    expect(lineClient.replies[3]?.messages[0]?.text).toContain("相談内容を受け付けました");
    expect(customer).toMatchObject({
      tenant_id: "tenant_amamihome",
      line_user_id: userId,
      display_name: "佐藤花子",
      phone: "090-1111-2222",
      response_mode: "human_required",
      last_customer_message_at: new Date(1710000009000).toISOString()
    });
    expect(customer?.interest_tags).toContain("担当者相談連絡先確認済み");
    expect(messages.map((message) => message.body)).toEqual([
      "担当者相談カテゴリ選択案内済み",
      "担当者相談カテゴリ: 費用・ローンについて",
      "担当者相談連絡先確認案内済み",
      "担当者相談連絡先確認済み",
      "担当者相談内容入力案内済み",
      "住宅ローンと予算について相談したいです。",
      "担当者相談受付済み"
    ]);
    expect(messages[5]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer?.id,
      line_message_id: "test-contact-staff-body",
      role: "customer",
      message_type: "text"
    });
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer?.id,
      alert_type: "unreplied_customer_message",
      status: "open",
      severity: "high"
    });
    expect(alertRepository.list()[0]?.message).not.toContain("住宅ローンと予算");
  });

  it("skips contact info collection for information-registered contact-staff customers", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const userId = "U_TEST_USER_REGISTERED_CONTACT_STAFF";
    const existingCustomer: Customer = {
      id: "customer_registered_contact_staff",
      tenant_id: "tenant_amamihome",
      line_user_id: userId,
      display_name: "登録済み 太郎",
      picture_url: null,
      phone: "090-2222-3333",
      email: null,
      postal_code: null,
      address: null,
      interest_tags: ["情報登録済み"],
      response_mode: "bot_auto",
      status: "active",
      last_message_at: null,
      last_customer_message_at: null,
      last_staff_reply_at: null,
      created_at: "2026-07-03T00:00:00.000Z",
      updated_at: "2026-07-03T00:00:00.000Z"
    };

    await customerRepository.save(existingCustomer);
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTREGISTEREDCONTACTSTAFFTRIGGER",
          messageId: "test-registered-contact-staff-trigger",
          replyToken: "reply_token_registered_contact_staff_trigger",
          text: "担当者に相談",
          timestamp: 1710000010000
        })
      )
    );
    const categoryResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTREGISTEREDCONTACTSTAFFCATEGORY",
          messageId: "test-registered-contact-staff-category",
          replyToken: "reply_token_registered_contact_staff_category",
          text: "家づくりについて",
          timestamp: 1710000011000
        })
      )
    );
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTREGISTEREDCONTACTSTAFFBODY",
          messageId: "test-registered-contact-staff-body",
          replyToken: "reply_token_registered_contact_staff_body",
          text: "平屋の進め方を担当者に相談したいです。",
          timestamp: 1710000012000
        })
      )
    );
    const categoryBody = await categoryResponse.json();
    const messages = messageRepository.list();
    const customer = customerRepository.list()[0];

    expect(categoryBody).toMatchObject({
      logging: {
        messages_inserted: 2,
        alerts_created: 0,
        contact_staff_flows_logged: 1,
        contact_staff_alerts_created: 0
      }
    });
    expect(lineClient.replies[1]?.messages[0]?.text).not.toContain("お名前と電話番号");
    expect(lineClient.replies[1]?.messages[0]?.text).toContain("相談内容をこのままLINEで");
    expect(messages.map((message) => message.body)).toEqual([
      "担当者相談カテゴリ選択案内済み",
      "担当者相談カテゴリ: 家づくりについて",
      "担当者相談内容入力案内済み",
      "平屋の進め方を担当者に相談したいです。",
      "担当者相談受付済み"
    ]);
    expect(customer).toMatchObject({
      display_name: "登録済み 太郎",
      phone: "090-2222-3333",
      response_mode: "human_required"
    });
    expect(alertRepository.list()).toHaveLength(1);
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
