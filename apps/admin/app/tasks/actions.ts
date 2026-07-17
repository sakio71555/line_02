"use server";

import { revalidatePath } from "next/cache";

import type { AlertSeverity, AlertWorkflowStatus } from "@amami-line-crm/domain";

import { updateAdminOperationsTask } from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";

export interface OperationsTaskActionState {
  status: "idle" | "success" | "error";
  error?: string;
}

export async function updateOperationsTaskAction(
  alertId: string,
  _previousState: OperationsTaskActionState,
  formData: FormData
): Promise<OperationsTaskActionState> {
  const workflowStatus = readValue(formData, "workflow_status") as AlertWorkflowStatus;
  const assignedStaffUserId = readValue(formData, "assigned_staff_user_id");
  const dueAtInput = readValue(formData, "due_at");
  const severity = readValue(formData, "severity") as AlertSeverity;
  const customerId = readValue(formData, "customer_id");

  if (!["open", "in_progress", "waiting_customer", "completed"].includes(workflowStatus)) {
    return { status: "error", error: "対応状況を選択してください。" };
  }

  try {
    const dueAtDate = dueAtInput ? new Date(dueAtInput) : null;
    if (dueAtDate && Number.isNaN(dueAtDate.getTime())) {
      return { status: "error", error: "返信期限を正しく入力してください。" };
    }

    const dueAt = dueAtDate?.toISOString() ?? null;
    await updateAdminOperationsTask(
      alertId,
      {
        workflow_status: workflowStatus,
        assigned_staff_user_id: assignedStaffUserId || null,
        due_at: dueAt,
        severity
      },
      await getServerAdminApiRequestOptions()
    );
    revalidatePath("/tasks");
    revalidatePath("/");
    if (customerId) revalidatePath(`/customers/${customerId}`);
    return { status: "success" };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
}

function readValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
