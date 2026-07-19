import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { createApiApp, readStaffReplyStaffUserId } from "../../apps/api/src/index";
import { REAL_LINE_PUSH_CONFIRMATION_VALUE } from "../../apps/api/src/admin/line-real-push-gate";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  InMemoryOperationsRepository,
  type Customer,
  type OutboundLineMediaStorage
} from "@amami-line-crm/domain";
import { MockLineClient, type LineClient, type LineReplyMessage } from "@amami-line-crm/line";

const channelSecret = "test_line_channel_secret";
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const MP4_BYTES = new Uint8Array([
  0x00,
  0x00,
  0x00,
  0x0c,
  0x66,
  0x74,
  0x79,
  0x70,
  0x69,
  0x73,
  0x6f,
  0x6d
]);
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

class FailingPrepareMessageRepository extends InMemoryMessageRepository {
  override async insertMany(): Promise<never> {
    throw new Error("Mock history prepare failure.");
  }
}

class LostPrepareAcknowledgementMessageRepository extends InMemoryMessageRepository {
  override async insertMany(
    messages: Parameters<InMemoryMessageRepository["insertMany"]>[0]
  ): Promise<never> {
    await super.insertMany(messages);
    throw new Error("Mock lost history prepare acknowledgement.");
  }
}

class IncompletePrepareMessageRepository extends InMemoryMessageRepository {
  override async insertMany(
    messages: Parameters<InMemoryMessageRepository["insertMany"]>[0]
  ): Promise<Awaited<ReturnType<InMemoryMessageRepository["insertMany"]>>> {
    const saved = await super.insertMany(messages);
    return saved.slice(0, -1);
  }
}

class FailingFinalizeMessageRepository extends InMemoryMessageRepository {
  override async updateStaffMessagesSentToLineAt(): Promise<never> {
    throw new Error("Mock history finalize failure.");
  }
}

class LostFinalizeAcknowledgementMessageRepository extends InMemoryMessageRepository {
  override async updateStaffMessagesSentToLineAt(
    input: Parameters<InMemoryMessageRepository["updateStaffMessagesSentToLineAt"]>[0]
  ): Promise<never> {
    await super.updateStaffMessagesSentToLineAt(input);
    throw new Error("Mock lost history finalize acknowledgement.");
  }
}

class FailingCustomerSaveRepository extends InMemoryCustomerRepository {
  failSaves = false;

  override async save(customer: Customer): Promise<Customer> {
    if (this.failSaves) throw new Error("Mock customer projection failure.");
    return super.save(customer);
  }
}

class FailingAuditOperationsRepository extends InMemoryOperationsRepository {
  override async recordAuditEvent(): Promise<never> {
    throw new Error("Mock audit failure.");
  }
}

class InMemoryOutboundLineMediaStorage implements OutboundLineMediaStorage {
  readonly prepared: Array<
    Parameters<NonNullable<OutboundLineMediaStorage["prepareUpload"]>>[0]
  > = [];
  readonly stored: Array<Parameters<OutboundLineMediaStorage["store"]>[0]> = [];
  readonly removed: string[][] = [];
  readonly removedUploads: Array<
    Parameters<NonNullable<OutboundLineMediaStorage["removeUpload"]>>[0]
  > = [];
  readonly finalized: Array<
    Parameters<NonNullable<OutboundLineMediaStorage["finalizeUpload"]>>[0]
  > = [];
  readonly inspected: string[] = [];
  readonly downloaded: string[] = [];
  readonly expiredCleanupCalls: Array<
    Parameters<NonNullable<OutboundLineMediaStorage["removeExpiredUploads"]>>[0]
  > = [];

