"use server";

import { revalidatePath } from "next/cache";

import type { WorkspaceAccentPreset } from "@amami-line-crm/domain";

import { saveAdminReplyTemplate, saveAdminWorkspaceSettings } from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";

export interface SettingsActionState { status: "idle" | "success" | "error"; error?: string }

export async function saveWorkspaceSettingsAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    await saveAdminWorkspaceSettings({
      company_name: read(formData, "company_name"),
      product_name: read(formData, "product_name"),
      accent_preset: read(formData, "accent_preset") as WorkspaceAccentPreset,
      sla_minutes: Number(read(formData, "sla_minutes")),
      rich_menu_auto_switch_enabled: formData.get("rich_menu_auto_switch_enabled") === "on",
      customer_status_notifications_enabled: formData.get("customer_status_notifications_enabled") === "on",
      setup_completed: formData.get("setup_completed") === "on"
    }, await getServerAdminApiRequestOptions());
    revalidatePath("/settings");
    return { status: "success" };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveReplyTemplateAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    await saveAdminReplyTemplate({
      title: read(formData, "title"),
      category: read(formData, "category") || "general",
      body: read(formData, "body"),
      is_active: true
    }, await getServerAdminApiRequestOptions());
    revalidatePath("/settings");
    return { status: "success" };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
