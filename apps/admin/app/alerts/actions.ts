"use server";

import { revalidatePath } from "next/cache";

import { checkUnrepliedAlerts, notifyOpenAlerts } from "../../src/admin-api";
import type { CheckUnrepliedActionState, NotifyOpenActionState } from "./action-types";

export async function runCheckUnrepliedAction(
  _previousState: CheckUnrepliedActionState,
  _formData: FormData
): Promise<CheckUnrepliedActionState> {
  try {
    const result = await checkUnrepliedAlerts();
    revalidatePath("/alerts");

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

export async function runNotifyOpenAction(
  _previousState: NotifyOpenActionState,
  _formData: FormData
): Promise<NotifyOpenActionState> {
  try {
    const result = await notifyOpenAlerts();
    revalidatePath("/alerts");

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

function formatActionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
