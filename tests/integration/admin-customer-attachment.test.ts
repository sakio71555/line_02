import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  isPrivateLineAttachmentMessage,
  type Customer,
  type LineAttachmentStorage,
  type Message
} from "@amami-line-crm/domain";

const tenantId = "tenant_amamihome";

describe("admin customer attachment API", () => {
  it("returns a private attachment after tenant, customer, and message checks", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const customer = createCustomer("customer_1");
    const message = createAttachmentMessage({
      id: "message_1",
      customerId: customer.id,
      storagePath: `${tenantId}/${customer.id}/line_message_1.png`
    });
    const downloadInputs: Array<Parameters<LineAttachmentStorage["download"]>[0]> = [];
    const lineAttachmentStorage = createAttachmentStorage(async (input) => {
      downloadInputs.push(input);
      return {
        data: new Blob([new Uint8Array([10, 20, 30])], { type: "image/png" }),
        content_type: "image/png"
      };
    });

    await customerRepository.save(customer);
    await messageRepository.insert(message);

    const app = createApiApp({
      customerRepository,
      messageRepository,
      lineAttachmentStorage,
      env: createEnv()
    });
    const response = await app.fetch(
      new Request(
        `http://localhost/api/admin/customers/${customer.id}/messages/${message.id}/attachment`,
        { headers: { "x-tenant-id": tenantId } }
      )
    );

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([10, 20, 30]));
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toMatch(
      /^inline; filename="line-attachment-message_1\.png"$/u
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(downloadInputs).toEqual([
      {
        tenant_id: tenantId,
        customer_id: customer.id,
        media_storage_path: `${tenantId}/${customer.id}/line_message_1.png`
      }
    ]);

    const timelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, {
        headers: { "x-tenant-id": tenantId }
      })
    );
    const timelineBody = (await timelineResponse.json()) as {
      messages: Array<{ attachment_available: boolean; source_url: string | null }>;
    };

    expect(timelineBody.messages[0]).toMatchObject({
      attachment_available: true,
      source_url: null
    });
    expect(JSON.stringify(timelineBody)).not.toContain(message.media_storage_path);
  });

  it("does not download an attachment through another customer route", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const firstCustomer = createCustomer("customer_1");
    const secondCustomer = createCustomer("customer_2");
    const secondMessage = createAttachmentMessage({
      id: "message_2",
      customerId: secondCustomer.id,
      storagePath: `${tenantId}/${secondCustomer.id}/line_message_2.pdf`,
      messageType: "file"
    });
    let downloadCalls = 0;

    await customerRepository.save(firstCustomer);
    await customerRepository.save(secondCustomer);
    await messageRepository.insert(secondMessage);

    const app = createApiApp({
      customerRepository,
      messageRepository,
      lineAttachmentStorage: createAttachmentStorage(async () => {
        downloadCalls += 1;
        return {
          data: new Blob([new Uint8Array([1])], { type: "application/pdf" }),
          content_type: "application/pdf"
        };
      }),
      env: createEnv()
    });
    const response = await app.fetch(
      new Request(
        `http://localhost/api/admin/customers/${firstCustomer.id}/messages/${secondMessage.id}/attachment`,
        { headers: { "x-tenant-id": tenantId } }
      )
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "attachment_not_found" });
    expect(downloadCalls).toBe(0);
  });

  it("requires admin tenant authentication and configured private storage", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const customer = createCustomer("customer_1");
    const message = createAttachmentMessage({
      id: "message_1",
      customerId: customer.id,
      storagePath: `${tenantId}/${customer.id}/line_message_1.png`
    });

    await customerRepository.save(customer);
    await messageRepository.insert(message);

    const app = createApiApp({
      customerRepository,
      messageRepository,
      env: createEnv()
    });
    const path = `http://localhost/api/admin/customers/${customer.id}/messages/${message.id}/attachment`;
    const unauthenticatedResponse = await app.fetch(new Request(path));
    const unavailableResponse = await app.fetch(
      new Request(path, { headers: { "x-tenant-id": tenantId } })
    );

    expect(unauthenticatedResponse.status).toBe(401);
    expect(await unauthenticatedResponse.json()).toEqual({
      ok: false,
      error: "missing_tenant_id"
    });
    expect(unavailableResponse.status).toBe(503);
    expect(await unavailableResponse.json()).toEqual({
      ok: false,
      error: "attachment_storage_unavailable"
    });
  });

  it("keeps legacy external image URLs as references instead of private attachments", async () => {
    const customerRepository = new InMemoryCustomerRepository();
    const messageRepository = new InMemoryMessageRepository();
    const customer = createCustomer("customer_legacy");
    const externalUrl = "https://cdn.example.invalid/customer-image.png";
    const message = createAttachmentMessage({
      id: "message_external",
      customerId: customer.id,
      storagePath: externalUrl
    });
    let downloadCalls = 0;

    await customerRepository.save(customer);
    await messageRepository.insert(message);

    const app = createApiApp({
      customerRepository,
      messageRepository,
      lineAttachmentStorage: createAttachmentStorage(async () => {
        downloadCalls += 1;
        return {
          data: new Blob([new Uint8Array([1])], { type: "image/png" }),
          content_type: "image/png"
        };
      }),
      env: createEnv()
    });
    const headers = { "x-tenant-id": tenantId };
    const timelineResponse = await app.fetch(
      new Request(`http://localhost/api/admin/customers/${customer.id}/timeline`, { headers })
    );
    const timelineBody = (await timelineResponse.json()) as {
      messages: Array<{ attachment_available: boolean; source_url: string | null }>;
    };
    const attachmentResponse = await app.fetch(
      new Request(
        `http://localhost/api/admin/customers/${customer.id}/messages/${message.id}/attachment`,
        { headers }
      )
    );

    expect(timelineBody.messages[0]).toMatchObject({
      attachment_available: false,
      source_url: externalUrl
    });
    expect(attachmentResponse.status).toBe(404);
    expect(downloadCalls).toBe(0);
  });

  it("does not treat paths derived from malformed tenant or customer identifiers as private", async () => {
    const message = createAttachmentMessage({
      id: "message_malformed_scope",
      customerId: "customer/1",
      storagePath: "tenant_amamihome/customer_1/line_message.png"
    });
    message.tenant_id = "tenant/amamihome";

    expect(isPrivateLineAttachmentMessage(message)).toBe(false);
  });
});

