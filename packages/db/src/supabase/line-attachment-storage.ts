import type { SupabaseClient } from "@supabase/supabase-js";
import type { LineAttachmentStorage } from "@amami-line-crm/domain";

export const lineAttachmentStorageBucket = "line-message-attachments";

export type SupabaseStorageClient = Pick<SupabaseClient, "storage">;

export class SupabaseLineAttachmentStorage implements LineAttachmentStorage {
  constructor(
    private readonly client: SupabaseStorageClient,
    private readonly bucket = lineAttachmentStorageBucket
  ) {}

  async store(input: Parameters<LineAttachmentStorage["store"]>[0]): Promise<{
    media_storage_path: string;
  }> {
    const objectPath = buildLineAttachmentObjectPath(input);
    const result = await this.client.storage.from(this.bucket).upload(objectPath, input.data, {
      contentType: input.content_type ?? "application/octet-stream",
      upsert: true
    });

    if (result.error || !result.data?.path) {
      throw new Error("Private LINE attachment storage failed.");
    }

    return { media_storage_path: result.data.path };
  }

  async download(input: Parameters<LineAttachmentStorage["download"]>[0]): Promise<{
    data: Uint8Array;
    content_type: string | null;
  }> {
    assertLineAttachmentObjectPath(input);

    const result = await this.client.storage.from(this.bucket).download(input.media_storage_path);

    if (result.error || !result.data) {
      throw new Error("Private LINE attachment download failed.");
    }

    return {
      data: new Uint8Array(await result.data.arrayBuffer()),
      content_type: result.data.type || null
    };
  }
}

function buildLineAttachmentObjectPath(
  input: Parameters<LineAttachmentStorage["store"]>[0]
): string {
  const tenantId = sanitizePathSegment(input.tenant_id);
  const customerId = sanitizePathSegment(input.customer_id);
  const messageId = sanitizePathSegment(input.line_message_id);
  const extension = resolveAttachmentExtension(input.content_type);

  return `${tenantId}/${customerId}/${messageId}.${extension}`;
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_-]/gu, "_");

  if (!sanitized) {
    throw new Error("Private LINE attachment path is invalid.");
  }

  return sanitized;
}

function assertLineAttachmentObjectPath(
  input: Parameters<LineAttachmentStorage["download"]>[0]
): void {
  const tenantId = sanitizePathSegment(input.tenant_id);
  const customerId = sanitizePathSegment(input.customer_id);
  const expectedPrefix = `${tenantId}/${customerId}/`;
  const objectName = input.media_storage_path.slice(expectedPrefix.length);

  if (
    !input.media_storage_path.startsWith(expectedPrefix) ||
    !/^[A-Za-z0-9_-]+\.(?:jpg|png|gif|webp|mp4|m4a|mp3|wav|pdf|txt|bin)$/u.test(objectName)
  ) {
    throw new Error("Private LINE attachment path is outside the customer scope.");
  }
}

function resolveAttachmentExtension(contentType: string | null): string {
  switch (contentType?.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "audio/mp4":
      return "m4a";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "application/pdf":
      return "pdf";
    case "text/plain":
      return "txt";
    default:
      return "bin";
  }
}