  async prepareUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["prepareUpload"]>>[0]
  ): Promise<Awaited<ReturnType<NonNullable<OutboundLineMediaStorage["prepareUpload"]>>>> {
    this.prepared.push(input);
    return {
      media_upload_url: "https://media.example.invalid/upload/original",
      preview_upload_url: "https://media.example.invalid/upload/preview"
    };
  }

  async resolveUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["resolveUpload"]>>[0]
  ): Promise<Awaited<ReturnType<NonNullable<OutboundLineMediaStorage["resolveUpload"]>>>> {
    const mediaExtension =
      input.content_type === "video/mp4"
        ? "mp4"
        : input.content_type === "image/png"
          ? "png"
          : "jpg";
    const previewExtension = input.preview_content_type === "image/png" ? "png" : "jpg";
    return {
      media_storage_path: `${input.tenant_id}/outbound-prepared/${input.media_id}-original.${mediaExtension}`,
      preview_storage_path: `${input.tenant_id}/outbound-prepared/${input.media_id}-preview.${previewExtension}`
    };
  }

  async finalizeUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["finalizeUpload"]>>[0]
  ): Promise<Awaited<ReturnType<NonNullable<OutboundLineMediaStorage["finalizeUpload"]>>>> {
    this.finalized.push(input);
    const mediaExtension =
      input.content_type === "video/mp4"
        ? "mp4"
        : input.content_type === "image/png"
          ? "png"
          : "jpg";
    const previewExtension = input.preview_content_type === "image/png" ? "png" : "jpg";
    const prefix = `${input.tenant_id}/outbound/${input.media_id}`;
    return {
      media_storage_path: `${prefix}/original.${mediaExtension}`,
      preview_storage_path: `${prefix}/preview.${previewExtension}`,
      original_content_url: "https://media.example.invalid/original",
      preview_image_url: "https://media.example.invalid/preview"
    };
  }

  async removeUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["removeUpload"]>>[0]
  ): Promise<void> {
    this.removedUploads.push(input);
  }

  async removeExpiredUploads(
    input: Parameters<NonNullable<OutboundLineMediaStorage["removeExpiredUploads"]>>[0]
  ): Promise<number> {
    this.expiredCleanupCalls.push(input);
    return 0;
  }

  async store(
    input: Parameters<OutboundLineMediaStorage["store"]>[0]
  ): Promise<Awaited<ReturnType<OutboundLineMediaStorage["store"]>>> {
    this.stored.push(input);
    const prefix = `${input.tenant_id}/outbound/${input.media_id}`;
    const mediaExtension = input.media_type === "video" ? "mp4" : "jpg";

    return {
      media_storage_path: `${prefix}/original.${mediaExtension}`,
      preview_storage_path: `${prefix}/preview.jpg`,
      original_content_url: "https://media.example.invalid/original",
      preview_image_url: "https://media.example.invalid/preview"
    };
  }

  async inspect(
    input: Parameters<OutboundLineMediaStorage["inspect"]>[0]
  ): Promise<Awaited<ReturnType<OutboundLineMediaStorage["inspect"]>>> {
    this.inspected.push(input.media_storage_path);
    const data = this.blobForPath(input.media_storage_path);
    return { size: data.size, content_type: data.type || null };
  }

  async download(
    input: Parameters<OutboundLineMediaStorage["download"]>[0]
  ): Promise<{ data: Blob; content_type: string | null }> {
    this.downloaded.push(input.media_storage_path);
    const data = this.blobForPath(input.media_storage_path);
    return { data, content_type: data.type || null };
  }

  async remove(input: Parameters<OutboundLineMediaStorage["remove"]>[0]): Promise<void> {
    this.removed.push(input.media_storage_paths);
  }

  private blobForPath(path: string): Blob {
    if (path.endsWith(".mp4")) {
      return new Blob([MP4_BYTES], { type: "video/mp4" });
    }
    if (path.endsWith(".png")) {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return new Blob([bytes], { type: "image/png" });
    }
    return new Blob([JPEG_BYTES], { type: "image/jpeg" });
  }
}

class StalledInspectOutboundLineMediaStorage extends InMemoryOutboundLineMediaStorage {
  override async inspect(): Promise<never> {
    return new Promise<never>(() => undefined);
  }
}

