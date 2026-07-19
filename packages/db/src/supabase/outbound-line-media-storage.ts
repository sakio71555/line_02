import type {
  OutboundLineMediaContentType,
  OutboundLineMediaStorage,
  OutboundLinePreviewContentType
} from "@amami-line-crm/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

import { lineAttachmentStorageBucket } from "./line-attachment-storage";

const outboundSignedUrlTtlSeconds = 60 * 60;
const outboundStorageCleanupAttemptLimit = 3;

export class SupabaseOutboundLineMediaStorage implements OutboundLineMediaStorage {
  constructor(
    private readonly client: Pick<SupabaseClient, "storage">,
    private readonly bucket = lineAttachmentStorageBucket
  ) {}

  async prepareUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["prepareUpload"]>>[0]
  ): Promise<Awaited<ReturnType<NonNullable<OutboundLineMediaStorage["prepareUpload"]>>>> {
    const paths = buildPreparedOutboundLineMediaPaths(input);
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
    return buildPreparedOutboundLineMediaPaths(input);
  }

  async finalizeUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["finalizeUpload"]>>[0]
  ): Promise<Awaited<ReturnType<NonNullable<OutboundLineMediaStorage["finalizeUpload"]>>>> {
    const preparedPaths = buildPreparedOutboundLineMediaPaths(input);
    const durablePaths = buildOutboundLineMediaPaths(input);
    const bucket = this.client.storage.from(this.bucket);
    const originalMove = await bucket.move(
      preparedPaths.media_storage_path,
      durablePaths.media_storage_path
    );

    if (originalMove.error) {
      throw new Error("Outbound LINE media finalization failed.");
    }

    const previewMove = await bucket.move(
      preparedPaths.preview_storage_path,
      durablePaths.preview_storage_path
    );
    if (previewMove.error) {
      await removeStorageObjectsWithRetry(
        (paths) => bucket.remove(paths),
        [
          durablePaths.media_storage_path,
          preparedPaths.media_storage_path,
          preparedPaths.preview_storage_path
        ],
        "Outbound LINE media cleanup failed after preview finalization failure."
      );
      throw new Error("Outbound LINE media preview finalization failed.");
    }

    try {
      const urls = await createDeliveryUrls(this.client, this.bucket, durablePaths);
      return { ...durablePaths, ...urls };
    } catch {
      await removeStorageObjectsWithRetry(
        (paths) => bucket.remove(paths),
        [durablePaths.media_storage_path, durablePaths.preview_storage_path],
        "Outbound LINE media cleanup failed after URL creation failure."
      );
      throw new Error("Outbound LINE media URL creation failed.");
    }
  }

  async removeUpload(
    input: Parameters<NonNullable<OutboundLineMediaStorage["removeUpload"]>>[0]
  ): Promise<void> {
    const paths = buildPreparedOutboundLineMediaPaths(input);
    await this.remove({
      tenant_id: input.tenant_id,
      media_storage_paths: [paths.media_storage_path, paths.preview_storage_path]
    });
  }

  async removeExpiredUploads(
    input: Parameters<NonNullable<OutboundLineMediaStorage["removeExpiredUploads"]>>[0]
  ): Promise<number> {
    const tenantId = sanitizePathSegment(input.tenant_id);
    const expiresBefore = new Date(input.expires_before);
    if (Number.isNaN(expiresBefore.getTime())) {
      throw new Error("Outbound LINE media expiry is invalid.");
    }

    const limit = Math.max(1, Math.min(Math.trunc(input.limit), 100));
    const prefix = `${tenantId}/outbound-prepared`;
    const bucket = this.client.storage.from(this.bucket);
    const listed = await bucket.list(prefix, {
      limit,
      offset: 0,
      sortBy: { column: "created_at", order: "asc" }
    });
    if (listed.error) {
      throw new Error("Outbound LINE media expiry scan failed.");
    }

    const expiredPaths = (listed.data ?? [])
      .filter((entry) => isPreparedOutboundLineMediaObjectName(entry.name))
      .filter((entry) => {
        const createdAt = entry.created_at ? new Date(entry.created_at) : null;
        return createdAt && !Number.isNaN(createdAt.getTime()) && createdAt < expiresBefore;
      })
      .map((entry) => `${prefix}/${entry.name}`);

    if (expiredPaths.length === 0) {
      return 0;
    }

    const removed = await bucket.remove(expiredPaths);
    if (removed.error) {
      throw new Error("Outbound LINE media expiry cleanup failed.");
    }

    return expiredPaths.length;
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
      await removeStorageObjectsWithRetry(
        (storagePaths) => bucket.remove(storagePaths),
        [paths.media_storage_path],
        "Outbound LINE media cleanup failed after preview storage failure."
      );
      throw new Error("Outbound LINE media preview storage failed.");
    }

    let urls: Awaited<ReturnType<typeof createDeliveryUrls>>;
    try {
      urls = await createDeliveryUrls(this.client, this.bucket, paths);
    } catch {
      await removeStorageObjectsWithRetry(
        (storagePaths) => bucket.remove(storagePaths),
        [paths.media_storage_path, paths.preview_storage_path],
        "Outbound LINE media cleanup failed after URL creation failure."
      );
      throw new Error("Outbound LINE media URL creation failed.");
    }

    return {
      ...paths,
      ...urls
    };
  }

  async inspect(
    input: Parameters<OutboundLineMediaStorage["inspect"]>[0]
  ): Promise<Awaited<ReturnType<OutboundLineMediaStorage["inspect"]>>> {
    assertOutboundLineMediaPath(input.tenant_id, input.media_storage_path);
    const result = await this.client.storage.from(this.bucket).info(input.media_storage_path);

    if (
      result.error ||
      !result.data ||
      !Number.isSafeInteger(result.data.size) ||
      (result.data.size as number) < 0
    ) {
      throw new Error("Outbound LINE media inspection failed.");
    }

    return {
      size: result.data.size as number,
      content_type: result.data.contentType?.trim() || null
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

async function removeStorageObjectsWithRetry(
  remove: (paths: string[]) => Promise<{ error: unknown }>,
  paths: string[],
  failureMessage: string
): Promise<void> {
  for (let attempt = 1; attempt <= outboundStorageCleanupAttemptLimit; attempt += 1) {
    try {
      const result = await remove(paths);
      if (!result.error) {
        return;
      }
    } catch {
      // Retry the bounded compensating cleanup below.
    }
  }

  throw new Error(failureMessage);
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

function buildPreparedOutboundLineMediaPaths(input: {
  tenant_id: string;
  media_id: string;
  content_type: OutboundLineMediaContentType;
  preview_content_type: OutboundLinePreviewContentType;
}): { media_storage_path: string; preview_storage_path: string } {
  const tenantId = sanitizePathSegment(input.tenant_id);
  const mediaId = sanitizePathSegment(input.media_id);
  const mediaExtension = input.content_type === "image/png" ? "png" : input.content_type === "video/mp4" ? "mp4" : "jpg";
  const previewExtension = input.preview_content_type === "image/png" ? "png" : "jpg";
  const prefix = `${tenantId}/outbound-prepared`;

  return {
    media_storage_path: `${prefix}/${mediaId}-original.${mediaExtension}`,
    preview_storage_path: `${prefix}/${mediaId}-preview.${previewExtension}`
  };
}

function assertOutboundLineMediaPath(tenantIdValue: string, path: string): void {
  const tenantId = sanitizePathSegment(tenantIdValue);
  const durablePrefix = `${tenantId}/outbound/`;
  const preparedPrefix = `${tenantId}/outbound-prepared/`;
  const durableObjectName = path.slice(durablePrefix.length);
  const preparedObjectName = path.slice(preparedPrefix.length);
  const isDurable =
    path.startsWith(durablePrefix) &&
    /^[A-Za-z0-9_-]+\/(?:original\.(?:jpg|png|mp4)|preview\.(?:jpg|png))$/u.test(
      durableObjectName
    );
  const isPrepared =
    path.startsWith(preparedPrefix) &&
    isPreparedOutboundLineMediaObjectName(preparedObjectName);

  if (!isDurable && !isPrepared) {
    throw new Error("Outbound LINE media path is outside the tenant scope.");
  }
}

function isPreparedOutboundLineMediaObjectName(value: string): boolean {
  return /^[A-Za-z0-9_-]+-(?:original\.(?:jpg|png|mp4)|preview\.(?:jpg|png))$/u.test(value);
}

function sanitizePathSegment(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("Outbound LINE media path is invalid.");
  }

  return value;
}
