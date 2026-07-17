import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import type { AiProvider } from "@amami-line-crm/ai";
import {
  type Alert,
  createDefaultLineExperienceSettings,
  createLineMenuPublishedSnapshot,
  type Customer,
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  InMemoryOperationsRepository,
  type LineAttachmentStorage,
  type LineMenuSettings,
  type Message,
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
import {
  InMemoryKnowledgePageRepository,
  type KnowledgePageRepository
} from "@amami-line-crm/rag";

const channelSecret = "test_line_channel_secret";
const knownWebhookSecret = "wh_dev_amamihome";
const staffLineChannelSecret = "test_staff_line_channel_secret";
const knownStaffLineWebhookSecret = "staff_wh_dev_amamihome";
const fixtureBody = readFileSync(
  new URL("../fixtures/line-webhook-follow-and-message.json", import.meta.url),
  "utf8"
);

function createCustomServiceMenu(): LineMenuSettings {
  return {
    menu_type: "service",
    name: "アフターサービスメニュー",
    chat_bar_text: "アフターサービス",
    line_rich_menu_id: "richmenu-service-test",
    items: [
      {
        action_key: "service.repair",
        label: "修理相談",
        behavior: "consultation",
        trigger_text: "修理について相談",
        target_url: "",
        reply_text: "修理について確認します。",
        timeline_label: "修理相談を開始",
        flow: {
          category: "repair",
          assigned_role: "support",
          default_severity: "medium",
          default_priority: "normal",
          ai_auto_reply: false,
          requires_staff_confirmation: true,
          steps: [
            {
              key: "repair_area",
              kind: "choice",
              prompt_timeline_body: "修理箇所を確認",
              value_timeline_prefix: "修理箇所：",
              prompt_reply: "修理が必要な場所を選んでください。",
              retry_reply: "表示された場所から選んでください。",
              options: [
                { label: "水まわり", value: "water" },
                { label: "電気", value: "electric" }
              ]
            },
            {
              key: "details",
              kind: "text",
              prompt_timeline_body: "詳しい状況を確認",
              value_timeline_prefix: "詳しい状況：",
              prompt_reply: "詳しい状況を入力してください。",
              retry_reply: "詳しい状況を入力してください。",
              options: []
            }
          ]
        }
      },
      ...Array.from({ length: 5 }, (_, index) => ({
        action_key: `service.guide_${index + 1}`,
        label: `案内${index + 1}`,
        behavior: "guide" as const,
        trigger_text: `アフター案内${index + 1}`,
        target_url: "",
        reply_text: `アフターサービス案内${index + 1}です。`,
        timeline_label: `アフター案内${index + 1}`
      }))
    ]
  };
}

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
    lineAttachmentStorage?: LineAttachmentStorage;
    customerRepository?: InMemoryCustomerRepository;
    messageRepository?: InMemoryMessageRepository;
    operationsRepository?: InMemoryOperationsRepository;
    staffLineClient?: LineClient;
    staffNotifier?: StaffNotifier;
    aiProvider?: AiProvider;
    knowledgePageRepository?: KnowledgePageRepository;
    env?: NodeJS.ProcessEnv;
  } = {}
) {
  const customerRepository = input.customerRepository ?? new InMemoryCustomerRepository();
  const messageRepository = input.messageRepository ?? new InMemoryMessageRepository();
  const alertRepository = new InMemoryAlertRepository();
  const app = createApiApp({
    alertRepository,
    customerRepository,
    messageRepository,
    ...(input.operationsRepository ? { operationsRepository: input.operationsRepository } : {}),
    ...(input.lineAttachmentStorage ? { lineAttachmentStorage: input.lineAttachmentStorage } : {}),
    ...(input.lineClient ? { lineClient: input.lineClient } : {}),
    ...(input.staffLineClient ? { staffLineClient: input.staffLineClient } : {}),
    ...(input.staffNotifier ? { staffNotifier: input.staffNotifier } : {}),
    ...(input.aiProvider ? { aiProvider: input.aiProvider } : {}),
    ...(input.knowledgePageRepository
      ? { knowledgePageRepository: input.knowledgePageRepository }
      : {}),
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

class PendingReplyInsertBarrierRepository extends InMemoryMessageRepository {
  private pendingReplyInsertCount = 0;
  private releasePendingReplies: (() => void) | undefined;
  private readonly pendingRepliesInserted = new Promise<void>((resolve) => {
    this.releasePendingReplies = resolve;
  });

  override async insert(message: Message): Promise<Message> {
    const inserted = await super.insert(message);

    if (
      message.role === "bot" &&
      message.message_type === "summary" &&
      message.sent_to_line_at === null &&
      message.body.includes("モデルハウス見学のご予約はこちら")
    ) {
      this.pendingReplyInsertCount += 1;

      if (this.pendingReplyInsertCount === 2) {
        this.releasePendingReplies?.();
      }

      await this.pendingRepliesInserted;
    }

    return inserted;
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

function expectGuideTimelineMessages(input: {
  messages: Message[];
  customer: Customer | undefined;
  triggerText: string;
  lineMessageId: string;
  systemBody: string;
  messageType: Message["message_type"];
  mediaStoragePath: string;
  botReplyText: string | undefined;
  eventTime: string;
}) {
  expect(input.messages).toHaveLength(3);
  expect(input.messages[0]).toMatchObject({
    tenant_id: "tenant_amamihome",
    customer_id: input.customer?.id,
    role: "customer",
    message_type: "text",
    body: input.triggerText,
    line_message_id: input.lineMessageId,
    media_storage_path: null,
    created_at: input.eventTime
  });
  expect(input.messages[1]).toMatchObject({
    tenant_id: "tenant_amamihome",
    customer_id: input.customer?.id,
    role: "system",
    message_type: input.messageType,
    body: input.systemBody,
    line_message_id: null,
    media_storage_path: input.mediaStoragePath,
    created_at: input.eventTime
  });
  expect(input.messages[2]).toMatchObject({
    tenant_id: "tenant_amamihome",
    customer_id: input.customer?.id,
    role: "bot",
    message_type: "text",
    body: input.botReplyText,
    line_message_id: null,
    media_storage_path: null,
    created_at: input.eventTime
  });
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

function lineAttachmentMessagesBody(input: {
  userId: string;
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
        webhookEventId: "01TESTIMAGEEVENT",
        deliveryContext: {
          isRedelivery: false
        },
        replyToken: "reply_token_image",
        message: {
          id: "test-line-image-001",
          type: "image"
        }
      },
      {
        type: "message",
        mode: "active",
        timestamp: input.timestamp + 1000,
        source: {
          type: "user",
          userId: input.userId
        },
        webhookEventId: "01TESTFILEEVENT",
        deliveryContext: {
          isRedelivery: false
        },
        replyToken: "reply_token_file",
        message: {
          id: "test-line-file-001",
          type: "file",
          fileName: "inspection-report.pdf",
          fileSize: 2048
        }
      }
    ]
  });
}

async function sendLineText(
  app: { fetch: (request: Request) => Promise<Response> },
  input: {
    userId: string;
    eventId: string;
    messageId: string;
    replyToken: string;
    text: string;
    timestamp: number;
  }
): Promise<Response> {
  return app.fetch(
    signedRequest(`/api/line/webhook/${knownWebhookSecret}`, lineTextMessageBody(input))
  );
}

function expectMinimalCustomerWebhookResponse(body: unknown, eventCount = 1): void {
  expect(body).toEqual({
    ok: true,
    event_count: eventCount
  });
}

function buildRegisteredCustomer(input: {
  id: string;
  lineUserId: string;
  displayName?: string;
  phone?: string | null;
}): Customer {
  return {
    id: input.id,
    tenant_id: "tenant_amamihome",
    line_user_id: input.lineUserId,
    display_name: input.displayName ?? "商談 顧客",
    picture_url: null,
    phone: input.phone ?? "090-3333-4444",
    email: null,
    postal_code: null,
    address: null,
    interest_tags: ["情報登録済み"],
    response_mode: "bot_auto",
    status: "active",
    last_message_at: null,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: "2026-07-04T00:00:00.000Z",
    updated_at: "2026-07-04T00:00:00.000Z"
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
    expectMinimalCustomerWebhookResponse(body, 2);
    expect(JSON.stringify(body)).not.toContain("U_TEST_USER_001");
    expect(JSON.stringify(body)).not.toContain("モデルホームを見学したいです");

    const customers = customerRepository.list();
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      line_user_id: "U_TEST_USER_001",
      response_mode: "bot_auto",
      last_customer_message_at: new Date(1710000001000).toISOString()
    });

    const messages = messageRepository.list();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customers[0]?.id,
      line_message_id: "test-line-message-001",
      role: "customer",
      message_type: "text",
      body: "モデルホームを見学したいです"
    });
    expect(messages[1]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customers[0]?.id,
      role: "bot",
      message_type: "text"
    });
    expect(messages[1]?.body).toContain("モデルハウス見学予約については、公式ページで確認できます。");
    expect(messages[1]?.body).toContain("https://amamihome.net/reservation/");
  });

  it("fetches LINE attachments into private storage and records only the private object path", async () => {
    const lineClient = new MockLineClient();
    lineClient.messageContents.set("test-line-image-001", {
      data: new Uint8Array([1, 2, 3]),
      contentType: "image/png"
    });
    lineClient.messageContents.set("test-line-file-001", {
      data: new Uint8Array([4, 5, 6]),
      contentType: "application/pdf"
    });
    const storedAttachments: Array<Parameters<LineAttachmentStorage["store"]>[0]> = [];
    const lineAttachmentStorage: LineAttachmentStorage = {
      async store(input) {
        storedAttachments.push(input);
        return {
          media_storage_path: `private/${input.line_message_id}`
        };
      },
      async download() {
        throw new Error("Attachment download is not used by this webhook test.");
      }
    };
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient,
      lineAttachmentStorage,
      staffNotifier,
      env: {
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const rawBody = lineAttachmentMessagesBody({
      userId: "U_TEST_USER_ATTACHMENTS",
      timestamp: 1710000001000
    });
    const response = await app.fetch(
      signedRequest(`/api/line/webhook/${knownWebhookSecret}`, rawBody)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body, 2);
    expect(customerRepository.list()).toHaveLength(1);
    expect(messageRepository.list()).toHaveLength(2);
    expect(messageRepository.list()[0]).toMatchObject({
      role: "customer",
      message_type: "image",
      body: "画像を受信しました。",
      line_message_id: "test-line-image-001",
      media_storage_path: "private/test-line-image-001"
    });
    expect(messageRepository.list()[1]).toMatchObject({
      role: "customer",
      message_type: "file",
      body: "ファイルを受信しました: inspection-report.pdf",
      line_message_id: "test-line-file-001",
      media_storage_path: "private/test-line-file-001"
    });
    expect(storedAttachments).toHaveLength(2);
    expect(storedAttachments[0]).toMatchObject({
      line_message_id: "test-line-image-001",
      message_type: "image",
      content_type: "image/png",
      file_name: null
    });
    expect(storedAttachments[0]?.data).toEqual(new Uint8Array([1, 2, 3]));
    expect(storedAttachments[1]).toMatchObject({
      line_message_id: "test-line-file-001",
      message_type: "file",
      content_type: "application/pdf",
      file_name: "inspection-report.pdf"
    });
    expect(storedAttachments[1]?.data).toEqual(new Uint8Array([4, 5, 6]));
    expect(alertRepository.list()).toHaveLength(1);
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]?.message).toContain(
      "ファイルを受信しました: inspection-report.pdf"
    );
    expect(JSON.stringify(body)).not.toContain("U_TEST_USER_ATTACHMENTS");
    expect(JSON.stringify(body)).not.toContain("inspection-report.pdf");
  });

  it("keeps attachment receipts and creates a high-priority alert when private storage fails", async () => {
    const lineClient = new MockLineClient();
    lineClient.messageContents.set("test-line-image-001", {
      data: new Uint8Array([1, 2, 3]),
      contentType: "image/png"
    });
    lineClient.messageContents.set("test-line-file-001", {
      data: new Uint8Array([4, 5, 6]),
      contentType: "application/pdf"
    });
    const lineAttachmentStorage: LineAttachmentStorage = {
      async store() {
        throw new Error("simulated sensitive storage response");
      },
      async download() {
        throw new Error("Attachment download is not used by this webhook test.");
      }
    };
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, messageRepository } = createTestContext({
      lineClient,
      lineAttachmentStorage,
      staffNotifier,
      env: {
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const response = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineAttachmentMessagesBody({
          userId: "U_TEST_USER_ATTACHMENT_STORAGE_FAILURE",
          timestamp: 1710000001000
        })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body, 2);
    expect(messageRepository.list()).toHaveLength(2);
    expect(messageRepository.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "customer",
          message_type: "image",
          media_storage_path: null,
          body: expect.stringContaining("添付ファイルの保存に失敗しました。")
        }),
        expect.objectContaining({
          role: "customer",
          message_type: "file",
          media_storage_path: null,
          body: expect.stringContaining("添付ファイルの保存に失敗しました。")
        })
      ])
    );
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      severity: "high",
      status: "notified"
    });
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]?.message).toContain(
      "添付ファイルの保存に失敗しました。担当者の確認が必要です。"
    );
    expect(JSON.stringify(messageRepository.list())).not.toContain(
      "simulated sensitive storage response"
    );
    expect(JSON.stringify(body)).not.toContain("U_TEST_USER_ATTACHMENT_STORAGE_FAILURE");
  });

  it("fails closed when LINE attachment storage is unavailable", async () => {
    const lineClient = new MockLineClient();
    lineClient.messageContents.set("test-line-image-001", {
      data: new Uint8Array([1, 2, 3]),
      contentType: "image/png"
    });
    lineClient.messageContents.set("test-line-file-001", {
      data: new Uint8Array([4, 5, 6]),
      contentType: "application/pdf"
    });
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, messageRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const response = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        lineAttachmentMessagesBody({
          userId: "U_TEST_USER_ATTACHMENT_STORAGE_UNAVAILABLE",
          timestamp: 1710000001000
        })
      )
    );

    expect(response.status).toBe(200);
    expect(messageRepository.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "customer",
          message_type: "image",
          media_storage_path: null,
          body: expect.stringContaining("添付ファイルの保存に失敗しました。")
        }),
        expect.objectContaining({
          role: "customer",
          message_type: "file",
          media_storage_path: null,
          body: expect.stringContaining("添付ファイルの保存に失敗しました。")
        })
      ])
    );
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      severity: "high",
      status: "notified"
    });
    expect(staffNotifier.notifications).toHaveLength(1);
  });

  it("skips a redelivered LINE message without duplicating the timeline or reply", async () => {
    const lineClient = new MockLineClient();
    const { app, messageRepository } = createTestContext({ lineClient });
    const input = {
      userId: "U_TEST_USER_REDELIVERY",
      eventId: "01TESTREDELIVERY",
      messageId: "test-redelivery-1",
      replyToken: "reply_token_redelivery",
      text: "今日の天気を教えて",
      timestamp: 1710000001000
    };

    const firstResponse = await sendLineText(app, input);
    const secondResponse = await sendLineText(app, input);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expectMinimalCustomerWebhookResponse(await firstResponse.json());
    expectMinimalCustomerWebhookResponse(await secondResponse.json());
    expect(messageRepository.list()).toHaveLength(2);
    expect(lineClient.replies).toHaveLength(1);
  });

  it("returns 500 for a valid webhook whose processing fails", async () => {
    class FailingInsertMessageRepository extends InMemoryMessageRepository {
      override async insert(): Promise<Message> {
        throw new Error("sensitive processing detail");
      }
    }

    const { app } = createTestContext({
      messageRepository: new FailingInsertMessageRepository()
    });
    const response = await sendLineText(app, {
      userId: "U_TEST_USER_PROCESSING_FAILURE",
      eventId: "01TESTPROCESSINGFAILURE",
      messageId: "test-processing-failure-1",
      replyToken: "reply_token_processing_failure",
      text: "今日の天気を教えて",
      timestamp: 1710000001000
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, error: "line_webhook_processing_failed" });
    expect(JSON.stringify(body)).not.toContain("sensitive processing detail");
    expect(JSON.stringify(body)).not.toContain("U_TEST_USER_PROCESSING_FAILURE");
  });

  it("creates a high-priority handoff when an automatic LINE reply fails", async () => {
    class FailingReplyLineClient extends MockLineClient {
      override async replyMessage(): Promise<void> {
        throw new Error("simulated sensitive LINE response");
      }
    }

    const lineClient = new FailingReplyLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, messageRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const response = await sendLineText(app, {
      userId: "U_TEST_USER_REPLY_FAILURE",
      eventId: "01TESTREPLYFAILURE",
      messageId: "test-reply-failure-1",
      replyToken: "reply_token_failure",
      text: "今日の天気を教えて",
      timestamp: 1710000001000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(messageRepository.list()).toHaveLength(2);
    expect(messageRepository.list()[0]).toMatchObject({
      role: "customer",
      body: "今日の天気を教えて"
    });
    expect(messageRepository.list()[1]).toMatchObject({
      role: "system",
      message_type: "alert",
      body: "自動応答のLINE送信に失敗しました。担当者の確認が必要です。"
    });
    expect(messageRepository.list()[1]?.body).not.toContain("simulated sensitive LINE response");
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      severity: "high",
      status: "notified"
    });
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]?.message).toContain(
      "自動応答のLINE送信に失敗しました。担当者の確認が必要です。"
    );
  });

  it("still escalates an automatic LINE reply failure when pending cleanup fails", async () => {
    class FailingReplyLineClient extends MockLineClient {
      override async replyMessage(): Promise<void> {
        throw new Error("simulated sensitive LINE response");
      }
    }

    class FailingCleanupMessageRepository extends InMemoryMessageRepository {
      override async deleteByIdForTenant(): Promise<boolean> {
        throw new Error("simulated sensitive repository response");
      }
    }

    const staffNotifier = new RecordingStaffNotifier();
    const messageRepository = new FailingCleanupMessageRepository();
    const { app, alertRepository } = createTestContext({
      lineClient: new FailingReplyLineClient(),
      messageRepository,
      staffNotifier,
      env: {
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const response = await sendLineText(app, {
      userId: "U_TEST_USER_REPLY_FAILURE_CLEANUP",
      eventId: "01TESTREPLYFAILURECLEANUP",
      messageId: "test-reply-failure-cleanup-1",
      replyToken: "reply_token_failure_cleanup",
      text: "今日の天気を教えて",
      timestamp: 1710000001000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(messageRepository.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "bot",
          sent_to_line_at: null
        }),
        expect.objectContaining({
          role: "system",
          message_type: "alert",
          body: "自動応答のLINE送信に失敗しました。担当者の確認が必要です。"
        })
      ])
    );
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      severity: "high",
      status: "notified"
    });
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("simulated sensitive");
  });

  it("keeps the staff alert when the failure timeline entry cannot be written", async () => {
    class FailingReplyLineClient extends MockLineClient {
      override async replyMessage(): Promise<void> {
        throw new Error("simulated sensitive LINE response");
      }
    }

    class FailingSystemAlertMessageRepository extends InMemoryMessageRepository {
      override async insert(message: Message): Promise<Message> {
        if (message.role === "system" && message.message_type === "alert") {
          throw new Error("simulated sensitive timeline response");
        }

        return super.insert(message);
      }
    }

    const staffNotifier = new RecordingStaffNotifier();
    const messageRepository = new FailingSystemAlertMessageRepository();
    const { app, alertRepository } = createTestContext({
      lineClient: new FailingReplyLineClient(),
      messageRepository,
      staffNotifier,
      env: {
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const response = await sendLineText(app, {
      userId: "U_TEST_USER_REPLY_FAILURE_TIMELINE",
      eventId: "01TESTREPLYFAILURETIMELINE",
      messageId: "test-reply-failure-timeline-1",
      replyToken: "reply_token_failure_timeline",
      text: "今日の天気を教えて",
      timestamp: 1710000001000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(messageRepository.list()).toHaveLength(1);
    expect(messageRepository.list()[0]).toMatchObject({
      role: "customer",
      body: "今日の天気を教えて"
    });
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      severity: "high",
      status: "notified"
    });
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]?.message).toContain(
      "自動応答のLINE送信に失敗しました。担当者の確認が必要です。"
    );
    expect(JSON.stringify(body)).not.toContain("simulated sensitive");
  });

  it("creates one open staff follow-up alert for a customer LINE update", async () => {
    const { app, alertRepository, customerRepository } = createTestContext();
    const firstResponse = await sendLineText(app, {
      userId: "U_TEST_USER_STAFF_REQUIRED",
      eventId: "01TESTSTAFFREQUIRED1",
      messageId: "test-staff-required-1",
      replyToken: "reply_token_staff_required_1",
      text: "見積について確認したいです",
      timestamp: 1710000001000
    });
    const secondResponse = await sendLineText(app, {
      userId: "U_TEST_USER_STAFF_REQUIRED",
      eventId: "01TESTSTAFFREQUIRED2",
      messageId: "test-staff-required-2",
      replyToken: "reply_token_staff_required_2",
      text: "見積について確認したいです",
      timestamp: 1710000002000
    });
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();
    const customer = customerRepository.list()[0];

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expectMinimalCustomerWebhookResponse(firstBody);
    expectMinimalCustomerWebhookResponse(secondBody);
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      tenant_id: "tenant_amamihome",
      customer_id: customer?.id,
      alert_type: "unreplied_customer_message",
      status: "open",
      severity: "high"
    });
    expect(alertRepository.list()[0]?.message).toContain("見積について確認したいです");
  });

  it("replies to unrelated normal chat without creating a staff alert", async () => {
    const { app, alertRepository, messageRepository } = createTestContext();

    const response = await sendLineText(app, {
      userId: "U_TEST_USER_OUT_OF_SCOPE",
      eventId: "01TESTOUTOFSCOPE",
      messageId: "test-out-of-scope-1",
      replyToken: "reply_token_out_of_scope_1",
      text: "今日の天気を教えて",
      timestamp: 1710000001000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(alertRepository.list()).toHaveLength(0);

    const messages = messageRepository.list();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: "customer",
      body: "今日の天気を教えて"
    });
    expect(messages[1]).toMatchObject({
      role: "bot",
      message_type: "text"
    });
    expect(messages[1]?.sent_to_line_at).not.toBeNull();
    expect(messages[1]?.body).toContain("関係のない内容にはお答えできません。");
  });

  it("does not auto reply while a staff follow-up is pending", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const userId = "U_TEST_USER_PENDING_SAFE_NORMAL_CHAT";
    const customer = {
      ...buildRegisteredCustomer({
        id: "customer_pending_safe_normal_chat",
        lineUserId: userId,
        displayName: "通常質問 太郎"
      }),
      response_mode: "human_required" as const
    };

    await customerRepository.save(customer);

    const response = await sendLineText(app, {
      userId,
      eventId: "01TESTPENDINGSAFENORMALCHAT",
      messageId: "test-pending-safe-normal-chat-1",
      replyToken: "reply_token_pending_safe_normal_chat",
      text: "営業時間は？",
      timestamp: 1710000003000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(alertRepository.list()).toHaveLength(1);
    expect(lineClient.replies).toHaveLength(0);

    const messages = messageRepository.list();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      role: "customer",
      body: "営業時間は？"
    });
  });

  it("does not auto reply while a staff member is actively handling the customer", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const userId = "U_TEST_USER_HUMAN_ACTIVE_NORMAL_CHAT";
    const customer = {
      ...buildRegisteredCustomer({
        id: "customer_human_active_normal_chat",
        lineUserId: userId,
        displayName: "対応中 太郎"
      }),
      response_mode: "human_active" as const
    };

    await customerRepository.save(customer);

    const response = await sendLineText(app, {
      userId,
      eventId: "01TESTHUMANACTIVENORMALCHAT",
      messageId: "test-human-active-normal-chat-1",
      replyToken: "reply_token_human_active_normal_chat",
      text: "営業時間は？",
      timestamp: 1710000004000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(lineClient.replies).toHaveLength(0);
    expect(alertRepository.list()).toHaveLength(1);
    const messages = messageRepository.list();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      role: "customer",
      body: "営業時間は？"
    });
  });

  it("does not auto reply while the customer is in emergency handling mode", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const userId = "U_TEST_USER_EMERGENCY_NORMAL_CHAT";
    const customer = {
      ...buildRegisteredCustomer({
        id: "customer_emergency_normal_chat",
        lineUserId: userId,
        displayName: "緊急対応 太郎"
      }),
      response_mode: "emergency" as const
    };

    await customerRepository.save(customer);

    const response = await sendLineText(app, {
      userId,
      eventId: "01TESTEMERGENCYNORMALCHAT",
      messageId: "test-emergency-normal-chat-1",
      replyToken: "reply_token_emergency_normal_chat",
      text: "営業時間は？",
      timestamp: 1710000005000
    });

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(await response.json());
    expect(lineClient.replies).toHaveLength(0);
    expect(alertRepository.list()).toHaveLength(1);
    expect(messageRepository.list()).toEqual([
      expect.objectContaining({
        role: "customer",
        body: "営業時間は？"
      })
    ]);
  });

  it("hands freshness-sensitive normal chat to staff when stored knowledge is empty", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient,
      knowledgePageRepository: new InMemoryKnowledgePageRepository([])
    });
    const userId = "U_TEST_USER_EMPTY_KNOWLEDGE_NORMAL_CHAT";
    const customer = {
      ...buildRegisteredCustomer({
        id: "customer_empty_knowledge_normal_chat",
        lineUserId: userId,
        displayName: "知識空 太郎"
      }),
      response_mode: "bot_auto" as const
    };

    await customerRepository.save(customer);

    const response = await sendLineText(app, {
      userId,
      eventId: "01TESTEMPTYKNOWLEDGENORMALCHAT",
      messageId: "test-empty-knowledge-normal-chat-1",
      replyToken: "reply_token_empty_knowledge_normal_chat",
      text: "営業時間は？",
      timestamp: 1710000004500
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(alertRepository.list()).toHaveLength(1);
    expect(lineClient.replies).toHaveLength(1);
    expect(lineClient.replies[0]?.messages[0]?.text).toContain("担当者へおつなぎします");

    const messages = messageRepository.list();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: "customer",
      body: "営業時間は？"
    });
    expect(messages[1]).toMatchObject({
      role: "bot",
      message_type: "text"
    });
    expect(messages[1]?.body).toContain("担当者へおつなぎします");
  });

  it("does not treat a future knowledge crawl timestamp as fresh", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, messageRepository } = createTestContext({
      lineClient,
      knowledgePageRepository: new InMemoryKnowledgePageRepository([
        {
          id: "knowledge_future_crawl",
          tenant_id: "tenant_amamihome",
          url: "https://amamihome.net/",
          title: "営業時間",
          category: "company",
          source_type: "official_site",
          content: "営業時間についての保存済み情報です。",
          allowed_for_ai: true,
          last_crawled_at: "2099-01-01T00:00:00.000Z"
        }
      ])
    });

    const response = await sendLineText(app, {
      userId: "U_TEST_USER_FUTURE_KNOWLEDGE",
      eventId: "01TESTFUTUREKNOWLEDGE",
      messageId: "test-future-knowledge-1",
      replyToken: "reply_token_future_knowledge",
      text: "営業時間は？",
      timestamp: 1710000004600
    });

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(await response.json());
    expect(alertRepository.list()).toHaveLength(1);
    expect(lineClient.replies).toHaveLength(1);
    expect(lineClient.replies[0]?.messages[0]?.text).toContain("担当者へおつなぎします");
    expect(messageRepository.list()[1]?.sent_to_line_at).not.toBeNull();
  });

  it("does not auto reply to staff-required normal chat while a staff member is actively handling the customer", async () => {
    const lineClient = new MockLineClient();
    const { app, alertRepository, customerRepository, messageRepository } = createTestContext({
      lineClient
    });
    const userId = "U_TEST_USER_HUMAN_ACTIVE_STAFF_REQUIRED_NORMAL_CHAT";
    const customer = {
      ...buildRegisteredCustomer({
        id: "customer_human_active_staff_required_normal_chat",
        lineUserId: userId,
        displayName: "対応中 見積太郎"
      }),
      response_mode: "human_active" as const
    };

    await customerRepository.save(customer);

    const response = await sendLineText(app, {
      userId,
      eventId: "01TESTHUMANACTIVESTAFFREQUIRED",
      messageId: "test-human-active-staff-required-1",
      replyToken: "reply_token_human_active_staff_required",
      text: "見積の金額を確認したいです",
      timestamp: 1710000005000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(lineClient.replies).toHaveLength(0);
    expect(alertRepository.list()).toHaveLength(1);
    expect(messageRepository.list()).toHaveLength(1);
    expect(messageRepository.list()[0]).toMatchObject({
      role: "customer",
      body: "見積の金額を確認したいです"
    });
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

    const response = await sendLineText(app, {
      userId: "U_TEST_USER_STAFF_NOTIFICATION",
      eventId: "01TESTSTAFFNOTIFICATION",
      messageId: "test-staff-notification",
      replyToken: "reply_token_staff_notification",
      text: "ローンについて個別相談したいです",
      timestamp: 1710000001000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]?.message).toContain("新しい相談が届きました。");
    expect(staffNotifier.notifications[0]?.message).toContain("ローンについて個別相談したいです");
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
      expectMinimalCustomerWebhookResponse(body);
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
    expectMinimalCustomerWebhookResponse(body);
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
    expectGuideTimelineMessages({
      messages,
      customer,
      triggerText: "モデルハウス見学予約",
      lineMessageId: "test-line-message-menu-001",
      systemBody: "モデルハウス見学予約ページ案内済み",
      messageType: "reservation",
      mediaStoragePath: "https://amamihome.net/reservation/",
      botReplyText: lineClient.replies[0]?.messages[0]?.text,
      eventTime
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

  it("uses the saved tenant LINE menu trigger, reply, URL and timeline label", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const operationsRepository = new InMemoryOperationsRepository();
    const lineExperience = createDefaultLineExperienceSettings();
    const reservationItem = lineExperience.menus
      .find((menu) => menu.menu_type === "initial")!
      .items.find((item) => item.action_key === "initial.model_house_reservation")!;

    reservationItem.label = "来場予約";
    reservationItem.trigger_text = "来場予約をする";
    reservationItem.reply_text = "見学予約ページをご案内します。";
    reservationItem.target_url = "https://example.test/visit/";
    reservationItem.timeline_label = "来場予約ページを案内";
    const initialMenu = lineExperience.menus.find((menu) => menu.menu_type === "initial")!;
    initialMenu.published_snapshot = createLineMenuPublishedSnapshot(initialMenu);

    await operationsRepository.saveWorkspaceSettings({
      tenant_id: "tenant_amamihome",
      company_name: "Example Housing",
      product_name: "Example LINE CRM",
      accent_preset: "forest",
      sla_minutes: 240,
      rich_menu_auto_switch_enabled: false,
      customer_status_notifications_enabled: false,
      line_experience: lineExperience,
      setup_completed: true,
      created_at: "2026-07-17T00:00:00.000Z",
      updated_at: "2026-07-17T00:00:00.000Z"
    });

    const { app, messageRepository } = createTestContext({
      lineClient,
      operationsRepository,
      staffNotifier,
      env: { APP_ENV: "production" }
    });
    const response = await app.fetch(
      signedRequest(
        `/api/line/webhook/${knownWebhookSecret}`,
        JSON.stringify({
          destination: "U_TEST_DESTINATION",
          events: [
            {
              type: "message",
              mode: "active",
              timestamp: 1710000002500,
              source: { type: "user", userId: "U_TEST_TENANT_MENU" },
              webhookEventId: "01TESTTENANTMENUGUIDE",
              deliveryContext: { isRedelivery: false },
              replyToken: "reply_token_tenant_menu",
              message: {
                id: "test-line-message-tenant-menu-001",
                type: "text",
                text: "来場予約をする"
              }
            }
          ]
        })
      )
    );

    expect(response.status).toBe(200);
    expect(lineClient.replies).toEqual([
      {
        replyToken: "reply_token_tenant_menu",
        messages: [
          {
            type: "text",
            text: "見学予約ページをご案内します。\n\nhttps://example.test/visit/"
          }
        ]
      }
    ]);
    expect(messageRepository.list().map((message) => message.body)).toContain(
      "来場予約ページを案内"
    );
    expect(staffNotifier.notifications[0]?.message).toContain(
      "種別：LINEメニュー操作（来場予約ページを案内）"
    );
  });

  it("runs a tenant-defined consultation flow from an added rich menu", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const operationsRepository = new InMemoryOperationsRepository();
    const lineExperience = createDefaultLineExperienceSettings();
    lineExperience.menus.push(createCustomServiceMenu());

    await operationsRepository.saveWorkspaceSettings({
      tenant_id: "tenant_amamihome",
      company_name: "Example Housing",
      product_name: "Example LINE CRM",
      accent_preset: "forest",
      sla_minutes: 240,
      rich_menu_auto_switch_enabled: false,
      customer_status_notifications_enabled: false,
      line_experience: lineExperience,
      setup_completed: true,
      created_at: "2026-07-17T00:00:00.000Z",
      updated_at: "2026-07-17T00:00:00.000Z"
    });

    const { app, alertRepository, messageRepository } = createTestContext({
      lineClient,
      operationsRepository,
      staffNotifier,
      env: { APP_ENV: "production" }
    });
    const texts = ["修理について相談", "水まわり", "蛇口から水が漏れています。"];

    for (const [index, text] of texts.entries()) {
      const response = await sendLineText(app, {
        userId: "U_TEST_CUSTOM_SERVICE_FLOW",
        eventId: `01TESTCUSTOMSERVICE${index}`,
        messageId: `test-custom-service-${index}`,
        replyToken: `reply_token_custom_service_${index}`,
        text,
        timestamp: 1710000003000 + index * 1000
      });
      expect(response.status).toBe(200);
    }

    expect(lineClient.replies.at(0)?.messages[0]).toMatchObject({
      type: "text",
      text: "修理が必要な場所を選んでください。\n\n・水まわり\n・電気"
    });
    expect(lineClient.replies.at(1)?.messages[0]?.text).toBe(
      "詳しい状況を入力してください。"
    );
    expect(lineClient.replies.at(-1)?.messages[0]?.text).toContain(
      "修理相談の内容を受け付けました。"
    );
    expect(messageRepository.list().map((message) => message.body)).toEqual(
      expect.arrayContaining([
        "修理箇所：水まわり",
        "詳しい状況：蛇口から水が漏れています。"
      ])
    );
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]?.message).toContain(
      "structured_consultation_flow=service.repair"
    );
    expect(alertRepository.list()[0]?.message).toContain("category=repair");
    expect(alertRepository.list()[0]?.message).toContain("assigned_role=support");
    expect(alertRepository.list()[0]?.message).toContain("repair_area=water");
    expect(alertRepository.list()[0]?.message).toContain(
      "details_label=蛇口から水が漏れています。"
    );
    expect(staffNotifier.notifications.at(-1)?.message).toContain(
      "修理相談の相談が届きました。"
    );
    expect(staffNotifier.notifications.at(-1)?.message).toContain("回答：水まわり");
  });

  it("confirms each matching concurrent rich-menu reply by its exact pending message id", async () => {
    const lineClient = new MockLineClient();
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new PendingReplyInsertBarrierRepository();
    await customerRepository.save(
      buildRegisteredCustomer({
        id: "customer_concurrent_menu_reply",
        lineUserId: "U_TEST_USER_CONCURRENT_MENU"
      })
    );
    const { app } = createTestContext({
      customerRepository,
      lineClient,
      messageRepository,
      env: {
        APP_ENV: "production"
      }
    });

    const responses = await Promise.all([
      sendLineText(app, {
        userId: "U_TEST_USER_CONCURRENT_MENU",
        eventId: "01TESTCONCURRENTMENUREPLYA",
        messageId: "test-concurrent-menu-reply-a",
        replyToken: "reply_token_concurrent_menu_a",
        text: "モデルハウス見学予約",
        timestamp: 1710000002000
      }),
      sendLineText(app, {
        userId: "U_TEST_USER_CONCURRENT_MENU",
        eventId: "01TESTCONCURRENTMENUREPLYB",
        messageId: "test-concurrent-menu-reply-b",
        replyToken: "reply_token_concurrent_menu_b",
        text: "モデルハウス見学予約",
        timestamp: 1710000003000
      })
    ]);
    const matchingReplies = messageRepository
      .list()
      .filter(
        (message) =>
          message.role === "bot" &&
          message.body.includes("モデルハウス見学のご予約はこちら")
      );

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(lineClient.replies).toHaveLength(2);
    expect([...new Set(matchingReplies.map((message) => message.id))]).toHaveLength(2);
    expect(matchingReplies).toHaveLength(2);
    expect(matchingReplies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message_type: "text",
          sent_to_line_at: expect.any(String)
        }),
        expect.objectContaining({
          message_type: "text",
          sent_to_line_at: expect.any(String)
        })
      ])
    );
  });

  it("does not expose an unsent rich-menu reply and alerts staff when delivery fails", async () => {
    class FailingReplyLineClient extends MockLineClient {
      override async replyMessage(): Promise<void> {
        throw new Error("simulated sensitive LINE response");
      }
    }

    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, messageRepository } = createTestContext({
      lineClient: new FailingReplyLineClient(),
      staffNotifier,
      env: {
        APP_ENV: "production",
        STAFF_LINE_CHANNEL_ACCESS_TOKEN: "test_staff_line_access_token"
      }
    });
    const response = await sendLineText(app, {
      userId: "U_TEST_USER_MENU_DELIVERY_FAILURE",
      eventId: "01TESTMENUGUIDEDELIVERYFAILURE",
      messageId: "test-menu-guide-delivery-failure-1",
      replyToken: "reply_token_menu_guide_delivery_failure",
      text: "モデルハウス見学予約",
      timestamp: 1710000002000
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expectMinimalCustomerWebhookResponse(body);
    expect(messageRepository.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "customer",
          body: "モデルハウス見学予約"
        }),
        expect.objectContaining({
          role: "system",
          body: "モデルハウス見学予約ページ案内済み"
        }),
        expect.objectContaining({
          role: "system",
          message_type: "alert",
          body: "LINE自動返信の送信に失敗しました。担当者の確認が必要です。"
        })
      ])
    );
    expect(messageRepository.list()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "bot",
          sent_to_line_at: null
        })
      ])
    );
    expect(alertRepository.list()).toHaveLength(1);
    expect(alertRepository.list()[0]).toMatchObject({
      severity: "high",
      status: "notified"
    });
    expect(staffNotifier.notifications.some((notification) =>
      notification.message.includes(
        "LINE自動返信の送信に失敗しました。担当者の確認が必要です。"
      )
    )).toBe(true);
    expect(JSON.stringify(body)).not.toContain("simulated sensitive");
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
    expectMinimalCustomerWebhookResponse(body);
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
    expectGuideTimelineMessages({
      messages,
      customer,
      triggerText: "家づくり相談",
      lineMessageId: "test-line-message-menu-002",
      systemBody: "家づくり相談ページ案内済み",
      messageType: "text",
      mediaStoragePath: "https://amamihome.net/consultation/",
      botReplyText: lineClient.replies[0]?.messages[0]?.text,
      eventTime
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
    expectMinimalCustomerWebhookResponse(body);
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
    expectGuideTimelineMessages({
      messages,
      customer,
      triggerText: "施工事例を見る",
      lineMessageId: "test-line-message-menu-003",
      systemBody: "施工事例ページ案内済み",
      messageType: "text",
      mediaStoragePath: "https://amamihome.net/works/",
      botReplyText: lineClient.replies[0]?.messages[0]?.text,
      eventTime
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
    expectMinimalCustomerWebhookResponse(body);
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
    expectGuideTimelineMessages({
      messages,
      customer,
      triggerText: "資料請求",
      lineMessageId: "test-line-message-menu-004",
      systemBody: "資料請求ページ案内済み",
      messageType: "text",
      mediaStoragePath: "https://amamihome.net/download/",
      botReplyText: lineClient.replies[0]?.messages[0]?.text,
      eventTime
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
    expectMinimalCustomerWebhookResponse(body);
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
    const messageBodies = messages.map((message) => message.body);
    expect(messageBodies).toEqual(
      expect.arrayContaining([
        "担当者に相談",
        "担当者相談カテゴリ選択案内済み",
        "費用・ローンについて",
        "担当者相談カテゴリ: 費用・ローンについて",
        "担当者相談優先度選択案内済み",
        "はやく返事が欲しい",
        "担当者相談優先度: はやく返事が欲しい",
        "担当者相談連絡先確認案内済み",
        "佐藤花子 / 090-1111-2222",
        "担当者相談連絡先確認済み",
        "担当者相談内容入力案内済み",
        "住宅ローンと予算について相談したいです。",
        "担当者相談受付済み"
      ])
    );
    expect(messages.filter((message) => message.role === "customer").map((message) => message.body))
      .toEqual([
        "担当者に相談",
        "費用・ローンについて",
        "はやく返事が欲しい",
        "佐藤花子 / 090-1111-2222",
        "住宅ローンと予算について相談したいです。"
      ]);
    expect(messages.some((message) => message.role === "bot" && message.body?.includes(
      "相談カテゴリを次から選んで"
    ))).toBe(true);
    expect(messages.some((message) => message.role === "bot" && message.body?.includes(
      "返信の優先度"
    ))).toBe(true);
    expect(messages.some((message) => message.role === "bot" && message.body?.includes(
      "お名前と電話番号"
    ))).toBe(true);
    expect(messages.some((message) => message.role === "bot" && message.body?.includes(
      "相談内容をこのままLINEで"
    ))).toBe(true);
    expect(messages.some((message) => message.role === "bot" && message.body?.includes(
      "相談内容を受け付けました"
    ))).toBe(true);
    expect(messages.find((message) => message.line_message_id === "test-contact-staff-body"))
      .toMatchObject({
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
    expectMinimalCustomerWebhookResponse(categoryBody);
    expect(lineClient.replies[3]?.messages[0]?.text).toContain(
      "カテゴリ「モデルハウス見学について」で受け付けます。"
    );
    expect(lineClient.replies[3]?.messages[0]?.text).not.toContain("カテゴリ「その他」");
    const messages = messageRepository.list();
    expect(messages.filter((message) => message.role === "customer").map((message) => message.body))
      .toEqual(["担当者に相談", "その他", "担当者に相談", "モデルハウス見学について"]);
    expect(messages.map((message) => message.body)).toEqual(
      expect.arrayContaining([
        "担当者相談カテゴリ選択案内済み",
        "担当者相談カテゴリ: その他",
        "担当者相談優先度選択案内済み",
        "担当者相談カテゴリ: モデルハウス見学について"
      ])
    );
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
    expectMinimalCustomerWebhookResponse(body);
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]?.message).toContain("新しい相談が届きました。");
    expect(staffNotifier.notifications[0]?.message).toContain(
      "種別：担当者に相談（モデルハウス見学について）"
    );
    expect(staffNotifier.notifications[0]?.message).not.toContain("種別：未返信の相談");
    expect(staffNotifier.notifications[0]?.message).toContain("緊急度：高");
    expect(staffNotifier.notifications[0]?.message).toContain("顧客：田中太郎");
    expect(staffNotifier.notifications[0]?.message).toContain("電話：090-1111-2222");
    expect(staffNotifier.notifications[0]?.message).toContain("優先度：はやく返事が欲しい");
    expect(staffNotifier.notifications[0]?.message).toContain("相談内容：");
    expect(staffNotifier.notifications[0]?.message).toContain(
      "モデルハウス見学の日程について相談したいです。"
    );
    expect(staffNotifier.notifications[0]?.message).toContain("管理画面で確認してください。");
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
    expectMinimalCustomerWebhookResponse(body);
    expect(staffNotifier.notifications).toHaveLength(1);
    expect(staffNotifier.notifications[0]?.message).toContain("LINEの更新が届きました。");
    expect(staffNotifier.notifications[0]?.message).toContain(
      "種別：担当者に相談（費用・ローンについて）"
    );
    expect(staffNotifier.notifications[0]?.message).toContain("緊急度：通常");
    expect(staffNotifier.notifications[0]?.message).toContain("顧客：登録済み 太郎");
    expect(staffNotifier.notifications[0]?.message).toContain("電話：090-2222-3333");
    expect(staffNotifier.notifications[0]?.message).toContain("日時：2024-03-09T16:00:42.000Z");
    expect(staffNotifier.notifications[0]?.message).toContain(
      "https://admin.taiyolabel.site/customers/customer_registered_contact_staff_repeat"
    );
    expect(staffNotifier.notifications[0]?.message).toContain("優先度：通常でよい");
    expect(staffNotifier.notifications[0]?.message).toContain("相談内容：");
    expect(staffNotifier.notifications[0]?.message).toContain(
      "資金計画について担当者に相談したいです。"
    );
    expect(staffNotifier.notifications[0]?.message).not.toContain(
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

    expectMinimalCustomerWebhookResponse(categoryBody);
    expectMinimalCustomerWebhookResponse(priorityBody);
    expect(lineClient.replies[1]?.messages[0]?.text).toContain("返信の優先度");
    expect(lineClient.replies[2]?.messages[0]?.text).not.toContain("お名前と電話番号");
    expect(lineClient.replies[2]?.messages[0]?.text).toContain("相談内容をこのままLINEで");
    expect(messages.filter((message) => message.role === "customer").map((message) => message.body))
      .toEqual([
        "担当者に相談",
        "家づくりについて",
        "急ぎではない",
        "平屋の進め方を担当者に相談したいです。"
      ]);
    expect(messages.map((message) => message.body)).toEqual(
      expect.arrayContaining([
        "担当者相談カテゴリ選択案内済み",
        "担当者相談カテゴリ: 家づくりについて",
        "担当者相談優先度選択案内済み",
        "担当者相談優先度: 急ぎではない",
        "担当者相談内容入力案内済み",
        "担当者相談受付済み"
      ])
    );
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

  it("creates a structured meeting alert and staff notification with customer detail link", async () => {
    const lineClient = new MockLineClient();
    const staffNotifier = new RecordingStaffNotifier();
    const { app, alertRepository, customerRepository } = createTestContext({
      lineClient,
      staffNotifier,
      env: {
        APP_ENV: "production"
      }
    });
    const userId = "U_TEST_USER_STRUCTURED_MEETING";

    await customerRepository.save(
      buildRegisteredCustomer({
        id: "customer_structured_meeting",
        lineUserId: userId,
        displayName: "構造 太郎",
        phone: "090-3333-4444"
      })
    );

    const texts = [
      "打合せ予約・変更",
      "日時を変更したい",
      "来店",
      "第1希望 7/10 10:00\n第2希望 7/11 13:00",
      "プラン",
      "間取りの打合せ日時を変更したいです。"
    ];
    let finalBody: unknown = null;
    for (const [index, text] of texts.entries()) {
      const response = await sendLineText(app, {
        userId,
        eventId: `01TESTSTRUCTUREDMEETING${index}`,
        messageId: `test-structured-meeting-${index}`,
        replyToken: `reply_token_structured_meeting_${index}`,
        text,
        timestamp: 1710000050000 + index * 1000
      });
      finalBody = await response.json();
      expect(response.status).toBe(200);
    }

    expectMinimalCustomerWebhookResponse(finalBody);
    expect(lineClient.replies.at(0)?.messages[0]?.text).toContain("用件を次から選んで");
    expect(lineClient.replies.at(-1)?.messages[0]?.text).toContain(
      "打合せ予約・変更の内容を受け付けました。"
    );
    expect(alertRepository.list()[0]?.message).toContain(
      "structured_consultation_flow=negotiation.meeting_schedule"
    );
    expect(alertRepository.list()[0]?.message).toContain("sub_category=reschedule");
    expect(alertRepository.list()[0]?.message).toContain(
      "body_label=間取りの打合せ日時を変更したいです。"
    );

    const notification = staffNotifier.notifications[staffNotifier.notifications.length - 1];
    expect(notification?.message).toContain("打合せ予約・変更の相談が届きました。");
    expect(notification?.message).toContain("種別：日時変更");
    expect(notification?.message).toContain("緊急度：通常");
    expect(notification?.message).toContain("顧客：構造 太郎");
    expect(notification?.message).toContain("電話：090-3333-4444");
    expect(notification?.message).toContain("希望方法：来店");
    expect(notification?.message).toContain("希望日時：入力あり");
    expect(notification?.message).toContain("打合せ内容：プラン");
    expect(notification?.message).toContain("担当：営業");
    expect(notification?.message).toContain("間取りの打合せ日時を変更したいです。");
    expect(notification?.message).toContain(
      "https://admin.taiyolabel.site/customers/customer_structured_meeting"
    );
    expect(notification?.message).not.toContain("http://localhost:3000");
  });

  it("skips booking-only meeting questions for cancel and confirm requests", async () => {
    const cases = [
      {
        id: "cancel",
        userId: "U_TEST_USER_STRUCTURED_MEETING_CANCEL",
        customerId: "customer_structured_meeting_cancel",
        texts: [
          "打合せ予約・変更",
          "キャンセルしたい",
          "7/20 10:00の打合せ",
          "都合が悪くなりました。"
        ],
        nextPrompt: "キャンセルしたい打合せの日時",
        alertSnippets: [
          "sub_category=cancel",
          "cancel_meeting_datetime_present=true",
          "body_label=都合が悪くなりました。"
        ],
        notificationSnippets: [
          "打合せ予約・変更の相談が届きました。",
          "種別：キャンセル",
          "キャンセル対象日時：入力あり",
          "担当：営業",
          "都合が悪くなりました。"
        ]
      },
      {
        id: "confirm",
        userId: "U_TEST_USER_STRUCTURED_MEETING_CONFIRM",
        customerId: "customer_structured_meeting_confirm",
        texts: [
          "打合せ予約・変更",
          "打合せ内容を確認したい",
          "7/22 13:00の打合せ内容",
          "持ち物も確認したいです。"
        ],
        nextPrompt: "確認したい打合せの日時や内容",
        alertSnippets: [
          "sub_category=confirm",
          "confirm_meeting_datetime_present=true",
          "body_label=持ち物も確認したいです。"
        ],
        notificationSnippets: [
          "打合せ予約・変更の相談が届きました。",
          "種別：内容確認",
          "確認対象：入力あり",
          "担当：営業",
          "持ち物も確認したいです。"
        ]
      }
    ];

    for (const testCase of cases) {
      const lineClient = new MockLineClient();
      const staffNotifier = new RecordingStaffNotifier();
      const { app, alertRepository, customerRepository } = createTestContext({
        lineClient,
        staffNotifier,
        env: {
          APP_ENV: "production"
        }
      });

      await customerRepository.save(
        buildRegisteredCustomer({
          id: testCase.customerId,
          lineUserId: testCase.userId,
          displayName: "分岐 顧客"
        })
      );

      let finalBody: unknown = null;
      for (const [index, text] of testCase.texts.entries()) {
        const response = await sendLineText(app, {
          userId: testCase.userId,
          eventId: `01TESTSTRUCTUREDMEETINGBRANCH${testCase.id}${index}`,
          messageId: `test-structured-meeting-branch-${testCase.id}-${index}`,
          replyToken: `reply_token_structured_meeting_branch_${testCase.id}_${index}`,
          text,
          timestamp: 1710000055000 + index * 1000
        });
        finalBody = await response.json();
        expect(response.status).toBe(200);
      }

      expect(lineClient.replies[1]?.messages[0]?.text).toContain(testCase.nextPrompt);
      expect(lineClient.replies[1]?.messages[0]?.text).not.toContain("希望方法");
      expectMinimalCustomerWebhookResponse(finalBody);

      const alertMessage = alertRepository.list()[0]?.message ?? "";
      for (const snippet of testCase.alertSnippets) {
        expect(alertMessage).toContain(snippet);
      }
      expect(alertMessage).not.toContain("\nmethod=");
      expect(alertMessage).not.toContain("\nmeeting_topic=");

      const notification = staffNotifier.notifications[staffNotifier.notifications.length - 1];
      for (const snippet of testCase.notificationSnippets) {
        expect(notification?.message).toContain(snippet);
      }
      expect(notification?.message).toContain(
        `https://admin.taiyolabel.site/customers/${testCase.customerId}`
      );
      expect(notification?.message).not.toContain("希望方法：");
      expect(notification?.message).not.toContain("希望日時：");
      expect(notification?.message).not.toContain("打合せ内容：");
      expect(notification?.message).not.toContain("http://localhost:3000");
    }
  });

  it("skips context-inapplicable structured consultation questions", async () => {
    const cases = [
      {
        id: "plan-exterior",
        userId: "U_TEST_USER_STRUCTURED_PLAN_EXTERIOR",
        customerId: "customer_structured_plan_exterior",
        texts: [
          "プラン・間取り相談",
          "外観デザインについて",
          "玄関まわり",
          "玄関まわりの雰囲気を相談したいです。",
          "相談して決めたい"
        ],
        nextPromptContains: "外観で相談したい箇所",
        nextPromptNotContains: "LDK",
        alertSnippets: [
          "sub_category=exterior",
          "exterior_target_area=entrance_exterior",
          "exterior_target_area_label=玄関まわり"
        ],
        alertNotSnippets: ["\ntarget_area="],
        notificationSnippets: [
          "プラン・間取り相談の相談が届きました。",
          "種別：外観デザイン",
          "対象：玄関まわり",
          "玄関まわりの雰囲気を相談したいです。"
        ]
      },
      {
        id: "plan-other",
        userId: "U_TEST_USER_STRUCTURED_PLAN_OTHER",
        customerId: "customer_structured_plan_other",
        texts: [
          "プラン・間取り相談",
          "その他",
          "全体の雰囲気について相談したいです。",
          "相談して決めたい"
        ],
        nextPromptContains: "具体的な相談内容",
        nextPromptNotContains: "対象の場所",
        alertSnippets: ["sub_category=other", "body_label=全体の雰囲気について相談したいです。"],
        alertNotSnippets: ["\ntarget_area=", "\nexterior_target_area="],
        notificationSnippets: [
          "プラン・間取り相談の相談が届きました。",
          "種別：その他",
          "対象：指定なし",
          "全体の雰囲気について相談したいです。"
        ]
      },
      {
        id: "plan-interior",
        userId: "U_TEST_USER_STRUCTURED_PLAN_INTERIOR",
        customerId: "customer_structured_plan_interior",
        texts: [
          "プラン・間取り相談",
          "内装デザインについて",
          "LDK",
          "LDKの内装イメージを相談したいです。",
          "できれば反映したい"
        ],
        nextPromptContains: "対象の場所",
        nextPromptNotContains: "外観",
        alertSnippets: [
          "sub_category=interior",
          "target_area=ldk",
          "target_area_label=LDK"
        ],
        alertNotSnippets: ["\nexterior_target_area="],
        notificationSnippets: [
          "プラン・間取り相談の相談が届きました。",
          "種別：内装デザイン",
          "対象：LDK",
          "LDKの内装イメージを相談したいです。"
        ]
      },
      {
        id: "land-search",
        userId: "U_TEST_USER_STRUCTURED_LAND_SEARCH",
        customerId: "customer_structured_land_search",
        texts: [
          "土地・敷地の相談",
          "土地を探している",
          "松山市周辺",
          "駅に近い土地を探しています。"
        ],
        nextPromptContains: "住所またはエリア",
        nextPromptNotContains: "土地の状況",
        alertSnippets: [
          "sub_category=land_search",
          "area_present=true",
          "body_label=駅に近い土地を探しています。"
        ],
        alertNotSnippets: ["\nland_status="],
        notificationSnippets: [
          "土地・敷地の相談の相談が届きました。",
          "種別：土地探し",
          "土地状況：土地探し中",
          "駅に近い土地を探しています。"
        ]
      },
      {
        id: "land-site-survey",
        userId: "U_TEST_USER_STRUCTURED_LAND_SITE_SURVEY",
        customerId: "customer_structured_land_site_survey",
        texts: [
          "土地・敷地の相談",
          "敷地調査をお願いしたい",
          "松山市周辺",
          "候補地の敷地調査について確認したいです。"
        ],
        nextPromptContains: "住所またはエリア",
        nextPromptNotContains: "土地の状況",
        alertSnippets: [
          "sub_category=site_survey",
          "area_present=true",
          "body_label=候補地の敷地調査について確認したいです。"
        ],
        alertNotSnippets: ["\nland_status="],
        notificationSnippets: [
          "土地・敷地の相談の相談が届きました。",
          "種別：敷地調査",
          "土地状況：敷地調査希望",
          "候補地の敷地調査について確認したいです。"
        ]
      },
      {
        id: "documents-pre-contract",
        userId: "U_TEST_USER_STRUCTURED_DOCUMENTS_PRE_CONTRACT",
        customerId: "customer_structured_documents_pre_contract",
        texts: [
          "必要書類・確認事項",
          "契約前の確認",
          "契約前に確認すべき書類を知りたいです。"
        ],
        nextPromptContains: "具体的な内容",
        nextPromptNotContains: "現在の段階",
        alertSnippets: [
          "sub_category=pre_contract",
          "body_label=契約前に確認すべき書類を知りたいです。"
        ],
        alertNotSnippets: ["\ncurrent_stage="],
        notificationSnippets: [
          "必要書類・確認事項の相談が届きました。",
          "種別：契約前確認",
          "現在の段階：契約前確認",
          "契約前に確認すべき書類を知りたいです。"
        ]
      }
    ];

    for (const testCase of cases) {
      const lineClient = new MockLineClient();
      const staffNotifier = new RecordingStaffNotifier();
      const { app, alertRepository, customerRepository } = createTestContext({
        lineClient,
        staffNotifier,
        env: {
          APP_ENV: "production"
        }
      });

      await customerRepository.save(
        buildRegisteredCustomer({
          id: testCase.customerId,
          lineUserId: testCase.userId,
          displayName: "分岐 顧客"
        })
      );

      let finalBody: unknown = null;
      for (const [index, text] of testCase.texts.entries()) {
        const response = await sendLineText(app, {
          userId: testCase.userId,
          eventId: `01TESTSTRUCTUREDINAPPLICABLE${testCase.id}${index}`,
          messageId: `test-structured-inapplicable-${testCase.id}-${index}`,
          replyToken: `reply_token_structured_inapplicable_${testCase.id}_${index}`,
          text,
          timestamp: 1710000058000 + index * 1000
        });
        finalBody = await response.json();
        expect(response.status).toBe(200);
      }

      expect(lineClient.replies[1]?.messages[0]?.text).toContain(
        testCase.nextPromptContains
      );
      expect(lineClient.replies[1]?.messages[0]?.text).not.toContain(
        testCase.nextPromptNotContains
      );
      expectMinimalCustomerWebhookResponse(finalBody);

      const alertMessage = alertRepository.list()[0]?.message ?? "";
      for (const snippet of testCase.alertSnippets) {
        expect(alertMessage).toContain(snippet);
      }
      for (const snippet of testCase.alertNotSnippets) {
        expect(alertMessage).not.toContain(snippet);
      }

      const notification = staffNotifier.notifications[staffNotifier.notifications.length - 1];
      for (const snippet of testCase.notificationSnippets) {
        expect(notification?.message).toContain(snippet);
      }
      expect(notification?.message).toContain(
        `https://admin.taiyolabel.site/customers/${testCase.customerId}`
      );
      expect(notification?.message).not.toContain("http://localhost:3000");
    }
  });

  it("creates structured staff notifications for plan estimate land and document flows", async () => {
    const cases = [
      {
        id: "plan",
        userId: "U_TEST_USER_STRUCTURED_PLAN",
        customerId: "customer_structured_plan",
        texts: [
          "プラン・間取り相談",
          "要望を変更したい",
          "LDK",
          "LDKの収納を増やしたいです。",
          "必ず反映したい"
        ],
        alertSnippets: [
          "structured_consultation_flow=negotiation.plan_consultation",
          "category=plan_design",
          "sub_category=requirement_change",
          "estimate_impact_possible=true",
          "notify_estimator=true"
        ],
        notificationSnippets: [
          "プラン・間取り相談の相談が届きました。",
          "種別：要望変更",
          "対象：LDK",
          "内容：要望変更",
          "希望優先度：必ず反映したい",
          "見積影響：可能性あり",
          "担当：設計",
          "LDKの収納を増やしたいです。"
        ]
      },
      {
        id: "estimate",
        userId: "U_TEST_USER_STRUCTURED_ESTIMATE",
        customerId: "customer_structured_estimate",
        texts: [
          "見積・資金計画",
          "住宅ローンについて相談したい",
          "ローン相談中",
          "借入額の目安を確認したいです。",
          "説明してほしい"
        ],
        alertSnippets: [
          "structured_consultation_flow=negotiation.estimate_budget",
          "category=estimate_budget",
          "sub_category=loan",
          "secondary_role=estimator",
          "requires_staff_confirmation=true",
          "ai_auto_reply=false"
        ],
        notificationSnippets: [
          "見積・資金計画の相談が届きました。",
          "種別：住宅ローン",
          "緊急度：高",
          "現在の状況：ローン相談中",
          "希望対応：説明してほしい",
          "AI自動返信：不可",
          "担当確認：必要",
          "担当：営業 / 積算",
          "借入額の目安を確認したいです。"
        ]
      },
      {
        id: "land",
        userId: "U_TEST_USER_STRUCTURED_LAND",
        customerId: "customer_structured_land",
        texts: [
          "土地・敷地の相談",
          "敷地調査をお願いしたい",
          "松山市周辺",
          "候補地の敷地調査について確認したいです。"
        ],
        alertSnippets: [
          "structured_consultation_flow=negotiation.land_site",
          "category=land_site",
          "sub_category=site_survey",
          "area_present=true",
          "attachment_guidance=sent"
        ],
        notificationSnippets: [
          "土地・敷地の相談の相談が届きました。",
          "種別：敷地調査",
          "土地状況：敷地調査希望",
          "エリア：入力あり",
          "資料添付：案内済み",
          "担当：営業",
          "候補地の敷地調査について確認したいです。"
        ]
      },
      {
        id: "documents",
        userId: "U_TEST_USER_STRUCTURED_DOCUMENTS",
        customerId: "customer_structured_documents",
        texts: [
          "必要書類・確認事項",
          "ローン関連書類",
          "ローン審査中",
          "事前審査に必要な書類を確認したいです。"
        ],
        alertSnippets: [
          "structured_consultation_flow=negotiation.required_documents",
          "category=documents",
          "sub_category=loan_docs",
          "assigned_role=sales_admin",
          "secondary_role=sales",
          "document_image_guidance=sent"
        ],
        notificationSnippets: [
          "必要書類・確認事項の相談が届きました。",
          "種別：ローン関連書類",
          "現在の段階：ローン審査中",
          "書類画像：添付案内済み",
          "担当：営業事務 / 営業",
          "事前審査に必要な書類を確認したいです。"
        ]
      }
    ];

    for (const testCase of cases) {
      const lineClient = new MockLineClient();
      const staffNotifier = new RecordingStaffNotifier();
      const { app, alertRepository, customerRepository } = createTestContext({
        lineClient,
        staffNotifier,
        env: {
          APP_ENV: "production"
        }
      });

      await customerRepository.save(
        buildRegisteredCustomer({
          id: testCase.customerId,
          lineUserId: testCase.userId
        })
      );

      let finalBody: unknown = null;
      for (const [index, text] of testCase.texts.entries()) {
        const response = await sendLineText(app, {
          userId: testCase.userId,
          eventId: `01TESTSTRUCTURED${testCase.id}${index}`,
          messageId: `test-structured-${testCase.id}-${index}`,
          replyToken: `reply_token_structured_${testCase.id}_${index}`,
          text,
          timestamp: 1710000060000 + index * 1000
        });
        finalBody = await response.json();
        expect(response.status).toBe(200);
      }

      expectMinimalCustomerWebhookResponse(finalBody);

      const alertMessage = alertRepository.list()[0]?.message ?? "";
      for (const snippet of testCase.alertSnippets) {
        expect(alertMessage).toContain(snippet);
      }

      const notification = staffNotifier.notifications[staffNotifier.notifications.length - 1];
      expect(notification?.message).toContain("顧客：商談 顧客");
      expect(notification?.message).toContain(
        `https://admin.taiyolabel.site/customers/${testCase.customerId}`
      );
      expect(notification?.message).not.toContain("http://localhost:3000");
      for (const snippet of testCase.notificationSnippets) {
        expect(notification?.message).toContain(snippet);
      }
    }
  });

  it("creates structured aftercare flow alerts and staff notifications", async () => {
    const cases = [
      {
        id: "repair",
        userId: "U_TEST_USER_AFTERCARE_REPAIR",
        customerId: "customer_aftercare_repair",
        texts: [
          "修理・点検依頼",
          "修理をお願いしたい",
          "水まわり",
          "キッチン下から水漏れしています。",
          "7/8 午前希望",
          "急ぎ"
        ],
        alertSnippets: [
          "structured_consultation_flow=aftercare.repair_inspection",
          "category=aftercare_repair_inspection",
          "assigned_role=aftercare",
          "sub_category=repair",
          "target_area=water",
          "desired_datetime_present=true",
          "urgency=urgent",
          "photo_video_guidance=sent",
          "classification_tree=アフターメニュー > 修理・点検依頼 > 修理 > 水まわり > 高"
        ],
        notificationSnippets: [
          "修理・点検依頼の相談が届きました。",
          "種別：修理",
          "緊急度：高",
          "顧客：アフター 顧客",
          "内容：修理",
          "対象箇所：水まわり",
          "希望対応日時：入力あり",
          "写真・動画：添付案内済み",
          "担当：アフター",
          "キッチン下から水漏れしています。"
        ]
      },
      {
        id: "periodic",
        userId: "U_TEST_USER_AFTERCARE_PERIODIC",
        customerId: "customer_aftercare_periodic",
        texts: [
          "定期点検予約",
          "第1希望 7/15 10:00\n第2希望 7/16 14:00",
          "外壁・屋根",
          "外壁の汚れも見てほしいです。"
        ],
        alertSnippets: [
          "structured_consultation_flow=aftercare.periodic_inspection",
          "category=aftercare_periodic_inspection",
          "assigned_role=aftercare",
          "desired_datetime_present=true",
          "concern_area=exterior_roof",
          "inspection_schedule_requested=true",
          "classification_tree=アフターメニュー > 定期点検予約 > 外壁・屋根"
        ],
        notificationSnippets: [
          "定期点検予約の相談が届きました。",
          "種別：定期点検予約",
          "緊急度：通常",
          "希望日時：入力あり",
          "気になる箇所：外壁・屋根",
          "担当：アフター",
          "外壁の汚れも見てほしいです。"
        ]
      },
      {
        id: "trouble",
        userId: "U_TEST_USER_AFTERCARE_TROUBLE",
        customerId: "customer_aftercare_trouble",
        texts: [
          "不具合を相談",
          "建具の不具合",
          "玄関ドアが閉まりにくいです。",
          "数日以内"
        ],
        alertSnippets: [
          "structured_consultation_flow=aftercare.trouble_consultation",
          "category=aftercare_trouble",
          "assigned_role=aftercare",
          "sub_category=fixtures",
          "urgency=soon",
          "photo_video_guidance=sent",
          "classification_tree=アフターメニュー > 不具合を相談 > 建具 > 中"
        ],
        notificationSnippets: [
          "不具合相談の相談が届きました。",
          "種別：建具",
          "緊急度：通常",
          "不具合種別：建具",
          "緊急度：中",
          "写真・動画：添付案内済み",
          "担当：アフター",
          "玄関ドアが閉まりにくいです。"
        ]
      },
      {
        id: "warranty",
        userId: "U_TEST_USER_AFTERCARE_WARRANTY",
        customerId: "customer_aftercare_warranty",
        texts: [
          "保証・メンテナンス",
          "保証について確認したい",
          "設備保証の範囲を確認したいです。",
          "担当者に確認してほしい"
        ],
        alertSnippets: [
          "structured_consultation_flow=aftercare.warranty_maintenance",
          "category=aftercare_warranty_maintenance",
          "assigned_role=aftercare",
          "sub_category=warranty",
          "desired_response=staff_confirmation",
          "requires_staff_confirmation=true",
          "ai_auto_reply=false",
          "classification_tree=アフターメニュー > 保証・メンテナンス > 保証 > 担当者に確認してほしい"
        ],
        notificationSnippets: [
          "保証・メンテナンスの相談が届きました。",
          "種別：保証",
          "緊急度：通常",
          "希望対応：担当者に確認してほしい",
          "AI自動返信：不可",
          "担当確認：必要",
          "担当：アフター",
          "設備保証の範囲を確認したいです。"
        ]
      }
    ];

    for (const testCase of cases) {
      const lineClient = new MockLineClient();
      const staffNotifier = new RecordingStaffNotifier();
      const { app, alertRepository, customerRepository } = createTestContext({
        lineClient,
        staffNotifier,
        env: {
          APP_ENV: "production"
        }
      });

      await customerRepository.save(
        buildRegisteredCustomer({
          id: testCase.customerId,
          lineUserId: testCase.userId,
          displayName: "アフター 顧客"
        })
      );

      let finalBody: unknown = null;
      for (const [index, text] of testCase.texts.entries()) {
        const response = await sendLineText(app, {
          userId: testCase.userId,
          eventId: `01TESTAFTERCARE${testCase.id}${index}`,
          messageId: `test-aftercare-${testCase.id}-${index}`,
          replyToken: `reply_token_aftercare_${testCase.id}_${index}`,
          text,
          timestamp: 1710000070000 + index * 1000
        });
        finalBody = await response.json();
        expect(response.status).toBe(200);
      }

      expectMinimalCustomerWebhookResponse(finalBody);

      const alertMessage = alertRepository.list()[0]?.message ?? "";
      for (const snippet of testCase.alertSnippets) {
        expect(alertMessage).toContain(snippet);
      }

      const notification = staffNotifier.notifications[staffNotifier.notifications.length - 1];
      for (const snippet of testCase.notificationSnippets) {
        expect(notification?.message).toContain(snippet);
      }
      expect(notification?.message).toContain(
        `https://admin.taiyolabel.site/customers/${testCase.customerId}`
      );
      expect(notification?.message).not.toContain("http://localhost:3000");
    }
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
    expect(messageRepository.list()).toHaveLength(2);
    expect(messageRepository.list()[0]).toMatchObject({
      role: "customer",
      body: "モデルホームを見学したいです"
    });
    expect(messageRepository.list()[1]).toMatchObject({
      role: "system",
      message_type: "alert"
    });
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
    expect(messageRepository.list()).toHaveLength(4);
    expect(messageRepository.list().map((message) => message.tenant_id).sort()).toEqual([
      "tenant_amamihome",
      "tenant_amamihome",
      "tenant_other",
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