class StalledExpiredCleanupOutboundLineMediaStorage extends InMemoryOutboundLineMediaStorage {
  override async removeExpiredUploads(): Promise<never> {
    return new Promise<never>(() => undefined);
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

function realLinePushBody(body: string, idempotencyKey: string) {
  return {
    body,
    delivery_mode: "real_line_push",
    real_line_push_confirmed: true,
    line_push_confirmation: REAL_LINE_PUSH_CONFIRMATION_VALUE,
    idempotency_key: idempotencyKey
  };
}

function createTestApp(input: {
  tenantId: string;
  tenantSlug: string;
  webhookSecret: string;
  customerRepository: InMemoryCustomerRepository;
  messageRepository: InMemoryMessageRepository;
  lineClient?: LineClient;
  outboundLineMediaStorage?: OutboundLineMediaStorage;
  operationsRepository?: InMemoryOperationsRepository;
  env?: Partial<NodeJS.ProcessEnv>;
}) {
  return createApiApp({
    customerRepository: input.customerRepository,
    messageRepository: input.messageRepository,
    ...(input.operationsRepository ? { operationsRepository: input.operationsRepository } : {}),
    ...(input.lineClient ? { lineClient: input.lineClient } : {}),
    ...(input.outboundLineMediaStorage
      ? { outboundLineMediaStorage: input.outboundLineMediaStorage }
      : {}),
    env: {
      LINE_CHANNEL_SECRET: channelSecret,
      LINE_WEBHOOK_SECRET_PATH: input.webhookSecret,
      TENANT_ID: input.tenantId,
      TENANT_SLUG: input.tenantSlug,
      ...input.env
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
        body: JSON.stringify(realLinePushBody("承知しました", "idem_no_line_user"))
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
        body: JSON.stringify(realLinePushBody("承知しました", "idem_no_line_user"))
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
        body: JSON.stringify(
          realLinePushBody("ご見学について担当者からご案内します", "idem_staff_reply_push")
        )
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

  it("rejects legacy multipart image replies before buffering or sending", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new MockLineClient();
    const outboundLineMediaStorage = new InMemoryOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient,
      outboundLineMediaStorage
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_image_reply",
        tenantId: "tenant_amamihome",
        lineUserId: "U_IMAGE_REPLY"
      })
    );
    const formData = new FormData();
    formData.set("body", "施工写真をお送りします");
    formData.set("delivery_mode", "real_line_push");
    formData.set("real_line_push_confirmed", "true");
    formData.set("line_push_confirmation", REAL_LINE_PUSH_CONFIRMATION_VALUE);
    formData.set("idempotency_key", "idem_staff_image_reply_001");
    formData.set("attachment", new File([JPEG_BYTES], "photo.jpg", {
      type: "image/jpeg"
    }));

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: {
          "x-tenant-id": "tenant_amamihome",
          "x-staff-id": "staff_001"
        },
        body: formData
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_reply_body" });
    expect(lineClient.pushes).toHaveLength(0);
    expect(outboundLineMediaStorage.stored).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("resolves a prepared image upload before pushing the staff reply", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new MockLineClient();
    const outboundLineMediaStorage = new InMemoryOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient,
      outboundLineMediaStorage
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_prepared_image_reply",
        tenantId: "tenant_amamihome",
        lineUserId: "U_PREPARED_IMAGE_REPLY"
      })
    );
    const prepareResponse = await app.fetch(
      new Request("http://localhost/api/admin/outbound-media/uploads/prepare", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome",
          "x-staff-id": "staff_001"
        },
        body: JSON.stringify({
          purpose: "staff_reply",
          media_type: "image",
          content_type: "image/jpeg",
          media_size: JPEG_BYTES.byteLength,
          preview_content_type: "image/jpeg",
          preview_size: JPEG_BYTES.byteLength
        })
      })
    );
    const prepared = (await prepareResponse.json()) as {
      media: Record<string, unknown>;
    };

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome",
          "x-staff-id": "staff_001"
        },
        body: JSON.stringify({
          ...realLinePushBody("施工写真をお送りします", "idem_prepared_image_reply_001"),
          media: prepared.media
        })
      })
    );

    expect(prepareResponse.status).toBe(200);
    expect(response.status).toBe(200);
    expect(lineClient.pushes).toEqual([
      {
        to: "U_PREPARED_IMAGE_REPLY",
        messages: [
          { type: "text", text: "施工写真をお送りします" },
          {
            type: "image",
            originalContentUrl: "https://media.example.invalid/original",
            previewImageUrl: "https://media.example.invalid/preview"
          }
        ]
      }
    ]);
    expect(outboundLineMediaStorage.prepared).toHaveLength(1);
    expect(outboundLineMediaStorage.finalized).toHaveLength(1);
    expect(outboundLineMediaStorage.expiredCleanupCalls).toHaveLength(1);
    expect(outboundLineMediaStorage.stored).toHaveLength(0);
    expect(outboundLineMediaStorage.removedUploads).toHaveLength(0);
  });

  it("continues preparing an upload when expired upload cleanup times out", async () => {
    const outboundLineMediaStorage = new StalledExpiredCleanupOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      outboundLineMediaStorage
    });

    vi.useFakeTimers();
    try {
      const responsePromise = app.fetch(
        new Request("http://localhost/api/admin/outbound-media/uploads/prepare", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-tenant-id": "tenant_amamihome",
            "x-staff-id": "staff_001"
          },
          body: JSON.stringify({
            purpose: "staff_reply",
            media_type: "image",
            content_type: "image/jpeg",
            media_size: JPEG_BYTES.byteLength,
            preview_content_type: "image/jpeg",
            preview_size: JPEG_BYTES.byteLength
          })
        })
      );

      await vi.advanceTimersByTimeAsync(15_000);
      const response = await responsePromise;

      expect(response.status).toBe(200);
      expect(outboundLineMediaStorage.prepared).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("discards a prepared image when the submitted size metadata is tampered", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new MockLineClient();
    const outboundLineMediaStorage = new InMemoryOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient,
      outboundLineMediaStorage
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_tampered_prepared_image_reply",
        tenantId: "tenant_amamihome",
        lineUserId: "U_TAMPERED_PREPARED_IMAGE_REPLY"
      })
    );
    const prepareResponse = await app.fetch(
      new Request("http://localhost/api/admin/outbound-media/uploads/prepare", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome",
          "x-staff-id": "staff_001"
        },
        body: JSON.stringify({
          purpose: "staff_reply",
          media_type: "image",
          content_type: "image/jpeg",
          media_size: JPEG_BYTES.byteLength,
          preview_content_type: "image/jpeg",
          preview_size: JPEG_BYTES.byteLength
        })
      })
    );
    const prepared = (await prepareResponse.json()) as {
      media: Record<string, unknown>;
    };

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome",
          "x-staff-id": "staff_001"
        },
        body: JSON.stringify({
          ...realLinePushBody("", "idem_tampered_image_reply_001"),
          media: { ...prepared.media, media_size: JPEG_BYTES.byteLength + 1 }
        })
      })
    );

    expect(prepareResponse.status).toBe(200);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "outbound_media_storage_failed"
    });
    expect(lineClient.pushes).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
    expect(outboundLineMediaStorage.finalized).toHaveLength(0);
    expect(outboundLineMediaStorage.removedUploads).toHaveLength(1);
    expect(outboundLineMediaStorage.inspected).toHaveLength(2);
    expect(outboundLineMediaStorage.downloaded).toHaveLength(0);
  });

  it("stops before LINE push when prepared media inspection times out", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new MockLineClient();
    const outboundLineMediaStorage = new StalledInspectOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient,
      outboundLineMediaStorage
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_stalled_prepared_image_reply",
        tenantId: "tenant_amamihome",
        lineUserId: "U_STALLED_PREPARED_IMAGE_REPLY"
      })
    );
    const prepareResponse = await app.fetch(
      new Request("http://localhost/api/admin/outbound-media/uploads/prepare", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome",
          "x-staff-id": "staff_001"
        },
        body: JSON.stringify({
          purpose: "staff_reply",
          media_type: "image",
          content_type: "image/jpeg",
          media_size: JPEG_BYTES.byteLength,
          preview_content_type: "image/jpeg",
          preview_size: JPEG_BYTES.byteLength
        })
      })
    );
    const prepared = (await prepareResponse.json()) as {
      media: Record<string, unknown>;
    };

    vi.useFakeTimers();
    try {
      const responsePromise = app.fetch(
        new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-tenant-id": "tenant_amamihome",
            "x-staff-id": "staff_001"
          },
          body: JSON.stringify({
            ...realLinePushBody("施工写真をお送りします", "idem_stalled_image_reply_001"),
            media: prepared.media
          })
        })
      );

      await vi.advanceTimersByTimeAsync(15_000);
      const response = await responsePromise;

      expect(prepareResponse.status).toBe(200);
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "outbound_media_storage_failed"
      });
      expect(lineClient.pushes).toHaveLength(0);
      expect(messageRepository.list()).toHaveLength(0);
      expect(outboundLineMediaStorage.finalized).toHaveLength(0);
      expect(outboundLineMediaStorage.removedUploads).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not block another tenant when prepared media inspection stalls", async () => {
    const stalledCustomerRepository = new InMemoryCustomerRepository();
    const stalledMessageRepository = new InMemoryMessageRepository();
    const stalledLineClient = new MockLineClient();
    const stalledStorage = new StalledInspectOutboundLineMediaStorage();
    const stalledApp = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository: stalledCustomerRepository,
      messageRepository: stalledMessageRepository,
      lineClient: stalledLineClient,
      outboundLineMediaStorage: stalledStorage
    });
    const stalledCustomer = await stalledCustomerRepository.save(
      makeCustomer({
        id: "customer_stalled_tenant_reply",
        tenantId: "tenant_amamihome",
        lineUserId: "U_STALLED_TENANT_REPLY"
      })
    );

    const healthyCustomerRepository = new InMemoryCustomerRepository();
    const healthyMessageRepository = new InMemoryMessageRepository();
    const healthyLineClient = new MockLineClient();
    const healthyStorage = new InMemoryOutboundLineMediaStorage();
    const healthyApp = createTestApp({
      tenantId: "tenant_other",
      tenantSlug: "other",
      webhookSecret: "wh_dev_other",
      customerRepository: healthyCustomerRepository,
      messageRepository: healthyMessageRepository,
      lineClient: healthyLineClient,
      outboundLineMediaStorage: healthyStorage
    });
    const healthyCustomer = await healthyCustomerRepository.save(
      makeCustomer({
        id: "customer_healthy_tenant_reply",
        tenantId: "tenant_other",
        lineUserId: "U_HEALTHY_TENANT_REPLY"
      })
    );

    const [stalledPrepareResponse, healthyPrepareResponse] = await Promise.all([
      stalledApp.fetch(
        new Request("http://localhost/api/admin/outbound-media/uploads/prepare", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-tenant-id": "tenant_amamihome",
            "x-staff-id": "staff_001"
          },
          body: JSON.stringify({
            purpose: "staff_reply",
            media_type: "image",
            content_type: "image/jpeg",
            media_size: JPEG_BYTES.byteLength,
            preview_content_type: "image/jpeg",
            preview_size: JPEG_BYTES.byteLength
          })
        })
      ),
      healthyApp.fetch(
        new Request("http://localhost/api/admin/outbound-media/uploads/prepare", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-tenant-id": "tenant_other",
            "x-staff-id": "staff_002"
          },
          body: JSON.stringify({
            purpose: "staff_reply",
            media_type: "image",
            content_type: "image/jpeg",
            media_size: JPEG_BYTES.byteLength,
            preview_content_type: "image/jpeg",
            preview_size: JPEG_BYTES.byteLength
          })
        })
      )
    ]);
    const stalledPrepared = (await stalledPrepareResponse.json()) as {
      media: Record<string, unknown>;
    };
    const healthyPrepared = (await healthyPrepareResponse.json()) as {
      media: Record<string, unknown>;
    };

    vi.useFakeTimers();
    try {
      const stalledResponsePromise = stalledApp.fetch(
        new Request(
          `http://localhost/api/admin/customers/${stalledCustomer.id}/reply`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-tenant-id": "tenant_amamihome",
              "x-staff-id": "staff_001"
            },
            body: JSON.stringify({
              ...realLinePushBody("施工写真をお送りします", "idem_stalled_tenant_reply_001"),
              media: stalledPrepared.media
            })
          }
        )
      );
      const healthyResponsePromise = healthyApp.fetch(
        new Request(
          `http://localhost/api/admin/customers/${healthyCustomer.id}/reply`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-tenant-id": "tenant_other",
              "x-staff-id": "staff_002"
            },
            body: JSON.stringify({
              ...realLinePushBody("完成写真をお送りします", "idem_healthy_tenant_reply_001"),
              media: healthyPrepared.media
            })
          }
        )
      );

      let healthyResponse: Response | undefined;
      void healthyResponsePromise.then((response) => {
        healthyResponse = response;
      });
      await vi.advanceTimersByTimeAsync(1);

      expect(stalledPrepareResponse.status).toBe(200);
      expect(healthyPrepareResponse.status).toBe(200);
      expect(healthyResponse?.status).toBe(200);
      expect(healthyLineClient.pushes).toHaveLength(1);
      expect(healthyMessageRepository.list()).toHaveLength(2);
      expect(healthyStorage.finalized).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(14_999);
      const stalledResponse = await stalledResponsePromise;

      expect(stalledResponse.status).toBe(503);
      expect(stalledLineClient.pushes).toHaveLength(0);
      expect(stalledMessageRepository.list()).toHaveLength(0);
      expect(stalledStorage.removedUploads).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects legacy multipart video replies before buffering or sending", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new MockLineClient();
    const outboundLineMediaStorage = new InMemoryOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient,
      outboundLineMediaStorage
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_video_reply",
        tenantId: "tenant_amamihome",
        lineUserId: "U_VIDEO_REPLY"
      })
    );
    const formData = new FormData();
    formData.set("body", "");
    formData.set("delivery_mode", "real_line_push");
    formData.set("real_line_push_confirmed", "true");
    formData.set("line_push_confirmation", REAL_LINE_PUSH_CONFIRMATION_VALUE);
    formData.set("idempotency_key", "idem_staff_video_reply_001");
    formData.set("attachment", new File([MP4_BYTES], "movie.mp4", {
      type: "video/mp4"
    }));
    formData.set("preview", new File([JPEG_BYTES], "preview.jpg", {
      type: "image/jpeg"
    }));

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: formData
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_reply_body" });
    expect(lineClient.pushes).toHaveLength(0);
    expect(outboundLineMediaStorage.stored).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
    expect(outboundLineMediaStorage.removed).toHaveLength(0);
  });

  it("rejects an uploaded file whose bytes do not match its declared media type", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new MockLineClient();
    const outboundLineMediaStorage = new InMemoryOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient,
      outboundLineMediaStorage
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_spoofed_media",
        tenantId: "tenant_amamihome",
        lineUserId: "U_SPOOFED_MEDIA"
      })
    );
    const formData = new FormData();
    formData.set("body", "");
    formData.set("delivery_mode", "real_line_push");
    formData.set("real_line_push_confirmed", "true");
    formData.set("line_push_confirmation", REAL_LINE_PUSH_CONFIRMATION_VALUE);
    formData.set("idempotency_key", "idem_staff_spoofed_media_001");
    formData.set(
      "attachment",
      new File([new Uint8Array([1, 2, 3])], "not-really-an-image.jpg", {
        type: "image/jpeg"
      })
    );

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: formData
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_reply_body" });
    expect(lineClient.pushes).toHaveLength(0);
    expect(outboundLineMediaStorage.stored).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("rejects an image larger than the LINE preview limit without a separate preview", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const lineClient = new MockLineClient();
    const outboundLineMediaStorage = new InMemoryOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient,
      outboundLineMediaStorage
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_image_without_preview",
        tenantId: "tenant_amamihome",
        lineUserId: "U_IMAGE_WITHOUT_PREVIEW"
      })
    );
    const oversizedPreviewImage = new Uint8Array(1024 * 1024 + 1);
    oversizedPreviewImage.set(JPEG_BYTES);
    const formData = new FormData();
    formData.set("body", "");
    formData.set("delivery_mode", "real_line_push");
    formData.set("real_line_push_confirmed", "true");
    formData.set("line_push_confirmation", REAL_LINE_PUSH_CONFIRMATION_VALUE);
    formData.set("idempotency_key", "idem_staff_image_no_preview_001");
    formData.set(
      "attachment",
      new File([oversizedPreviewImage], "large-photo.jpg", { type: "image/jpeg" })
    );

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: formData
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_reply_body" });
    expect(lineClient.pushes).toHaveLength(0);
    expect(outboundLineMediaStorage.stored).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("saves text-only drafts as internal notes without changing the LINE timeline", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const operationsRepository = new InMemoryOperationsRepository();
    const lineClient = new MockLineClient();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      operationsRepository,
      lineClient
    });
    await customerRepository.save(
      makeCustomer({
        id: "customer_demo_save",
        tenantId: "tenant_amamihome",
        lineUserId: "U_TEST_USER_001"
      })
    );

    const response = await app.fetch(
      new Request("http://localhost/api/admin/customers/customer_demo_save/reply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome"
        },
        body: JSON.stringify({
          body: "社内確認用のメモです。",
          delivery_mode: "demo_save"
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      customer_id: "customer_demo_save",
      delivery_status: "saved_as_internal_note",
      history_recorded: false,
      customer_updated: false,
      internal_note: {
        tenant_id: "tenant_amamihome",
        customer_id: "customer_demo_save",
        body: "社内確認用のメモです。"
      }
    });
    expect(lineClient.pushes).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
    expect(
      await operationsRepository.listInternalNotes("tenant_amamihome", "customer_demo_save")
    ).toEqual([expect.objectContaining({ body: "社内確認用のメモです。" })]);
    expect(customerRepository.list()[0]).toMatchObject({
      response_mode: "bot_auto",
      last_staff_reply_at: null
    });
  });

  it("rejects media for internal-note saves before storing it", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const outboundLineMediaStorage = new InMemoryOutboundLineMediaStorage();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      outboundLineMediaStorage
    });
    await customerRepository.save(makeCustomer({
      id: "customer_demo_media",
      tenantId: "tenant_amamihome",
      lineUserId: "U_DEMO_MEDIA"
    }));
    const formData = new FormData();
    formData.set("body", "社内メモ");
    formData.set("delivery_mode", "demo_save");
    formData.set("attachment", new File([JPEG_BYTES], "photo.jpg", { type: "image/jpeg" }));

    const response = await app.fetch(new Request(
      "http://localhost/api/admin/customers/customer_demo_media/reply",
      { method: "POST", headers: { "x-tenant-id": "tenant_amamihome" }, body: formData }
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_reply_body" });
    expect(outboundLineMediaStorage.stored).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("reports an audit failure without inviting a duplicate internal-note save", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const operationsRepository = new FailingAuditOperationsRepository();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      operationsRepository
    });
    await customerRepository.save(makeCustomer({
      id: "customer_demo_audit_failure",
      tenantId: "tenant_amamihome",
      lineUserId: "U_DEMO_AUDIT_FAILURE"
    }));

    const response = await app.fetch(new Request(
      "http://localhost/api/admin/customers/customer_demo_audit_failure/reply",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": "tenant_amamihome"
        },
        body: JSON.stringify({ body: "監査失敗時も一度だけ保存", delivery_mode: "demo_save" })
      }
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      delivery_status: "saved_as_internal_note_audit_failed",
      audit_recorded: false,
      retry_allowed: false,
      internal_note: { body: "監査失敗時も一度だけ保存" }
    });
    expect(
      await operationsRepository.listInternalNotes(
        "tenant_amamihome",
        "customer_demo_audit_failure"
      )
    ).toHaveLength(1);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("ignores the development staff id in production staff reply metadata", () => {
    expect(
      readStaffReplyStaffUserId({
        env: {
          APP_ENV: "production"
        },
        staffUserIdHeader: "dev_staff"
      })
    ).toBeNull();
    expect(
      readStaffReplyStaffUserId({
        env: {
          APP_ENV: "local"
        },
        staffUserIdHeader: "dev_staff"
      })
    ).toBe("dev_staff");
    expect(
      readStaffReplyStaffUserId({
        env: {
          APP_ENV: "production"
        },
        staffUserIdHeader: "staff_001"
      })
    ).toBe("staff_001");
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
    const messagesBeforeStaffReply = messageRepository.list();

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify(realLinePushBody("送信失敗テスト", "idem_staff_reply_failure"))
      })
    );
    const updatedCustomer = await customerRepository.findByIdForTenant(
      "tenant_amamihome",
      customer.id
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "line_send_failed" });
    expect(lineClient.pushes).toHaveLength(1);
    expect(messageRepository.list()).toHaveLength(messagesBeforeStaffReply.length);
    expect(messageRepository.list()).not.toContainEqual(
      expect.objectContaining({ role: "staff", body: "送信失敗テスト" })
    );
    expect(updatedCustomer).toMatchObject({
      response_mode: "bot_auto",
      last_staff_reply_at: null
    });
  });

  it("does not send LINE when staff history cannot be prepared", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new FailingPrepareMessageRepository();
    const lineClient = new MockLineClient();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_prepare_failure",
        tenantId: "tenant_amamihome",
        lineUserId: "U_PREPARE_FAILURE"
      })
    );

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify(
          realLinePushBody("履歴準備失敗テスト", "idem_staff_history_prepare_failure")
        )
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "reply_history_prepare_failed" });
    expect(lineClient.pushes).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("removes pending history and does not send LINE when the prepare acknowledgement is lost", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new LostPrepareAcknowledgementMessageRepository();
    const lineClient = new MockLineClient();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_prepare_ack_lost",
        tenantId: "tenant_amamihome",
        lineUserId: "U_PREPARE_ACK_LOST"
      })
    );

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify(
          realLinePushBody("履歴準備応答欠落テスト", "idem_staff_history_prepare_ack_lost")
        )
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "reply_history_prepare_failed" });
    expect(lineClient.pushes).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("removes pending history and does not send LINE when history preparation is incomplete", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new IncompletePrepareMessageRepository();
    const lineClient = new MockLineClient();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_prepare_incomplete",
        tenantId: "tenant_amamihome",
        lineUserId: "U_PREPARE_INCOMPLETE"
      })
    );

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify(
          realLinePushBody("履歴準備不完全テスト", "idem_staff_history_prepare_incomplete")
        )
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "reply_history_prepare_failed" });
    expect(lineClient.pushes).toHaveLength(0);
    expect(messageRepository.list()).toHaveLength(0);
  });

  it("reports a sent reply without permitting retry when history finalization fails", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new FailingFinalizeMessageRepository();
    const lineClient = new MockLineClient();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_finalize_failure",
        tenantId: "tenant_amamihome",
        lineUserId: "U_FINALIZE_FAILURE"
      })
    );

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify(
          realLinePushBody("履歴確定失敗テスト", "idem_staff_history_finalize_failure")
        )
      })
    );
    const responseBody = await response.json();
    const timelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(200);
    expect(responseBody).toMatchObject({
      ok: true,
      delivery_status: "sent_history_finalize_failed",
      history_recorded: false,
      retry_allowed: false
    });
    expect(lineClient.pushes).toEqual([
      {
        to: "U_FINALIZE_FAILURE",
        messages: [{ type: "text", text: "履歴確定失敗テスト" }]
      }
    ]);
    expect(messageRepository.list()).toEqual([
      expect.objectContaining({
        role: "staff",
        body: "履歴確定失敗テスト",
        sent_to_line_at: null
      })
    ]);
    expect(timelineResponse.status).toBe(200);
    expect(await timelineResponse.json()).toMatchObject({ messages: [] });
  });

  it("reconciles a sent reply when only the history finalization acknowledgement is lost", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new LostFinalizeAcknowledgementMessageRepository();
    const lineClient = new MockLineClient();
    const app = createTestApp({
      tenantId: "tenant_amamihome",
      tenantSlug: "amamihome",
      webhookSecret: "wh_dev_amamihome",
      customerRepository,
      messageRepository,
      lineClient
    });
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_finalize_ack_lost",
        tenantId: "tenant_amamihome",
        lineUserId: "U_FINALIZE_ACK_LOST"
      })
    );

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify(
          realLinePushBody("履歴確定照合テスト", "idem_staff_history_finalize_ack_lost")
        )
      })
    );
    const responseBody = await response.json();
    const timelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(200);
    expect(responseBody).toMatchObject({
      ok: true,
      delivery_status: "sent_and_recorded",
      history_recorded: true,
      retry_allowed: false
    });
    expect(lineClient.pushes).toEqual([
      {
        to: "U_FINALIZE_ACK_LOST",
        messages: [{ type: "text", text: "履歴確定照合テスト" }]
      }
    ]);
    expect(timelineResponse.status).toBe(200);
    expect(await timelineResponse.json()).toMatchObject({
      messages: [expect.objectContaining({ body: "履歴確定照合テスト" })]
    });
  });

  it("keeps a sent reply final and forbids retry when only the customer projection fails", async () => {
    const customerRepository = new FailingCustomerSaveRepository();
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
    const customer = await customerRepository.save(
      makeCustomer({
        id: "customer_projection_failure",
        tenantId: "tenant_amamihome",
        lineUserId: "U_PROJECTION_FAILURE"
      })
    );
    customerRepository.failSaves = true;

    const response = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/reply`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" },
        body: JSON.stringify(
          realLinePushBody("顧客更新失敗テスト", "idem_staff_customer_projection_failure")
        )
      })
    );
    const responseBody = await response.json();
    const timelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(200);
    expect(responseBody).toMatchObject({
      ok: true,
      delivery_status: "sent_and_recorded_customer_sync_failed",
      history_recorded: true,
      customer_updated: false,
      retry_allowed: false
    });
    expect(lineClient.pushes).toEqual([
      {
        to: "U_PROJECTION_FAILURE",
        messages: [{ type: "text", text: "顧客更新失敗テスト" }]
      }
    ]);
    expect(messageRepository.list()).toEqual([
      expect.objectContaining({
        role: "staff",
        body: "顧客更新失敗テスト",
        sent_to_line_at: expect.any(String)
      })
    ]);
    expect(timelineResponse.status).toBe(200);
    expect(await timelineResponse.json()).toMatchObject({
      messages: [expect.objectContaining({ body: "顧客更新失敗テスト" })]
    });
  });
});
