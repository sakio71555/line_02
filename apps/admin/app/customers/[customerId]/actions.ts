"use server";

import { revalidatePath } from "next/cache";

import {
  createAiReplyDraft,
  createAiSummary,
  createRagAnswerDraft,
  sendStaffReply
} from "../../../src/admin-api";
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
    const result = await createAiSummary(customerId);
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
      result: await createAiReplyDraft(customerId)
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
      result: await createRagAnswerDraft({ query, limit: 5 })
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

  try {
    const result = await sendStaffReply({ customerId, body });
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

function readTrimmedFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function formatActionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
