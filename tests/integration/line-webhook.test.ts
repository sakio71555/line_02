import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  type Alert,
  type Customer,
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type StaffNotificationPayload,
  type StaffNotifier
} from "@amami-line-crm/domain";
import {
  LineMessagingApiError,
  MockLineClient,
  type LineClient,
  type LineReplyMessage,
  type LineUserProfile
} from "@amami-line-crm/line";

const channelSecret = "test_line_channel_secret";
const knownWebhookSecret = "wh_dev_amamihome";
const staffLineChannelSecret = "test_staff_line_channel_secret";
const knownStaffLineWebhookSecret = "staff_wh_dev_amamihome";
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

function signedStaffLineRequest(
  path: string,
  body: string,
  signature = signStaffLineBody(body)
): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-line-signature": signature
    },
    body
  });
}

function signStaffLineBody(body: string): string {
  return createHmac("sha256", staffLineChannelSecret).update(body).digest("base64");
}

function createTestContext(
  input: {
    tenantId?: string;
    tenantSlug?: string;
    webhookSecret?: string;
    lineClient?: LineClient;
    staffLineClient?: LineClient;
    staffNotifier?: StaffNotifier;
    env?: NodeJS.ProcessEnv;
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
    ...(input.staffLineClient ? { staffLineClient: input.staffLineClient } : {}),
    ...(input.staffNotifier ? { staffNotifier: input.staffNotifier } : {}),
    env: {
      LINE_CHANNEL_SECRET: channelSecret,
      LINE_WEBHOOK_SECRET_PATH: input.webhookSecret ?? knownWebhookSecret,
      TENANT_ID: input.tenantId ?? "tenant_amamihome",
      TENANT_SLUG: input.tenantSlug ?? "amamihome",
      ...input.env
    }
  });

  return {
    app,
    alertRepository,
    customerRepository,
    messageRepository
  };
}

class RecordingStaffNotifier implements StaffNotifier {
  readonly notifications: StaffNotificationPayload[] = [];

  async notify(payload: StaffNotificationPayload): Promise<void> {
    this.notifications.push(payload);
  }
}

function expectGuideStaffNotification(input: {
  staffNotifier: RecordingStaffNotifier;
  customer: Customer | undefined;
  actionLabel: string;
  eventTime: string;
  lineUserId: string;
  expectedAdminBaseUrl?: string;
}) {
  expect(input.staffNotifier.notifications).toHaveLength(1);
  const notification = input.staffNotifier.notifications[0];
  const expectedAdminBaseUrl =
    input.expectedAdminBaseUrl ?? "https://admin.taiyolabel.site";

  expect(notification?.message).toContain("LINEの更新が届きました。");
  expect(notification?.message).toContain(`種別：LINEメニュー操作（${input.actionLabel}）`);
  expect(notification?.message).toContain("緊急度：通常");
  expect(notification?.message).toContain(`内容：${input.actionLabel}`);
  expect(notification?.message).toContain(`日時：${input.eventTime}`);
  expect(notification?.message).toContain("顧客詳細で確認してください。");
  expect(notification?.message).toContain(
    `${expectedAdminBaseUrl}/customers/${input.customer?.id}`
  );
  expect(notification?.message).not.toContain(input.lineUserId);
}

