"use server";

import { revalidatePath } from "next/cache";

import {
  ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE,
  archiveAdminCustomer,
  type AdminCustomerRichMenuType,
  createAdminInternalNote,
  createAiReplyDraft,
  createAiSummary,
  createRagAnswerDraft,
  sendStaffReply,
  restoreAdminCustomer,
  sendAdminCustomerStatusNotification,
  switchAdminCustomerRichMenu,
  updateAdminCustomerStage
} from "../../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../../admin-api-request-options";
import type {
  AiReplyDraftActionState,
  AiSummaryActionState,
  CustomerArchiveActionState,
  CustomerOperationsActionState,
  RagAnswerDraftActionState,
  RichMenuSwitchActionState,
  StaffReplyActionState
} from "./action-types";

export async function runInternalNoteAction(
  customerId: string,
  _previousState: CustomerOperationsActionState,
  formData: FormData
): Promise<CustomerOperationsActionState> {
  const body = readTrimmedFormValue(formData, "body");
  const mentionStaffUserIds = formData
    .getAll("mention_staff_user_ids")
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.trim());
  if (!body) return { status: "error", error: "社内メモを入力してください。" };

  try {
    await createAdminInternalNote(
      customerId,
      { body, mention_staff_user_ids: mentionStaffUserIds },
      await getServerAdminApiRequestOptions()
    );
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/search");
    return { status: "success", message: "社内メモを保存しました。" };
  } catch (error) {
    return { status: "error", error: formatActionError(error) };
  }
}

export async function runCustomerStageAction(
  customerId: string,
  _previousState: CustomerOperationsActionState,
  formData: FormData
): Promise<CustomerOperationsActionState> {
  const stage = readCustomerRichMenuType(formData);
  if (!stage) return { status: "error", error: "顧客段階を選択してください。" };

  try {
    const result = await updateAdminCustomerStage(
      customerId,
      { stage, apply_rich_menu: readTrimmedFormValue(formData, "apply_rich_menu") === "on" },
      await getServerAdminApiRequestOptions()
    );
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    return {
      status: "success",
      message: result.rich_menu_linked
        ? "顧客段階とLINEメニューを更新しました。"
        : "顧客段階を更新しました。"
    };
  } catch (error) {
    return { status: "error", error: formatActionError(error) };
  }
}

export async function runCustomerStatusNotificationAction(
  customerId: string,
  _previousState: CustomerOperationsActionState,
  formData: FormData
): Promise<CustomerOperationsActionState> {
  const body = readTrimmedFormValue(formData, "body");
  if (!body) return { status: "error", error: "お客様へ知らせる内容を入力してください。" };
  if (readTrimmedFormValue(formData, "confirm_status_notification") !== "on") {
    return { status: "error", error: "LINEへ1通送信する確認が必要です。" };
  }

  try {
    await sendAdminCustomerStatusNotification(
      customerId,
      {
        body,
        confirmed: true,
        confirmation: ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE,
        idempotency_key: `status-${customerId}-${globalThis.crypto.randomUUID()}`
      },
      await getServerAdminApiRequestOptions()
    );
    revalidatePath(`/customers/${customerId}`);
    return { status: "success", message: "お客様へ状況を1通送信しました。" };
  } catch (error) {
    return { status: "error", error: formatActionError(error) };
  }
}

export async function runCustomerArchiveAction(
  customerId: string,
  _previousState: CustomerArchiveActionState,
  formData: FormData
): Promise<CustomerArchiveActionState> {
  const mode = readTrimmedFormValue(formData, "archive_mode");

  if (mode === "restore") {
    try {
      const result = await restoreAdminCustomer(
        customerId,
        await getServerAdminApiRequestOptions()
      );
      revalidatePath("/customers");
      revalidatePath(`/customers/${customerId}`);
      return { status: "success", result };
    } catch (error) {
      return { status: "error", error: formatActionError(error) };
    }
  }

  const confirmation = readTrimmedFormValue(formData, "customer_name_confirmation");
  const expectedConfirmation = readTrimmedFormValue(formData, "expected_customer_name");
  if (!expectedConfirmation || confirmation !== expectedConfirmation) {
    return {
      status: "error",
      error: "確認欄に表示されているお客様名を正確に入力してください。"
    };
  }

  try {
    const result = await archiveAdminCustomer(
      customerId,
      await getServerAdminApiRequestOptions()
    );
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    return { status: "success", result };
  } catch (error) {
    return { status: "error", error: formatActionError(error) };
  }
}

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
      error: "LINE送信の確認チェックが必要です。"
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

export async function runRichMenuSwitchAction(
  customerId: string,
  _previousState: RichMenuSwitchActionState,
  formData: FormData
): Promise<RichMenuSwitchActionState> {
  const menuType = readCustomerRichMenuType(formData);

  if (!menuType) {
    return {
      status: "error",
      error: "切り替えるメニューを選択してください。"
    };
  }

  try {
    const result = await switchAdminCustomerRichMenu(
      {
        customerId,
        menuType
      },
      await getServerAdminApiRequestOptions()
    );
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

function readStaffReplyDeliveryMode(formData: FormData): "demo_save" | "real_line_push" {
  return readTrimmedFormValue(formData, "delivery_mode") === "real_line_push"
    ? "real_line_push"
    : "demo_save";
}

function isRealLinePushConfirmed(formData: FormData): boolean {
  return (
    readTrimmedFormValue(formData, "confirm_single_line_send") === "on" &&
    readTrimmedFormValue(formData, "line_push_confirmation") ===
      ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE &&
    Boolean(readTrimmedFormValue(formData, "idempotency_key"))
  );
}

function readCustomerRichMenuType(formData: FormData): AdminCustomerRichMenuType | null {
  const value = readTrimmedFormValue(formData, "menu_type");

  switch (value) {
    case "initial":
    case "negotiation":
    case "aftercare":
      return value;
    default:
      return null;
  }
}

function readTrimmedFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function formatActionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
