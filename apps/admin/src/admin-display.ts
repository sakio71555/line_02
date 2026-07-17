import type { AdminAlertListItem, AdminCustomerListItem } from "./admin-api";

export function formatCompactDateTime(value: string | null | undefined): string {
  if (!value) {
    return "日時なし";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo"
  }).format(date);
}

export function getCustomerDisplayName(customer: AdminCustomerListItem): string {
  return customer.name || customer.display_name || "名前未登録";
}

export function getCustomerResponseLabel(mode: string): string {
  const labels: Record<string, string> = {
    bot_auto: "AI対応中",
    human_required: "要対応",
    human_active: "対応中",
    emergency: "至急",
    closed: "完了"
  };

  return labels[mode] ?? "確認中";
}

export function getCustomerResponseTone(
  mode: string
): "neutral" | "info" | "attention" | "danger" | "success" {
  if (mode === "emergency") return "danger";
  if (mode === "human_required") return "attention";
  if (mode === "human_active") return "info";
  if (mode === "closed") return "success";
  return "neutral";
}

export function getAlertPriorityLabel(severity: AdminAlertListItem["severity"]): string {
  const labels: Record<AdminAlertListItem["severity"], string> = {
    low: "低",
    medium: "通常",
    high: "高",
    critical: "至急"
  };
  return labels[severity];
}

export function getAlertTone(
  severity: AdminAlertListItem["severity"]
): "neutral" | "attention" | "danger" {
  if (severity === "critical") return "danger";
  if (severity === "high" || severity === "medium") return "attention";
  return "neutral";
}
