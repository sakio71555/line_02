"use server";

import {
  ADMIN_BROADCAST_CONFIRMATION_VALUE,
  sendAdminBroadcast,
  type AdminBroadcastSendResponse
} from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { parseOutboundLineMediaReference } from "../../src/outbound-line-media";

export interface BroadcastActionState {
  status: "idle" | "success" | "error";
  result?: AdminBroadcastSendResponse;
  error?: string;
}

export async function runBroadcastAction(
  _previousState: BroadcastActionState,
  formData: FormData
): Promise<BroadcastActionState> {
  const body = readValue(formData, "body");
  const confirmation = readValue(formData, "confirmation");
  const idempotencyKey = readValue(formData, "idempotency_key");
  const confirmed = readValue(formData, "confirmed") === "on";
  const mediaValue = formData.get("media_reference");
  const media = parseOutboundLineMediaReference(mediaValue, "broadcast");

  if (typeof mediaValue === "string" && mediaValue.trim() && !media) {
    return { status: "error", error: "画像・動画の送信準備が無効です。選び直してください。" };
  }

  if ((!body && !media) || body.length > 5000) {
    return { status: "error", error: "メッセージまたは画像・動画を指定してください。本文は5000文字以内です。" };
  }

  if (!confirmed || confirmation !== ADMIN_BROADCAST_CONFIRMATION_VALUE) {
    return { status: "error", error: "確認チェックと確認文の入力が必要です。" };
  }

  if (!idempotencyKey) {
    return { status: "error", error: "送信準備が完了していません。画面を再読み込みしてください。" };
  }

  try {
    const result = await sendAdminBroadcast(
      {
        body,
        confirmed,
        confirmation,
        idempotencyKey,
        ...(media ? { media } : {})
      },
      await getServerAdminApiRequestOptions()
    );

    return { status: "success", result };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function readValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
