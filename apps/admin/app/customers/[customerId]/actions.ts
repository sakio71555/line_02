"use server";

import { revalidatePath } from "next/cache";

import {
  ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE,
  createAiReplyDraft,
  createAiSummary,
  createRagAnswerDraft,
  sendStaffReply
} from "../../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../../admin-api-request-options";
import type {
  AiReplyDraftActionState,
  AiSummaryActionState,
  RagAnswerDraftActionState,
  StaffReplyActionState
} from "./action-types";

export async function runAiSummaryAction(
  customerId: string,
  _previousState: AiSummaryActionState,
  _formData: FormData
): Promise<AiSummaryActionState> {
  try {
    const result = await createAiSummary(customerId, await getServerAdminApiRequestOptions());
    revalidatePath(`/customers/${customerId}`);

    return {
      status: "success",
      result
    };
  } catch (error) {
    return {
      status: "error",
      error: formatActionError(error)
    };
  }
}

export async function runAiReplyDraftAction(
  customerId: string,
  _previousState: AiReplyDraftActionState,
  _formData: FormData
): Promise<AiReplyDraftActionState> {
  try {
    return {
      status: "success",
      result: await createAiReplyDraft(customerId, await getServerAdminApiRequestOptions())
    };
  } catch (error) {
    return {
      status: "error",
      error: formatActionError(error)
    };
  }
}

export async function runRagAnswerDraftAction(
  _previousState: RagAnswerDraftActionState,
  formData: FormData
): Promise<RagAnswerDraftActionState> {
  const query = readTrimmedFormValue(formData, "query");

  if (!query) {
    return {
      status: "error",
      error: "質問を入力してください。"
    };
  }

  try {
    return {
      status: "success",
      result: await createRagAnswerDraft(
        { query, limit: 5 },
        await getServerAdminApiRequestOptions()
      )
    };
  } catch (error) {
    return {
      status: "error",
      error: formatActionError(error)
    };
  }
}

export async function runStaffReplyAction(
  customerId: string,
  _previousState: StaffReplyActionState,
  formData: FormData
): Promise<StaffReplyActionState> {
  const body = readTrimmedFormValue(formData, "body");

  if (!body) {
    return {
      status: "error",
      error: "返信文を入力してください。"
    };
  }

  const deliveryMode = readStaffReplyDeliveryMode(formData);

  if (deliveryMode === "real_line_push" && !isRealLinePushConfirmed(formData)) {
    return {
      status: "error",
      error: "本番LINE送信の確認チェックが必要です。"
    };
  }

  try {
    const result = await sendStaffReply(
      deliveryMode === "real_line_push"
        ? {
            customerId,
            body,
            deliveryMode,
            realLinePushConfirmed: true,
            linePushConfirmation: ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE,
            idempotencyKey: readTrimmedFormValue(formData, "idempotency_key")
          }
        : { customerId, body, deliveryMode },
      await getServerAdminApiRequestOptions()
    );
    revalidatePath(`/customers/${customerId}`);

    return {
      status: "success",
      result,
      deliveryMode
    };
  } catch (error) {
    return {
      status: "error",
      error: formatActionError(error)
    };
  }
}

function readStaffReplyDeliveryMode(formData: FormData): "demo_save" | "real_line_push" {
  return readTrimmedFormValue(formData, "delivery_mode") === "real_line_push"
    ? "real_line_push"
    : "demo_save";
}

function isRealLinePushConfirmed(formData: FormData): boolean {
  return (
    readTrimmedFormValue(formData, "confirm_single_canary_send") === "on" &&
    readTrimmedFormValue(formData, "line_push_confirmation") ===
      ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE &&
    Boolean(readTrimmedFormValue(formData, "idempotency_key"))
  );
}

function readTrimmedFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function formatActionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
