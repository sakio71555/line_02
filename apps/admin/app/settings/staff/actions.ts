"use server";

import { revalidatePath } from "next/cache";

import type { StaffRole } from "@amami-line-crm/domain";

import {
  AdminApiError,
  createAdminStaffMember,
  resendAdminStaffInvitation,
  updateAdminStaffMember
} from "../../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../../admin-api-request-options";

export interface StaffActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function createStaffMemberAction(
  _state: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  try {
    const result = await createAdminStaffMember(
      {
        display_name: read(formData, "display_name"),
        email: read(formData, "email"),
        role: readRole(formData)
      },
      await getServerAdminApiRequestOptions()
    );

    revalidatePath("/settings/staff");
    return {
      status: "success",
      message:
        result.invitation_status === "sent"
          ? "担当者を登録し、招待メールを送信しました。初回ログイン後に利用可能になります。"
          : result.invitation_status === "reconciled"
            ? "既存の招待情報を復旧しました。初回ログイン後に利用可能になります。"
            : result.invitation_status === "not_required"
              ? "既存の利用者をこの会社の担当者として登録しました。"
              : result.invitation_status === "failed"
                ? "担当者を招待待ちで登録しました。招待メールは送信できなかったため、再送してください。"
                : "担当者を招待待ちで登録しました。招待メールの設定後に再送できます。"
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function updateStaffMemberAction(
  staffId: string,
  _state: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  try {
    const intent = read(formData, "intent");
    const input =
      intent === "disable"
        ? { is_active: false }
        : intent === "enable"
          ? { is_active: true }
          : {
              display_name: read(formData, "display_name"),
              role: readRole(formData)
            };

    await updateAdminStaffMember(staffId, input, await getServerAdminApiRequestOptions());
    revalidatePath("/settings/staff");
    return {
      status: "success",
      message:
        intent === "disable"
          ? "担当者の利用を停止しました。"
          : intent === "enable"
            ? "担当者の利用を再開しました。"
            : "担当者情報を保存しました。"
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function resendStaffInvitationAction(
  staffId: string,
  _state: StaffActionState
): Promise<StaffActionState> {
  try {
    const result = await resendAdminStaffInvitation(
      staffId,
      await getServerAdminApiRequestOptions()
    );
    revalidatePath("/settings/staff");
    return {
      status: "success",
      message:
        result.invitation_status === "reconciled"
          ? "既存の招待情報を復旧しました。初回ログインをお待ちください。"
          : "招待メールを再送しました。初回ログイン後に利用可能になります。"
    };
  } catch (error) {
    return errorState(error);
  }
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readRole(formData: FormData): StaffRole {
  const role = read(formData, "role");
  if (role === "owner" || role === "manager" || role === "staff") {
    return role;
  }
  throw new Error("担当者の権限を選択してください。");
}

function errorState(error: unknown): StaffActionState {
  return {
    status: "error",
    message:
      error instanceof AdminApiError
        ? error.publicMessage
        : error instanceof Error && error.message === "担当者の権限を選択してください。"
          ? error.message
          : "担当者情報を更新できませんでした。画面を再読み込みして、もう一度お試しください。"
  };
}