function createAttachmentStorage(
  download: LineAttachmentStorage["download"]
): LineAttachmentStorage {
  return {
    async store() {
      throw new Error("Attachment upload is not used by this admin API test.");
    },
    download
  };
}

function createEnv(): NodeJS.ProcessEnv {
  return {
    TENANT_ID: tenantId,
    TENANT_SLUG: "amamihome"
  };
}

function createCustomer(id: string): Customer {
  return {
    id,
    tenant_id: tenantId,
    line_user_id: null,
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
    created_at: "2026-07-16T00:00:00.000Z",
    updated_at: "2026-07-16T00:00:00.000Z"
  };
}

function createAttachmentMessage(input: {
  id: string;
  customerId: string;
  storagePath: string;
  messageType?: "image" | "file";
}): Message {
  return {
    id: input.id,
    tenant_id: tenantId,
    customer_id: input.customerId,
    consultation_id: null,
    line_message_id: `line_${input.id}`,
    role: "customer",
    message_type: input.messageType ?? "image",
    body: input.messageType === "file" ? "ファイルを受信しました。" : "画像を受信しました。",
    media_storage_path: input.storagePath,
    staff_user_id: null,
    ai_generated: false,
    sent_to_line_at: null,
    created_at: "2026-07-16T00:00:00.000Z"
  };
}
