import type {
  OutboundLineMediaContentType,
  OutboundLineMediaStorage,
  OutboundLinePreviewContentType
} from "@amami-line-crm/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

import { lineAttachmentStorageBucket } from "./line-attachment-storage";

const outboundSignedUrlTtlSeconds = 60 * 60;

export class SupabaseOutboundLineMediaStorage implements OutboundLineMediaStorage {
  constructor(
    private readonly client: Pick<SupabaseClient, "storage">,
    private readonly bucket = lineAttachmentStorageBucket
  ) {}

  async prepareUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["prepareUpload"]>>[0]
  ): Promise<Awaited<ReturnType<NonNullable<OutboundLineMediaStorage["prepareUpload"]>>>> {
    const paths = buildOutboundLineMediaPaths(input);
    const bucket = this.client.storage.from(this.bucket);
    const [mediaUpload, previewUpload] = await Promise.all([
      bucket.createSignedUploadUrl(paths.media_storage_path),
      bucket.createSignedUploadUrl(paths.preview_storage_path)
    ]);

    if (
      mediaUpload.error ||
      !mediaUpload.data?.signedUrl ||
      previewUpload.error ||
      !previewUpload.data?.signedUrl
    ) {
      throw new Error("Outbound LINE media upload URL creation failed.");
    }

    return {
      media_upload_url: mediaUpload.data.signedUrl,
      preview_upload_url: previewUpload.data.signedUrl
    };
  }

  async resolveUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["resolveUpload"]>>[0]
  ): Promise<Awaited<ReturnType<NonNullable<OutboundLineMediaStorage["resolveUpload"]>>>> {
    const paths = buildOutboundLineMediaPaths(input);
    const urls = await createDeliveryUrls(this.client, this.bucket, paths);

    return { ...paths, ...urls };
  }

  async removeUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["removeUpload"]>>[0]
  ): Promise<void> {
    const paths = buildOutboundLineMediaPaths(input);
    await this.remove({
      tenant_id: input.tenant_id,
      media_storage_paths: [paths.media_storage_path, paths.preview_storage_path]
    });
  }

  async store(
    input: Parameters<OutboundLineMediaStorage["store"]>[0]
  ): Promise<Awaited<ReturnType<OutboundLineMediaStorage["store"]>>> {
    const paths = buildOutboundLineMediaPaths(input);
    const bucket = this.client.storage.from(this.bucket);
    const original = await bucket.upload(paths.media_storage_path, input.data, {
      contentType: input.content_type,
      upsert: false
    });

    if (original.error || !original.data?.path) {
      throw new Error("Outbound LINE media storage failed.");
    }

    const preview = await bucket.upload(paths.preview_storage_path, input.preview_data, {
      contentType: input.preview_content_type,
      upsert: false
    });

    if (preview.error || !preview.data?.path) {
      await bucket.remove([paths.media_storage_path]);
      throw new Error("Outbound LINE media preview storage failed.");
    }

    let urls: Awaited<ReturnType<typeof createDeliveryUrls>>;
    try {
      urls = await createDeliveryUrls(this.client, this.bucket, paths);
    } catch {
      await bucket.remove([paths.media_storage_path, paths.preview_storage_path]);
      throw new Error("Outbound LINE media URL creation failed.");
    }

    return {
      ...paths,
      ...urls
    };
  }

  async download(
    input: Parameters<OutboundLineMediaStorage["download"]>[0]
  ): Promise<Awaited<ReturnType<OutboundLineMediaStorage["download"]>>> {
    assertOutboundLineMediaPath(input.tenant_id, input.media_storage_path);
    const result = await this.client.storage.from(this.bucket).download(input.media_storage_path);

    if (result.error || !result.data) {
      throw new Error("Outbound LINE media download failed.");
    }

    return {
      data: result.data,
      content_type: result.data.type || null
    };
  }

  async remove(input: Parameters<OutboundLineMediaStorage["remove"]>[0]): Promise<void> {
    const paths = [...new Set(input.media_storage_paths)];
    for (const path of paths) {
      assertOutboundLineMediaPath(input.tenant_id, path);
    }

    if (paths.length === 0) {
      return;
    }

    const result = await this.client.storage.from(this.bucket).remove(paths);
    if (result.error) {
      throw new Error("Outbound LINE media cleanup failed.");
    }
  }
}

async function createDeliveryUrls(
  client: Pick<SupabaseClient, "storage">,
  bucketName: string,
  paths: { media_storage_path: string; preview_storage_path: string }
): Promise<{ original_content_url: string; preview_image_url: string }> {
  const bucket = client.storage.from(bucketName);
  const [originalUrl, previewUrl] = await Promise.all([
    bucket.createSignedUrl(paths.media_storage_path, outboundSignedUrlTtlSeconds),
    bucket.createSignedUrl(paths.preview_storage_path, outboundSignedUrlTtlSeconds)
  ]);

  if (
    originalUrl.error ||
    !originalUrl.data?.signedUrl ||
    previewUrl.error ||
    !previewUrl.data?.signedUrl
  ) {
    throw new Error("Outbound LINE media URL creation failed.");
  }

  return {
    original_content_url: originalUrl.data.signedUrl,
    preview_image_url: previewUrl.data.signedUrl
  };
}

function buildOutboundLineMediaPaths(input: {
  tenant_id: string;
  media_id: string;
  content_type: OutboundLineMediaContentType;
  preview_content_type: OutboundLinePreviewContentType;
}): { media_storage_path: string; preview_storage_path: string } {
  const tenantId = sanitizePathSegment(input.tenant_id);
  const mediaId = sanitizePathSegment(input.media_id);
  const mediaExtension = input.content_type === "image/png" ? "png" : input.content_type === "video/mp4" ? "mp4" : "jpg";
  const previewExtension = input.preview_content_type === "image/png" ? "png" : "jpg";
  const prefix = `${tenantId}/outbound/${mediaId}`;

  return {
    media_storage_path: `${prefix}/original.${mediaExtension}`,
    preview_storage_path: `${prefix}/preview.${previewExtension}`
  };
}

function assertOutboundLineMediaPath(tenantIdValue: string, path: string): void {
  const tenantId = sanitizePathSegment(tenantIdValue);
  const expectedPrefix = `${tenantId}/outbound/`;
  const objectName = path.slice(expectedPrefix.length);

  if (
    !path.startsWith(expectedPrefix) ||
    !/^[A-Za-z0-9_-]+\/(?:original\.(?:jpg|png|mp4)|preview\.(?:jpg|png))$/u.test(objectName)
  ) {
    throw new Error("Outbound LINE media path is outside the tenant scope.");
  }
}

function sanitizePathSegment(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("Outbound LINE media path is invalid.");
  }

  return value;
}
