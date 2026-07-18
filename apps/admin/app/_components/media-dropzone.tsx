"use client";

import { Film, ImagePlus, X } from "lucide-react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";

import type {
  AdminOutboundMediaContentType,
  AdminOutboundMediaPreviewContentType,
  AdminOutboundMediaPurpose,
  AdminOutboundMediaReference
} from "../../src/admin-api";
import {
  MAX_OUTBOUND_LINE_PREVIEW_BYTES,
  formatMediaFileSize,
  validateOutboundLineMedia,
  type OutboundLineMediaKind
} from "../../src/outbound-line-media";
import {
  discardOutboundMediaUploadAction,
  prepareOutboundMediaUploadAction
} from "./outbound-media-actions";

export interface MediaSelection {
  fileName: string;
  kind: OutboundLineMediaKind;
  size: number;
}

export interface MediaDropzoneHandle {
  forgetPreparedMedia: () => void;
  handoffPreparedMedia: () => void;
  resumePreparedMediaOwnership: () => void;
}

export const MediaDropzone = forwardRef<MediaDropzoneHandle, {
  disabled?: boolean;
  locked?: boolean;
  onPreparingChange?: (preparing: boolean) => void;
  onSelectionChange?: (selection: MediaSelection | null) => void;
  purpose: AdminOutboundMediaPurpose;
  resetSignal?: number;
}>(function MediaDropzone({
  disabled = false,
  locked = false,
  onPreparingChange,
  onSelectionChange,
  purpose,
  resetSignal = 0
}, forwardedRef) {
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const currentMediaRef = useRef<AdminOutboundMediaReference | null>(null);
  const ownsPreparedMediaRef = useRef(true);
  const mountedRef = useRef(false);
  const selectionVersionRef = useRef(0);
  const onPreparingChangeRef = useRef(onPreparingChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const [selection, setSelection] = useState<MediaSelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    onPreparingChangeRef.current = onPreparingChange;
  }, [onPreparingChange]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      selectionVersionRef.current += 1;
      const media = currentMediaRef.current;
      currentMediaRef.current = null;
      if (media && ownsPreparedMediaRef.current) void discardPreparedMedia(media);
    };
  }, []);

  useImperativeHandle(forwardedRef, () => ({
    forgetPreparedMedia() {
      ownsPreparedMediaRef.current = false;
      currentMediaRef.current = null;
    },
    handoffPreparedMedia() {
      ownsPreparedMediaRef.current = false;
    },
    resumePreparedMediaOwnership() {
      if (currentMediaRef.current) ownsPreparedMediaRef.current = true;
    }
  }), []);

  const updatePreparing = useCallback((nextPreparing: boolean) => {
    setPreparing(nextPreparing);
    onPreparingChangeRef.current?.(nextPreparing);
  }, []);

  const clearSelection = useCallback((discard = true) => {
    selectionVersionRef.current += 1;
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    const media = currentMediaRef.current;
    currentMediaRef.current = null;
    ownsPreparedMediaRef.current = true;
    if (discard && media) void discardPreparedMedia(media);
    setSelection(null);
    setError(null);
    updatePreparing(false);
    setDragging(false);
    onSelectionChangeRef.current?.(null);
  }, [updatePreparing]);

  const rejectSelection = useCallback((message: string) => {
    selectionVersionRef.current += 1;
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    const media = currentMediaRef.current;
    currentMediaRef.current = null;
    ownsPreparedMediaRef.current = true;
    if (media) void discardPreparedMedia(media);
    setSelection(null);
    setError(message);
    updatePreparing(false);
    setDragging(false);
    onSelectionChangeRef.current?.(null);
  }, [updatePreparing]);

  useEffect(() => {
    if (resetSignal > 0) clearSelection(false);
  }, [clearSelection, resetSignal]);

  async function selectFile(file: File) {
    const selectionVersion = selectionVersionRef.current + 1;
    selectionVersionRef.current = selectionVersion;
    const previousMedia = currentMediaRef.current;
    currentMediaRef.current = null;
    ownsPreparedMediaRef.current = true;
    if (previousMedia) void discardPreparedMedia(previousMedia);
    const validation = validateOutboundLineMedia(file);
    if (!validation.ok) {
      rejectSelection(validation.message);
      return;
    }

    setError(null);
    updatePreparing(true);

    let preparedMedia: AdminOutboundMediaReference | null = null;
    try {
      const preview = validation.kind === "video"
        ? await createVideoPreview(file)
        : await createImagePreview(file);
      if (selectionVersionRef.current !== selectionVersion) return;

      const prepared = await prepareOutboundMediaUploadAction({
        purpose,
        media_type: validation.kind,
        content_type: file.type.toLowerCase() as AdminOutboundMediaContentType,
        media_size: file.size,
        preview_content_type: preview.type.toLowerCase() as AdminOutboundMediaPreviewContentType,
        preview_size: preview.size
      });
      preparedMedia = prepared.media;

      if (selectionVersionRef.current !== selectionVersion) {
        await discardPreparedMedia(preparedMedia);
        return;
      }

      await uploadToSignedUrl(prepared.media_upload_url, file);
      if (selectionVersionRef.current !== selectionVersion) {
        await discardPreparedMedia(preparedMedia);
        return;
      }
      await uploadToSignedUrl(prepared.preview_upload_url, preview);
      if (selectionVersionRef.current !== selectionVersion) {
        await discardPreparedMedia(preparedMedia);
        return;
      }

      const nextSelection = {
        fileName: file.name,
        kind: validation.kind,
        size: file.size
      } satisfies MediaSelection;
      currentMediaRef.current = preparedMedia;
      ownsPreparedMediaRef.current = true;
      setSelection(nextSelection);
      onSelectionChangeRef.current?.(nextSelection);
    } catch {
      if (preparedMedia) await discardPreparedMedia(preparedMedia);
      if (selectionVersionRef.current !== selectionVersion) return;
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      setSelection(null);
      onSelectionChangeRef.current?.(null);
      setError("画像・動画を準備できませんでした。時間をおいて選び直してください。");
    } finally {
      if (mountedRef.current && selectionVersionRef.current === selectionVersion) {
        updatePreparing(false);
      }
    }
  }

  return (
    <div className="media-upload-field">
      <span className="media-upload-label">画像・動画</span>
      <div
        aria-disabled={disabled || locked || preparing}
        className={`media-dropzone${selection ? " media-dropzone-selected" : ""}${dragging ? " media-dropzone-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !locked && !preparing) {
            event.dataTransfer.dropEffect = "copy";
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          const relatedTarget = event.relatedTarget;
          if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled || locked || preparing) return;
          if (event.dataTransfer.files.length !== 1) {
            rejectSelection("画像・動画は1回につき1ファイルだけ選択してください。");
            return;
          }
          const file = event.dataTransfer.files.item(0);
          if (file) void selectFile(file);
        }}
      >
        <input
          accept="image/jpeg,image/png,video/mp4"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.currentTarget.files?.item(0);
            if (file) void selectFile(file);
          }}
          ref={attachmentInputRef}
          type="file"
        />
        <input
          name="media_reference"
          type="hidden"
          value={currentMediaRef.current ? JSON.stringify(currentMediaRef.current) : ""}
        />
        <button
          className="media-dropzone-picker"
          disabled={disabled || locked || preparing}
          onClick={() => attachmentInputRef.current?.click()}
          type="button"
        >
          <span className="media-dropzone-icon">
            {selection?.kind === "video" ? <Film aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          </span>
          <span className="media-dropzone-copy">
            {preparing ? (
              <><strong>添付ファイルを準備しています...</strong><small>このまま少しお待ちください</small></>
            ) : selection ? (
              <><strong>{selection.fileName}</strong><small>{selection.kind === "video" ? "動画" : "画像"}・{formatMediaFileSize(selection.size)}</small></>
            ) : (
              <><strong>ここに画像・動画をドロップ</strong><small>または選択（JPEG・PNG 10MB / MP4 50MB）</small></>
            )}
          </span>
        </button>
        {selection && !disabled && !locked ? (
          <button
            aria-label="添付を取り消す"
            className="media-dropzone-remove"
            onClick={() => clearSelection(true)}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>
      {error ? <span className="media-upload-error" role="alert">{error}</span> : null}
    </div>
  );
});

async function uploadToSignedUrl(url: string, file: File): Promise<void> {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  const response = await fetch(url, {
    method: "PUT",
    headers: { "x-upsert": "false" },
    body
  });

  if (!response.ok) {
    throw new Error("画像・動画をアップロードできませんでした。時間をおいて選び直してください。");
  }
}

async function discardPreparedMedia(media: AdminOutboundMediaReference): Promise<void> {
  try {
    await discardOutboundMediaUploadAction(media);
  } catch {
    // Best effort cleanup; the private object is never referenced by a sent message.
  }
}

async function createVideoPreview(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;
    video.load();
    await waitForVideoEvent(video, "loadedmetadata");

    const targetTime = Number.isFinite(video.duration)
      ? Math.min(Math.max(video.duration * 0.05, 0), 1)
      : 0;
    if (targetTime > 0) {
      await seekVideo(video, targetTime);
    } else {
      await waitForVideoEvent(video, "loadeddata");
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) throw new Error("video_dimensions_unavailable");

    let scale = Math.min(1, 1280 / sourceWidth, 720 / sourceHeight);
    const canvas = document.createElement("canvas");
    let blob: Blob | null = null;

    for (const quality of [0.82, 0.68, 0.52]) {
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas_unavailable");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_OUTBOUND_LINE_PREVIEW_BYTES) break;
      scale *= 0.72;
    }

    if (!blob || blob.size > MAX_OUTBOUND_LINE_PREVIEW_BYTES) {
      throw new Error("preview_too_large");
    }

    const baseName = file.name.replace(/\.[^.]+$/u, "") || "video";
    return new File([blob], `${baseName}-preview.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function createImagePreview(file: File): Promise<File> {
  if (file.size <= MAX_OUTBOUND_LINE_PREVIEW_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;
    await waitForImageLoad(image);

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!sourceWidth || !sourceHeight) throw new Error("image_dimensions_unavailable");

    let scale = Math.min(1, 1280 / sourceWidth, 1280 / sourceHeight);
    const canvas = document.createElement("canvas");
    let blob: Blob | null = null;

    for (const quality of [0.82, 0.68, 0.52, 0.4]) {
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas_unavailable");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_OUTBOUND_LINE_PREVIEW_BYTES) break;
      scale *= 0.72;
    }

    if (!blob || blob.size > MAX_OUTBOUND_LINE_PREVIEW_BYTES) {
      throw new Error("preview_too_large");
    }

    const baseName = file.name.replace(/\.[^.]+$/u, "") || "image";
    return new File([blob], `${baseName}-preview.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function waitForImageLoad(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("image_preview_timeout"));
    }, 15_000);
    const handleReady = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("image_preview_failed"));
    };
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      image.removeEventListener("load", handleReady);
      image.removeEventListener("error", handleError);
    };
    image.addEventListener("load", handleReady, { once: true });
    image.addEventListener("error", handleError, { once: true });
  });
}

function seekVideo(video: HTMLVideoElement, targetTime: number): Promise<void> {
  const ready = waitForVideoEvent(video, "seeked");
  video.currentTime = targetTime;
  return ready;
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadedmetadata" | "loadeddata" | "seeked"): Promise<void> {
  if (eventName === "loadedmetadata" && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }
  if (eventName === "loadeddata" && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("video_preview_timeout"));
    }, 15_000);
    const handleReady = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("video_preview_failed"));
    };
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener(eventName, handleReady);
      video.removeEventListener("error", handleError);
    };
    video.addEventListener(eventName, handleReady, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("preview_encode_failed"));
    }, "image/jpeg", quality);
  });
}
