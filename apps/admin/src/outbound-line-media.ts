import type {
  AdminOutboundMediaPurpose,
  AdminOutboundMediaReference
} from "./admin-api";

export const MAX_OUTBOUND_LINE_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_OUTBOUND_LINE_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_OUTBOUND_LINE_PREVIEW_BYTES = 1024 * 1024;

export type OutboundLineMediaKind = "image" | "video";

export type OutboundLineMediaValidation =
  | { ok: true; kind: OutboundLineMediaKind }
  | { ok: false; message: string };

export function validateOutboundLineMedia(input: {
  size: number;
  type: string;
}): OutboundLineMediaValidation {
  const contentType = input.type.toLowerCase();

  if (contentType === "image/jpeg" || contentType === "image/png") {
    return input.size > 0 && input.size <= MAX_OUTBOUND_LINE_IMAGE_BYTES
      ? { ok: true, kind: "image" }
      : { ok: false, message: "画像は10MB以内のJPEGまたはPNGを選んでください。" };
  }

  if (contentType === "video/mp4") {
    return input.size > 0 && input.size <= MAX_OUTBOUND_LINE_VIDEO_BYTES
      ? { ok: true, kind: "video" }
      : { ok: false, message: "動画は50MB以内のMP4を選んでください。" };
  }

  return {
    ok: false,
    message: "送信できるファイルはJPEG、PNG、MP4です。"
  };
}

export function validateOutboundLineVideoPreview(input: {
  size: number;
  type: string;
}): string | null {
  return input.type.toLowerCase() === "image/jpeg" &&
    input.size > 0 &&
    input.size <= MAX_OUTBOUND_LINE_PREVIEW_BYTES
    ? null
    : "動画のプレビュー画像を準備できませんでした。別のMP4を選んでください。";
}

export function formatMediaFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))}KB`;
}

export function parseOutboundLineMediaReference(
  value: FormDataEntryValue | null,
  expectedPurpose: AdminOutboundMediaPurpose
): AdminOutboundMediaReference | null {
  if (typeof value !== "string" || !value.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const media = parsed as Record<string, unknown>;
  const mediaType = media.media_type;
  const contentType = media.content_type;
  const previewContentType = media.preview_content_type;
  const mediaSize = media.media_size;
  const previewSize = media.preview_size;

  if (
    media.purpose !== expectedPurpose ||
    typeof media.media_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      media.media_id
    ) ||
    (mediaType !== "image" && mediaType !== "video") ||
    !isCompatibleMediaType(mediaType, contentType) ||
    (previewContentType !== "image/jpeg" && previewContentType !== "image/png") ||
    (mediaType === "video" && previewContentType !== "image/jpeg") ||
    !Number.isInteger(mediaSize) ||
    (mediaSize as number) <= 0 ||
    (mediaSize as number) >
      (mediaType === "video"
        ? MAX_OUTBOUND_LINE_VIDEO_BYTES
        : MAX_OUTBOUND_LINE_IMAGE_BYTES) ||
    !Number.isInteger(previewSize) ||
    (previewSize as number) <= 0 ||
    (previewSize as number) > MAX_OUTBOUND_LINE_PREVIEW_BYTES
  ) {
    return null;
  }

  return {
    purpose: expectedPurpose,
    media_id: media.media_id,
    media_type: mediaType,
    content_type: contentType,
    media_size: mediaSize as number,
    preview_content_type: previewContentType,
    preview_size: previewSize as number
  };
}

function isCompatibleMediaType(
  mediaType: unknown,
  contentType: unknown
): contentType is AdminOutboundMediaReference["content_type"] {
  return mediaType === "video"
    ? contentType === "video/mp4"
    : mediaType === "image" &&
        (contentType === "image/jpeg" || contentType === "image/png");
}
