import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MAX_OUTBOUND_LINE_IMAGE_BYTES,
  MAX_OUTBOUND_LINE_PREVIEW_BYTES,
  MAX_OUTBOUND_LINE_VIDEO_BYTES,
  formatMediaFileSize,
  validateOutboundLineMedia,
  validateOutboundLineVideoPreview
} from "../../apps/admin/src/outbound-line-media";

describe("admin outbound LINE media validation", () => {
  it("accepts supported image and video files at their size limits", () => {
    expect(
      validateOutboundLineMedia({ size: MAX_OUTBOUND_LINE_IMAGE_BYTES, type: "image/jpeg" })
    ).toEqual({ ok: true, kind: "image" });
    expect(validateOutboundLineMedia({ size: 1024, type: "image/png" })).toEqual({
      ok: true,
      kind: "image"
    });
    expect(
      validateOutboundLineMedia({ size: MAX_OUTBOUND_LINE_VIDEO_BYTES, type: "video/mp4" })
    ).toEqual({ ok: true, kind: "video" });
  });

  it("rejects empty, oversized, and unsupported attachments", () => {
    expect(validateOutboundLineMedia({ size: 0, type: "image/jpeg" }).ok).toBe(false);
    expect(
      validateOutboundLineMedia({
        size: MAX_OUTBOUND_LINE_IMAGE_BYTES + 1,
        type: "image/png"
      }).ok
    ).toBe(false);
    expect(
      validateOutboundLineMedia({
        size: MAX_OUTBOUND_LINE_VIDEO_BYTES + 1,
        type: "video/mp4"
      }).ok
    ).toBe(false);
    expect(validateOutboundLineMedia({ size: 1024, type: "application/pdf" })).toEqual({
      ok: false,
      message: "送信できるファイルはJPEG、PNG、MP4です。"
    });
  });

  it("requires a non-empty JPEG video preview within the LINE size limit", () => {
    expect(
      validateOutboundLineVideoPreview({
        size: MAX_OUTBOUND_LINE_PREVIEW_BYTES,
        type: "image/jpeg"
      })
    ).toBeNull();
    expect(validateOutboundLineVideoPreview({ size: 0, type: "image/jpeg" })).not.toBeNull();
    expect(
      validateOutboundLineVideoPreview({ size: 1024, type: "image/png" })
    ).not.toBeNull();
    expect(
      validateOutboundLineVideoPreview({
        size: MAX_OUTBOUND_LINE_PREVIEW_BYTES + 1,
        type: "image/jpeg"
      })
    ).not.toBeNull();
  });

  it("formats selected file sizes for the operator", () => {
    expect(formatMediaFileSize(512)).toBe("1KB");
    expect(formatMediaFileSize(1536)).toBe("2KB");
    expect(formatMediaFileSize(1.5 * 1024 * 1024)).toBe("1.5MB");
    expect(formatMediaFileSize(12 * 1024 * 1024)).toBe("12MB");
  });

  it("prevents broadcast submission until media preparation is complete", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/admin/app/broadcast/broadcast-page-view.tsx"),
      "utf8"
    );

    expect(source).toContain("const [mediaPreparing, setMediaPreparing] = useState(false)");
    expect(source).toContain("onPreparingChange={setMediaPreparing}");
    expect(source).toContain("!mediaPreparing &&");
  });

  it("rejects ambiguous multi-file drops instead of silently sending the first file", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/admin/app/_components/media-dropzone.tsx"),
      "utf8"
    );

    expect(source).toContain("event.dataTransfer.files.length !== 1");
    expect(source).toContain("画像・動画は1回につき1ファイルだけ選択してください。");
    expect(source).toContain('role="alert"');
  });

  it("keeps the prepared media reference in form submission while the confirmation view is locked", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/admin/app/_components/media-dropzone.tsx"),
      "utf8"
    );

    expect(source).toContain('name="media_reference"');
    expect(source).toContain("JSON.stringify(currentMediaRef.current)");
    expect(source).toContain("uploadToSignedUrl(prepared.media_upload_url, file)");
    expect(source).toContain("uploadToSignedUrl(prepared.preview_upload_url, preview)");
    expect(source).toContain('disabled={disabled || locked || preparing}\n          onClick');
  });

  it("preloads video frames inline for reliable mobile preview generation", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/admin/app/_components/media-dropzone.tsx"),
      "utf8"
    );

    expect(source).toContain("video.playsInline = true");
    expect(source).toContain('video.preload = "auto"');
    expect(source).toContain("video.load()");
  });

  it("hands prepared media to each form submission without deleting it during navigation", () => {
    const dropzoneSource = readFileSync(
      join(process.cwd(), "apps/admin/app/_components/media-dropzone.tsx"),
      "utf8"
    );
    const customerReplySource = readFileSync(
      join(process.cwd(), "apps/admin/app/customers/[customerId]/customer-actions.tsx"),
      "utf8"
    );
    const broadcastSource = readFileSync(
      join(process.cwd(), "apps/admin/app/broadcast/broadcast-page-view.tsx"),
      "utf8"
    );

    expect(dropzoneSource).toContain("ownsPreparedMediaRef.current = false");
    expect(dropzoneSource).toContain("if (media && ownsPreparedMediaRef.current)");

    for (const source of [customerReplySource, broadcastSource]) {
      expect(source).toContain("onSubmitCapture={() => mediaDropzoneRef.current?.handoffPreparedMedia()}");
      expect(source).toContain("mediaDropzoneRef.current?.resumePreparedMediaOwnership()");
      expect(source).toContain("mediaDropzoneRef.current?.forgetPreparedMedia()");
    }
  });
});
