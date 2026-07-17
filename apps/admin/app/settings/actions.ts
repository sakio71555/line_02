"use server";

import { revalidatePath } from "next/cache";

import {
  lineExperienceSettingsSchema,
  type LineExperienceSettings,
  type WorkspaceAccentPreset
} from "@amami-line-crm/domain";

import { saveAdminReplyTemplate, saveAdminWorkspaceSettings } from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";

export interface SettingsActionState {
  status: "idle" | "success" | "error";
  error?: string;
  settingsVersion?: string | null;
}

export async function saveWorkspaceSettingsAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  try {
    const saved = await saveAdminWorkspaceSettings({
      expected_updated_at: read(formData, "expected_updated_at") || null,
      company_name: read(formData, "company_name"),
      product_name: read(formData, "product_name"),
      accent_preset: read(formData, "accent_preset") as WorkspaceAccentPreset,
      sla_minutes: Number(read(formData, "sla_minutes")),
      rich_menu_auto_switch_enabled: formData.get("rich_menu_auto_switch_enabled") === "on",
      customer_status_notifications_enabled: formData.get("customer_status_notifications_enabled") === "on",
      line_experience: readLineExperience(formData),
      setup_completed: formData.get("setup_completed") === "on"
    }, await getServerAdminApiRequestOptions());
    revalidatePath("/settings");
    return { status: "success", settingsVersion: saved.settings_version };
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

function readLineExperience(formData: FormData): LineExperienceSettings {
  const rawValue = read(formData, "line_experience");
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    throw new Error("LINEメニュー設定を読み込めませんでした。画面を再読み込みしてください。");
  }

  const result = lineExperienceSettingsSchema.safeParse(parsedValue);
  if (!result.success) {
    throw new Error("LINEメニュー設定に入力不足または不正なURLがあります。");
  }

  return result.data;
}