function createStaffLineWebhookTestApp(input: {
  env?: NodeJS.ProcessEnv;
  staffLineClient?: LineClient;
} = {}) {
  const env = {
    STAFF_LINE_CHANNEL_SECRET: staffLineChannelSecret,
    STAFF_LINE_WEBHOOK_SECRET_PATH: knownStaffLineWebhookSecret,
    TENANT_ID: "tenant_amamihome",
    TENANT_SLUG: "amamihome",
    ...input.env
  };
  return {
    app: createApiApp({
      ...(input.staffLineClient ? { staffLineClient: input.staffLineClient } : {}),
      env
    }),
    env
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
    expect(alertRepository.list()[0]?.message).toContain("モデルホームを見学したいです");
  });

  it("attempts staff notifications when staff LINE runtime is configured in a development-labeled process", async () => {
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository } = createTestContext({
      staffNotifier,
      env: {
        APP_ENV: "development",
        NODE_ENV: "development",
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });

    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, fixtureBody)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.logging.alerts_created).toBe(1);
    expect(body.staff_notifications).toEqual({
      attempted: true,
      notified: 1,
      failed: 0,
      skipped: 0
    });
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]?.message).toContain("新しい相談が届きました。");
    expect(staffNotifier.notifications[0]?.message).toContain("モデルホームを見学したいです");
    expect(alertRepository.list()[0]).toMatchObject({
      status: "notified"
    });
  });

  it("captures a temporary staff notification target from the customer LINE channel without logging it as a customer message", async () => {
    const runtimeDir = join(process.cwd(), "tmp", "tests", "customer-line-staff-target");
    const runtimeFile = join(runtimeDir, "staff-line-target.env");
    const lineClient = new MockLineClient();
    mkdirSync(runtimeDir, { recursive: true });

    try {
      const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
        lineClient,
        env: {
          LINE_CHANNEL_ACCESS_TOKEN: "test_customer_line_access_token",
          STAFF_LINE_USE_CUSTOMER_CHANNEL_FOR_NOTIFICATIONS: "true",
          STAFF_LINE_TARGET_RUNTIME_FILE: runtimeFile
        }
      });

      const response = await app.fetch(
        signedRequest(
          `/api/line/webhook/${knownWebhookSecret}`,
          lineTextMessageBody({
            userId: "U_TEST_CUSTOMER_CHANNEL_STAFF_TARGET",
            eventId: "01TESTCUSTOMERCHANNELSTAFFTARGET",
            messageId: "test-customer-channel-staff-target",
            replyToken: "reply_token_customer_channel_staff_target",
            text: "通知テスト",
            timestamp: 1710000010000
          })
        )
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        customer_line_staff_notification_setup: {
          enabled: true,
          attempted: true,
          setup_trigger_events: 1,
          customer_event_logging_skipped: true,
          notification_target_capture: {
            attempted: true,
            captured: true,
            source_type: "user",
            runtime_file_persistence: {
              attempted: true,
              written: true
            },
            target_id_value_output: false,
            raw_event_content_recorded: false
          },
          setup_reply: {
            attempted: true,
            sent: 1,
            failed: 0,
            target_id_value_output: false
          }
        },
        logging: {
          customers_upserted: 0,
          messages_inserted: 0,
          alerts_created: 0,
          unsupported_events: 0
        }
      });
      expect(lineClient.replies).toHaveLength(1);
      expect(lineClient.replies[0]).toMatchObject({
        replyToken: "reply_token_customer_channel_staff_target",
        messages: [
          {
            type: "text",
            text: "通知テストを受け付けました。CRMからの相談通知をこのトークへ送れる状態です。"
          }
        ]
      });
      expect(customerRepository.list()).toHaveLength(0);
      expect(messageRepository.list()).toHaveLength(0);
      expect(alertRepository.list()).toHaveLength(0);
      expect(readFileSync(runtimeFile, "utf8")).toContain("STAFF_LINE_GROUP_ID=");
    } finally {
      rmSync(runtimeDir, { recursive: true, force: true });
    }
  });

  it("does not refresh staff notification targets from the separate staff LINE webhook while customer-channel fallback is enabled", async () => {
    const runtimeDir = join(process.cwd(), "tmp", "tests", "staff-line-fallback-skip-target");
    const runtimeFile = join(runtimeDir, "staff-line-target.env");
    const { app } = createStaffLineWebhookTestApp({
      staffLineClient: new MockLineClient(),
      env: {
        LINE_CHANNEL_ACCESS_TOKEN: "test_customer_line_access_token",
        STAFF_LINE_USE_CUSTOMER_CHANNEL_FOR_NOTIFICATIONS: "true",
        STAFF_LINE_TARGET_RUNTIME_FILE: runtimeFile
      }
    });
    mkdirSync(runtimeDir, { recursive: true });

    try {
      const response = await app.fetch(
        signedStaffLineRequest(
          `/api/staff-line/webhook/${knownStaffLineWebhookSecret}`,
          lineTextMessageBody({
            userId: "U_TEST_SEPARATE_STAFF_LINE_TARGET",
            eventId: "01TESTSEPARATESTAFFLINEFALLBACKSKIP",
            messageId: "test-separate-staff-line-fallback-skip",
            replyToken: "reply_token_separate_staff_line_fallback_skip",
            text: "通知テスト",
            timestamp: 1710000011000
          })
        )
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.notification_target_capture).toMatchObject({
        attempted: false,
        captured: false,
        skipped_reason: "customer_channel_fallback_enabled",
        target_id_value_output: false,
        raw_event_content_recorded: false
      });
      expect(body.setup_reply).toMatchObject({
        attempted: false,
        failure_category: "customer_channel_fallback_enabled",
        target_id_value_output: false
      });
      expect(() => readFileSync(runtimeFile, "utf8")).toThrow();
    } finally {
      rmSync(runtimeDir, { recursive: true, force: true });
    }
  });

  it("replies with the model house reservation guide and notifies staff without an alert", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        APP_ENV: "production"
      }
    });
    const eventTime = new Date(1710000002000).toISOString();
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
      staff_notifications: {
        attempted: true,
        notified: 1,
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
      created_at: eventTime
    });
    expect(alertRepository.list()).toHaveLength(0);
    expectGuideStaffNotification({
      staffNotifier,
      customer,
      actionLabel: "モデルハウス見学予約ページ案内済み",
      eventTime,
      lineUserId: "U_TEST_USER_MENU"
    });
  });

  it("replies with the home building consultation guide and notifies staff without an alert", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        APP_ENV: "production"
      }
    });
    const eventTime = new Date(1710000003000).toISOString();
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
      staff_notifications: {
        attempted: true,
        notified: 1,
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
      created_at: eventTime
    });
    expect(alertRepository.list()).toHaveLength(0);
    expectGuideStaffNotification({
      staffNotifier,
      customer,
      actionLabel: "家づくり相談ページ案内済み",
      eventTime,
      lineUserId: "U_TEST_USER_CONSULTATION_MENU"
    });
  });

  it("replies with the works guide and notifies staff without an alert", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        APP_ENV: "production"
      }
    });
    const eventTime = new Date(1710000004000).toISOString();
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
      staff_notifications: {
        attempted: true,
        notified: 1,
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
      created_at: eventTime
    });
    expect(alertRepository.list()).toHaveLength(0);
    expectGuideStaffNotification({
      staffNotifier,
      customer,
      actionLabel: "施工事例ページ案内済み",
      eventTime,
      lineUserId: "U_TEST_USER_WORKS_MENU"
    });
  });

  it("replies with the catalog request guide and notifies staff without an alert", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        APP_ENV: "production"
      }
    });
    const eventTime = new Date(1710000005000).toISOString();
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
      staff_notifications: {
        attempted: true,
        notified: 1,
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
      created_at: eventTime
    });
    expect(alertRepository.list()).toHaveLength(0);
    expectGuideStaffNotification({
      staffNotifier,
      customer,
      actionLabel: "資料請求ページ案内済み",
      eventTime,
      lineUserId: "U_TEST_USER_CATALOG_MENU"
    });
  });

  it("guides an unregistered customer through contact-staff priority and alert creation", async () => {
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
          eventId: "01TESTCONTACTSTAFFPRIORITY",
          messageId: "test-contact-staff-priority",
          replyToken: "reply_token_contact_staff_priority",
          text: "はやく返事が欲しい",
          timestamp: 1710000007500
        })
      )
    );
    const contactInfoResponse = await app.fetch(
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
    expect(contactInfoResponse.status).toBe(200);
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
    expect(lineClient.replies).toHaveLength(5);
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
    expect(lineClient.replies[1]?.messages[0]?.text).toContain("返信の優先度");
    expect(lineClient.replies[1]?.messages[0]?.quickReply?.items).toEqual(
      expect.arrayContaining([
        {
          type: "action",
          action: {
            type: "message",
            label: "はやく返事が欲しい",
            text: "はやく返事が欲しい"
          }
        }
      ])
    );
    expect(lineClient.replies[2]?.messages[0]?.text).toContain("お名前と電話番号");
    expect(lineClient.replies[3]?.messages[0]?.text).toContain("相談内容をこのままLINEで");
    expect(lineClient.replies[4]?.messages[0]?.text).toContain("相談内容を受け付けました");
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
      "担当者相談優先度選択案内済み",
      "担当者相談優先度: はやく返事が欲しい",
      "担当者相談連絡先確認案内済み",
      "担当者相談連絡先確認済み",
      "担当者相談内容入力案内済み",
      "住宅ローンと予算について相談したいです。",
      "担当者相談受付済み"
    ]);
    expect(messages[7]).toMatchObject({
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
    expect(alertRepository.list()[0]?.message).toContain(
      "担当者相談優先度: はやく返事が欲しい"
    );
    expect(alertRepository.list()[0]?.message).toContain("住宅ローンと予算");
  });

  it("restarts stale contact-staff category selection when the trigger is tapped again", async () => {
    const lineClient = new MockLineClient();
    const { app, messageRepository } = createTestContext({
      lineClient
    });
    const userId = "U_TEST_USER_CONTACT_STAFF_RESTART";

    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTRESTARTTRIGGER1",
          messageId: "test-contact-staff-restart-trigger-1",
          replyToken: "reply_token_contact_staff_restart_trigger_1",
          text: "担当者に相談",
          timestamp: 1710000020000
        })
      )
    );
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTRESTARTCATEGORY1",
          messageId: "test-contact-staff-restart-category-1",
          replyToken: "reply_token_contact_staff_restart_category_1",
          text: "その他",
          timestamp: 1710000021000
        })
      )
    );
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTRESTARTTRIGGER2",
          messageId: "test-contact-staff-restart-trigger-2",
          replyToken: "reply_token_contact_staff_restart_trigger_2",
          text: "担当者に相談",
          timestamp: 1710000022000
        })
      )
    );
    const categoryResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTRESTARTCATEGORY2",
          messageId: "test-contact-staff-restart-category-2",
          replyToken: "reply_token_contact_staff_restart_category_2",
          text: "モデルハウス見学について",
          timestamp: 1710000023000
        })
      )
    );
    const categoryBody = await categoryResponse.json();

    expect(categoryResponse.status).toBe(200);
    expect(categoryBody.logging).toMatchObject({
      messages_inserted: 2,
      contact_staff_flows_logged: 1
    });
    expect(lineClient.replies[3]?.messages[0]?.text).toContain(
      "カテゴリ「モデルハウス見学について」で受け付けます。"
    );
    expect(lineClient.replies[3]?.messages[0]?.text).not.toContain("カテゴリ「その他」");
    expect(messageRepository.list().map((message) => message.body)).toEqual([
      "担当者相談カテゴリ選択案内済み",
      "担当者相談カテゴリ: その他",
      "担当者相談優先度選択案内済み",
      "担当者相談カテゴリ選択案内済み",
      "担当者相談カテゴリ: モデルハウス見学について",
      "担当者相談優先度選択案内済み"
    ]);
  });

  it("notifies staff notification boundary for newly created production contact-staff alerts", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        APP_ENV: "production"
      }
    });
    const userId = "U_TEST_USER_CONTACT_STAFF_NOTIFY";

    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFNOTIFYTRIGGER",
          messageId: "test-contact-staff-notify-trigger",
          replyToken: "reply_token_contact_staff_notify_trigger",
          text: "担当者に相談",
          timestamp: 1710000030000
        })
      )
    );
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFNOTIFYCATEGORY",
          messageId: "test-contact-staff-notify-category",
          replyToken: "reply_token_contact_staff_notify_category",
          text: "モデルハウス見学について",
          timestamp: 1710000031000
        })
      )
    );
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFNOTIFYPRIORITY",
          messageId: "test-contact-staff-notify-priority",
          replyToken: "reply_token_contact_staff_notify_priority",
          text: "はやく返事が欲しい",
          timestamp: 1710000031500
        })
      )
    );
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFNOTIFYCONTACT",
          messageId: "test-contact-staff-notify-contact",
          replyToken: "reply_token_contact_staff_notify_contact",
          text: "田中太郎 / 090-1111-2222",
          timestamp: 1710000032000
        })
      )
    );
    const bodyResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTCONTACTSTAFFNOTIFYBODY",
          messageId: "test-contact-staff-notify-body",
          replyToken: "reply_token_contact_staff_notify_body",
          text: "モデルハウス見学の日程について相談したいです。",
          timestamp: 1710000033000
        })
      )
    );
    const body = await bodyResponse.json();

    expect(bodyResponse.status).toBe(200);
    expect(body).toMatchObject({
      staff_notifications: {
        attempted: true,
        notified: 1,
        failed: 0
      },
      logging: {
        alerts_created: 1,
        contact_staff_alerts_created: 1
      }
    });
    expect(staffNotifier.notifications).toHaveLength(5);
    expect(staffNotifier.notifications[0]?.message).toContain("内容：担当者相談を開始");
    expect(staffNotifier.notifications[1]?.message).toContain(
      "内容：担当者相談カテゴリ: モデルハウス見学について"
    );
    expect(staffNotifier.notifications[2]?.message).toContain(
      "内容：担当者相談優先度: はやく返事が欲しい"
    );
    expect(staffNotifier.notifications[3]?.message).toContain("内容：担当者相談連絡先確認済み");
    expect(staffNotifier.notifications[3]?.message).toContain("顧客：田中太郎");
    expect(staffNotifier.notifications[3]?.message).toContain("電話：090-1111-2222");
    expect(staffNotifier.notifications[4]?.message).toContain("新しい相談が届きました。");
    expect(staffNotifier.notifications[4]?.message).toContain(
      "種別：担当者に相談（モデルハウス見学について）"
    );
    expect(staffNotifier.notifications[4]?.message).not.toContain("種別：未返信の相談");
    expect(staffNotifier.notifications[4]?.message).toContain("緊急度：高");
    expect(staffNotifier.notifications[4]?.message).toContain("顧客：田中太郎");
    expect(staffNotifier.notifications[4]?.message).toContain("電話：090-1111-2222");
    expect(staffNotifier.notifications[4]?.message).toContain("優先度：はやく返事が欲しい");
    expect(staffNotifier.notifications[4]?.message).toContain("相談内容：");
    expect(staffNotifier.notifications[4]?.message).toContain(
      "モデルハウス見学の日程について相談したいです。"
    );
    expect(staffNotifier.notifications[4]?.message).toContain("管理画面で確認してください。");
    expect(alertRepository.list()[0]).toMatchObject({
      status: "notified",
      severity: "high"
    });
  });

  it("reopens notified contact-staff alerts and notifies staff for later customer updates", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, customerRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        APP_ENV: "production"
      }
    });
    const userId = "U_TEST_USER_CONTACT_STAFF_NOTIFY_REPEAT";
    const customer: Customer = {
      id: "customer_registered_contact_staff_repeat",
      tenant_id: "tenant_amamihome",
      line_user_id: userId,
      display_name: "登録済み 太郎",
      picture_url: null,
      phone: "090-2222-3333",
      email: null,
      postal_code: null,
      address: null,
      interest_tags: ["情報登録済み"],
      response_mode: "human_required",
      status: "active",
      last_message_at: null,
      last_customer_message_at: "2026-07-03T00:00:00.000Z",
      last_staff_reply_at: null,
      created_at: "2026-07-03T00:00:00.000Z",
      updated_at: "2026-07-03T00:00:00.000Z"
    };
    const notifiedAlert: Alert = {
      id: "alert_registered_contact_staff_repeat",
      tenant_id: "tenant_amamihome",
      customer_id: customer.id,
      consultation_id: null,
      alert_type: "unreplied_customer_message",
      status: "notified",
      severity: "high",
      message: "通知本文には含めない相談内容です",
      triggered_at: "2026-07-03T00:00:00.000Z",
      notified_at: "2026-07-03T00:01:00.000Z",
      resolved_at: null,
      created_at: "2026-07-03T00:00:00.000Z",
      updated_at: "2026-07-03T00:01:00.000Z"
    };

    await customerRepository.save(customer);
    await alertRepository.create(notifiedAlert);
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTREPEATCONTACTSTAFFTRIGGER",
          messageId: "test-repeat-contact-staff-trigger",
          replyToken: "reply_token_repeat_contact_staff_trigger",
          text: "担当者に相談",
          timestamp: 1710000040000
        })
      )
    );
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTREPEATCONTACTSTAFFCATEGORY",
          messageId: "test-repeat-contact-staff-category",
          replyToken: "reply_token_repeat_contact_staff_category",
          text: "費用・ローンについて",
          timestamp: 1710000041000
        })
      )
    );
    await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTREPEATCONTACTSTAFFPRIORITY",
          messageId: "test-repeat-contact-staff-priority",
          replyToken: "reply_token_repeat_contact_staff_priority",
          text: "通常でよい",
          timestamp: 1710000041500
        })
      )
    );
    const bodyResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTREPEATCONTACTSTAFFBODY",
          messageId: "test-repeat-contact-staff-body",
          replyToken: "reply_token_repeat_contact_staff_body",
          text: "資金計画について担当者に相談したいです。",
          timestamp: 1710000042000
        })
      )
    );
    const body = await bodyResponse.json();

    expect(bodyResponse.status).toBe(200);
    expect(body).toMatchObject({
      staff_notifications: {
        attempted: true,
        notified: 1,
        failed: 0
      },
      logging: {
        alerts_created: 0,
        alerts_notification_required: 1,
        contact_staff_alerts_created: 0,
        contact_staff_alerts_notification_required: 1
      }
    });
    expect(staffNotifier.notifications).toHaveLength(4);
    expect(staffNotifier.notifications[0]?.message).toContain("内容：担当者相談を開始");
    expect(staffNotifier.notifications[1]?.message).toContain(
      "内容：担当者相談カテゴリ: 費用・ローンについて"
    );
    expect(staffNotifier.notifications[2]?.message).toContain(
      "内容：担当者相談優先度: 通常でよい"
    );
    expect(staffNotifier.notifications[3]?.message).toContain("LINEの更新が届きました。");
    expect(staffNotifier.notifications[3]?.message).toContain(
      "種別：担当者に相談（費用・ローンについて）"
    );
    expect(staffNotifier.notifications[3]?.message).toContain("緊急度：通常");
    expect(staffNotifier.notifications[3]?.message).toContain("顧客：登録済み 太郎");
    expect(staffNotifier.notifications[3]?.message).toContain("電話：090-2222-3333");
    expect(staffNotifier.notifications[3]?.message).toContain("日時：2024-03-09T16:00:42.000Z");
    expect(staffNotifier.notifications[3]?.message).toContain(
      "https://admin.taiyolabel.site/customers/customer_registered_contact_staff_repeat"
    );
    expect(staffNotifier.notifications[3]?.message).toContain("優先度：通常でよい");
    expect(staffNotifier.notifications[3]?.message).toContain("相談内容：");
    expect(staffNotifier.notifications[3]?.message).toContain(
      "資金計画について担当者に相談したいです。"
    );
    expect(staffNotifier.notifications[3]?.message).not.toContain(
      "通知本文には含めない相談内容です"
    );
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      status: "notified"
    });
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
    const priorityResponse = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineTextMessageBody({
          userId,
          eventId: "01TESTREGISTEREDCONTACTSTAFFPRIORITY",
          messageId: "test-registered-contact-staff-priority",
          replyToken: "reply_token_registered_contact_staff_priority",
          text: "急ぎではない",
          timestamp: 1710000011500
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
    const priorityBody = await priorityResponse.json();
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
    expect(priorityBody).toMatchObject({
      logging: {
        messages_inserted: 2,
        alerts_created: 0,
        contact_staff_flows_logged: 1,
        contact_staff_alerts_created: 0
      }
    });
    expect(lineClient.replies[1]?.messages[0]?.text).toContain("返信の優先度");
    expect(lineClient.replies[2]?.messages[0]?.text).not.toContain("お名前と電話番号");
    expect(lineClient.replies[2]?.messages[0]?.text).toContain("相談内容をこのままLINEで");
    expect(messages.map((message) => message.body)).toEqual([
      "担当者相談カテゴリ選択案内済み",
      "担当者相談カテゴリ: 家づくりについて",
      "担当者相談優先度選択案内済み",
      "担当者相談優先度: 急ぎではない",
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
    expect(alertRepository.list()[0]).toMatchObject({
      severity: "low"
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

describe("staff LINE notification webhook foundation", () => {
  it("accepts a signed staff-line webhook without recording raw event content", async () => {
    const { app } = createStaffLineWebhookTestApp();
    const body = lineTextMessageBody({
      userId: "U_TEST_STAFF_USER",
      eventId: "01TESTSTAFFLINEEVENT",
      messageId: "test-staff-line-message-001",
      replyToken: "reply_token_staff_line",
      text: "link-code-example",
      timestamp: 1710000009000
    });
    const response = await app.fetch(
      signedStaffLineRequest(`/api/staff-line/webhook/${knownStaffLineWebhookSecret}`, body)
    );
    const parsed = await response.json();
    const serialized = JSON.stringify(parsed);

    expect(response.status).toBe(200);
    expect(parsed).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      tenant_slug: "amamihome",
      destination_present: true,
      event_count: 1,
      staff_line_logging: {
        message_events: 1,
        text_message_events: 1,
        follow_events: 0,
        unfollow_events: 0,
        source_user_events: 1,
        source_group_events: 0,
        source_room_events: 0,
        unsupported_events: 0,
        staff_linking_code_processing_executed: false,
        raw_event_content_recorded: false
      },
      staff_linking_executed: false,
      staff_notification_send_executed: false
    });
    expect(serialized).not.toContain("U_TEST_STAFF_USER");
    expect(serialized).not.toContain("link-code-example");
    expect(serialized).not.toContain("test-staff-line-message-001");
  });

  it("captures a production staff notification target without outputting the target id", async () => {
    const staffLineClient = new MockLineClient();
    const { app, env } = createStaffLineWebhookTestApp({
      staffLineClient,
      env: {
        APP_ENV: "production",
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const body = lineTextMessageBody({
      userId: "U_TEST_STAFF_TARGET_CAPTURE",
      eventId: "01TESTSTAFFTARGETCAPTURE",
      messageId: "test-staff-line-target-capture-message",
      replyToken: "reply_token_staff_line_target_capture",
      text: "通知テスト",
      timestamp: 1710000010000
    });
    const response = await app.fetch(
      signedStaffLineRequest(`/api/staff-line/webhook/${knownStaffLineWebhookSecret}`, body)
    );
    const parsed = await response.json();
    const serialized = JSON.stringify(parsed);

    expect(response.status).toBe(200);
    expect(parsed).toMatchObject({
      notification_target_capture: {
        attempted: true,
        captured: true,
        skipped_reason: null,
        source_type: "user",
        runtime_target_present_before: false,
        runtime_target_present_after: true,
        target_id_value_output: false,
        target_id_committed: false,
        raw_event_content_recorded: false
      },
      setup_reply: {
        attempted: true,
        sent: 1,
        failed: 0,
        trigger_text_recorded: false,
        target_id_value_output: false
      }
    });
    expect(env.STAFF_LINE_GROUP_ID).toBe("U_TEST_STAFF_TARGET_CAPTURE");
    expect(staffLineClient.replies).toHaveLength(1);
    expect(staffLineClient.replies[0]?.messages[0]?.text).toContain("通知テストを受け付けました");
    expect(serialized).not.toContain("U_TEST_STAFF_TARGET_CAPTURE");
    expect(serialized).not.toContain("通知テスト");
    expect(serialized).not.toContain("test-staff-line-target-capture-message");
  });

  it("falls back to a sanitized push confirmation when the staff setup reply fails", async () => {
    class ReplyFailingStaffLineClient extends MockLineClient {
      override async replyMessage(): Promise<void> {
        throw new LineMessagingApiError("reply failed in test", 400);
      }
    }

    const staffLineClient = new ReplyFailingStaffLineClient();
    const { app } = createStaffLineWebhookTestApp({
      staffLineClient,
      env: {
        APP_ENV: "production",
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const body = lineTextMessageBody({
      userId: "U_TEST_STAFF_TARGET_REPLY_FALLBACK",
      eventId: "01TESTSTAFFTARGETREPLYFALLBACK",
      messageId: "test-staff-line-target-reply-fallback-message",
      replyToken: "reply_token_staff_line_target_reply_fallback",
      text: "通知テスト",
      timestamp: 1710000010250
    });
    const response = await app.fetch(
      signedStaffLineRequest(`/api/staff-line/webhook/${knownStaffLineWebhookSecret}`, body)
    );
    const parsed = await response.json();
    const serialized = JSON.stringify(parsed);

    expect(response.status).toBe(200);
    expect(parsed).toMatchObject({
      notification_target_capture: {
        captured: true,
        target_id_value_output: false,
        raw_event_content_recorded: false
      },
      setup_reply: {
        attempted: true,
        sent: 1,
        failed: 0,
        fallback_push_attempted: true,
        fallback_push_sent: 1,
        fallback_push_failed: 0,
        failure_category: null,
        failed_status_code: null,
        target_id_value_output: false
      }
    });
    expect(staffLineClient.replies).toHaveLength(0);
    expect(staffLineClient.pushes).toHaveLength(1);
    expect(staffLineClient.pushes[0]?.messages[0]?.text).toContain(
      "通知テストを受け付けました"
    );
    expect(serialized).not.toContain("U_TEST_STAFF_TARGET_REPLY_FALLBACK");
    expect(serialized).not.toContain("通知テスト");
    expect(serialized).not.toContain("test-staff-line-target-reply-fallback-message");
  });

  it("refreshes an existing staff notification target when the setup trigger is sent again", async () => {
    const staffLineClient = new MockLineClient();
    const { app, env } = createStaffLineWebhookTestApp({
      staffLineClient,
      env: {
        APP_ENV: "production",
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token",
        STAFF_LINE_GROUP_ID: "U_TEST_STALE_STAFF_TARGET"
      }
    });
    const body = lineTextMessageBody({
      userId: "U_TEST_REFRESHED_STAFF_TARGET",
      eventId: "01TESTSTAFFTARGETREFRESH",
      messageId: "test-staff-line-target-refresh-message",
      replyToken: "reply_token_staff_line_target_refresh",
      text: "通知テスト",
      timestamp: 1710000010300
    });
    const response = await app.fetch(
      signedStaffLineRequest(`/api/staff-line/webhook/${knownStaffLineWebhookSecret}`, body)
    );
    const parsed = await response.json();
    const serialized = JSON.stringify(parsed);

    expect(response.status).toBe(200);
    expect(parsed).toMatchObject({
      notification_target_capture: {
        attempted: true,
        captured: true,
        skipped_reason: null,
        source_type: "user",
        runtime_target_present_before: true,
        runtime_target_present_after: true,
        target_id_value_output: false,
        raw_event_content_recorded: false
      },
      setup_reply: {
        attempted: true,
        sent: 1,
        failed: 0,
        target_id_value_output: false
      }
    });
    expect(env.STAFF_LINE_GROUP_ID).toBe("U_TEST_REFRESHED_STAFF_TARGET");
    expect(staffLineClient.replies).toHaveLength(1);
    expect(serialized).not.toContain("U_TEST_STALE_STAFF_TARGET");
    expect(serialized).not.toContain("U_TEST_REFRESHED_STAFF_TARGET");
    expect(serialized).not.toContain("通知テスト");
    expect(serialized).not.toContain("test-staff-line-target-refresh-message");
  });

  it("captures a staff notification target when staff-line runtime is configured in a development-labeled VPS process", async () => {
    const runtimeDir = join(
      process.cwd(),
      "tmp",
      "tests",
      `staff-line-target-dev-runtime-${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
    const runtimeFile = join(runtimeDir, "staff-line-target.env");
    mkdirSync(runtimeDir, { recursive: true });

    try {
      const staffLineClient = new MockLineClient();
      const { app } = createStaffLineWebhookTestApp({
        staffLineClient,
        env: {
          APP_ENV: "development",
          NODE_ENV: "development",
          STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token",
          STAFF_LINE_TARGET_RUNTIME_FILE: runtimeFile
        }
      });
      const body = lineTextMessageBody({
        userId: "U_TEST_STAFF_TARGET_DEV_RUNTIME",
        eventId: "01TESTSTAFFTARGETDEVRUNTIME",
        messageId: "test-staff-line-target-dev-runtime-message",
        replyToken: "reply_token_staff_line_target_dev_runtime",
        text: "通知テスト",
        timestamp: 1710000010500
      });
      const response = await app.fetch(
        signedStaffLineRequest(`/api/staff-line/webhook/${knownStaffLineWebhookSecret}`, body)
      );
      const parsed = await response.json();
      const serialized = JSON.stringify(parsed);
      const runtimeFileContent = readFileSync(runtimeFile, "utf8");

      expect(response.status).toBe(200);
      expect(parsed).toMatchObject({
        notification_target_capture: {
          attempted: true,
          captured: true,
          skipped_reason: null,
          source_type: "user",
          runtime_target_present_before: false,
          runtime_target_present_after: true,
          runtime_file_persistence: {
            attempted: true,
            written: true,
            skipped_reason: null,
            error_category: null,
            target_id_value_output: false,
            target_file_path_output: false,
            raw_event_content_recorded: false
          },
          target_id_value_output: false,
          target_id_committed: false,
          raw_event_content_recorded: false
        },
        setup_reply: {
          attempted: true,
          sent: 1,
          failed: 0,
          failure_category: null,
          line_api_response_body_recorded: false
        }
      });
      expect(runtimeFileContent).toContain("STAFF_LINE_GROUP_ID=");
      expect(runtimeFileContent).toContain("U_TEST_STAFF_TARGET_DEV_RUNTIME");
      expect(staffLineClient.replies).toHaveLength(1);
      expect(staffLineClient.replies[0]?.messages[0]?.text).toContain(
        "通知テストを受け付けました"
      );
      expect(serialized).not.toContain("U_TEST_STAFF_TARGET_DEV_RUNTIME");
      expect(serialized).not.toContain(runtimeFile);
      expect(serialized).not.toContain("通知テスト");
      expect(serialized).not.toContain("test-staff-line-target-dev-runtime-message");
    } finally {
      rmSync(runtimeDir, { recursive: true, force: true });
    }
  });

  it("persists a production staff notification target to a configured runtime file safely", async () => {
    const runtimeDir = join(
      process.cwd(),
      "tmp",
      "tests",
      `staff-line-target-${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
    const runtimeFile = join(runtimeDir, "staff-line-target.env");
    mkdirSync(runtimeDir, { recursive: true });

    try {
      const staffLineClient = new MockLineClient();
      const { app } = createStaffLineWebhookTestApp({
        staffLineClient,
        env: {
          APP_ENV: "production",
          STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token",
          STAFF_LINE_TARGET_RUNTIME_FILE: runtimeFile
        }
      });
      const body = lineTextMessageBody({
        userId: "U_TEST_STAFF_TARGET_PERSIST",
        eventId: "01TESTSTAFFTARGETPERSIST",
        messageId: "test-staff-line-target-persist-message",
        replyToken: "reply_token_staff_line_target_persist",
        text: "通知テスト",
        timestamp: 1710000011000
      });
      const response = await app.fetch(
        signedStaffLineRequest(`/api/staff-line/webhook/${knownStaffLineWebhookSecret}`, body)
      );
      const parsed = await response.json();
      const serialized = JSON.stringify(parsed);
      const runtimeFileContent = readFileSync(runtimeFile, "utf8");

      expect(response.status).toBe(200);
      expect(parsed).toMatchObject({
        notification_target_capture: {
          captured: true,
          runtime_file_persistence: {
            attempted: true,
            written: true,
            skipped_reason: null,
            error_category: null,
            target_id_value_output: false,
            target_file_path_output: false,
            raw_event_content_recorded: false
          },
          target_id_value_output: false,
          target_id_committed: false
        },
        setup_reply: {
          attempted: true,
          sent: 1,
          failed: 0,
          failure_category: null,
          line_api_response_body_recorded: false
        }
      });
      expect(runtimeFileContent).toContain("STAFF_LINE_GROUP_ID=");
      expect(runtimeFileContent).toContain("U_TEST_STAFF_TARGET_PERSIST");
      expect(serialized).not.toContain("U_TEST_STAFF_TARGET_PERSIST");
      expect(serialized).not.toContain(runtimeFile);
      expect(serialized).not.toContain("通知テスト");
      expect(serialized).not.toContain("test-staff-line-target-persist-message");
    } finally {
      rmSync(runtimeDir, { recursive: true, force: true });
    }
  });

  it("rejects staff-line webhook requests with an invalid signature", async () => {
    const { app } = createStaffLineWebhookTestApp();
    const response = await app.fetch(
      signedStaffLineRequest(
        `/api/staff-line/webhook/${knownStaffLineWebhookSecret}`,
        fixtureBody,
        "invalid-signature"
      )
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "invalid_staff_line_signature" });
  });

  it("returns 404 for an unknown staff-line webhook path before trusting the body", async () => {
    const { app } = createStaffLineWebhookTestApp();
    const response = await app.fetch(
      signedStaffLineRequest("/api/staff-line/webhook/unknown", fixtureBody)
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ ok: false, error: "unknown_staff_line_webhook_path" });
  });

  it("returns 500 when staff-line channel secret is not configured", async () => {
    const app = createApiApp({
      env: {
        STAFF_LINE_WEBHOOK_SECRET_PATH: knownStaffLineWebhookSecret,
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome"
      }
    });
    const response = await app.fetch(
      signedStaffLineRequest(`/api/staff-line/webhook/${knownStaffLineWebhookSecret}`, fixtureBody)
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, error: "staff_line_channel_secret_not_configured" });
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
