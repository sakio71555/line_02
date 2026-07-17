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
    low: "急ぎではない",
    medium: "通常",
    high: "早め",
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

export interface AdminAlertPresentation {
  actionLabel: string;
  customerName: string;
  detail: string;
  isTestData: boolean;
  title: string;
}

const alertFieldLabels: Record<string, string> = {
  sub_category: "内容",
  method: "方法",
  desired_datetime: "希望日時",
  cancel_meeting_datetime: "対象日時",
  confirm_meeting_datetime: "確認したい打合せ",
  meeting_topic: "打合せ内容",
  target_area: "対象場所",
  exterior_target_area: "対象箇所",
  priority: "希望",
  current_status: "現在の状況",
  desired_response: "希望する対応",
  land_status: "土地の状況",
  address_area: "住所・エリア",
  stage: "現在の段階",
  urgency: "緊急度",
  preferred_datetime: "希望日時",
  concern_area: "気になる箇所",
  body: "相談内容"
};

export function getAlertPresentation(
  alert: AdminAlertListItem,
  customer?: AdminCustomerListItem
): AdminAlertPresentation {
  const customerName = customer ? getCustomerDisplayName(customer) : "名前未登録のお客様";
  const fields = parseAlertFields(alert.message);
  const structuredTitle = fields.title?.trim();
  const isTestData = isLikelyTestAlert(alert);

  if (structuredTitle) {
    return {
      actionLabel: "内容を確認して返信",
      customerName,
      detail: formatStructuredAlertDetail(fields, structuredTitle),
      isTestData,
      title: `${customerName}の「${structuredTitle}」を確認する`
    };
  }

  const contactStaff = parseContactStaffMessage(alert.message);
  if (contactStaff) {
    return {
      actionLabel: "相談内容を確認して返信",
      customerName,
      detail: [
        contactStaff.category ? `相談種別: ${contactStaff.category}` : null,
        contactStaff.priority ? `希望: ${contactStaff.priority}` : null,
        contactStaff.body ? `相談内容: ${contactStaff.body}` : null
      ]
        .filter((value): value is string => Boolean(value))
        .join(" / "),
      isTestData,
      title: `${customerName}の相談に返信する`
    };
  }

  const fallbackDetail = formatPlainAlertDetail(alert, customer);
  return {
    actionLabel: alert.status === "resolved" ? "対応内容を確認" : "お客様ページを開く",
    customerName,
    detail: fallbackDetail,
    isTestData,
    title: formatAlertActionTitle(alert, customerName)
  };
}

export function isLikelyTestAlert(alert: AdminAlertListItem): boolean {
  const identifierSource = `${alert.id} ${alert.customer_id}`;
  if (/(?:^|[\s_-])(smoke|test)(?:[\s_-]|$)/iu.test(identifierSource)) {
    return true;
  }

  return /(?:customer[_ -]?(?:smoke|test)|(?:smoke|line)[_ -]?test|smoke[_ -]?alert|受信テスト|通知テスト)/iu.test(
    alert.message
  );
}

function parseAlertFields(message: string): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const line of message.split(/\r?\n/u)) {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    fields[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim();
  }

  return fields;
}

function formatStructuredAlertDetail(
  fields: Record<string, string>,
  structuredTitle: string
): string {
  const details: string[] = [];
  const classificationSegments = fields.classification_tree
    ?.split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of classificationSegments?.slice(2) ?? []) {
    addUniqueDetail(details, segment);
  }

  for (const [key, value] of Object.entries(fields)) {
    if (!key.endsWith("_label") || !value || value === "なし") continue;
    const fieldKey = key.slice(0, -"_label".length);
    const label = alertFieldLabels[fieldKey];
    if (!label) continue;
    addUniqueDetail(details, `${label}: ${value}`);
  }

  return details.slice(0, 5).join(" / ") || `${structuredTitle}の内容を確認してください。`;
}

function addUniqueDetail(details: string[], value: string): void {
  const normalized = value.trim();
  if (!normalized || details.some((detail) => detail === normalized || detail.endsWith(`: ${normalized}`))) {
    return;
  }
  details.push(normalized);
}

function parseContactStaffMessage(message: string): {
  body: string;
  category: string | null;
  priority: string | null;
} | null {
  const lines = message.split(/\r?\n/u);
  const categoryPrefix = "担当者相談カテゴリ: ";
  const priorityPrefix = "担当者相談優先度: ";
  const categoryLine = lines.find((line) => line.startsWith(categoryPrefix));

  if (!categoryLine) return null;

  const priorityLine = lines.find((line) => line.startsWith(priorityPrefix));
  const body = lines
    .filter((line) => !line.startsWith(categoryPrefix) && !line.startsWith(priorityPrefix))
    .join("\n")
    .trim();

  return {
    body,
    category: categoryLine.slice(categoryPrefix.length).trim() || null,
    priority: priorityLine?.slice(priorityPrefix.length).trim() || null
  };
}

function formatPlainAlertDetail(
  alert: AdminAlertListItem,
  customer?: AdminCustomerListItem
): string {
  if (/^customer .+ is unreplied in response_mode .+\.$/u.test(alert.message)) {
    return customer?.last_message_body
      ? `最新メッセージ: ${customer.last_message_body}`
      : "LINEの未返信メッセージがあります。内容を確認してください。";
  }

  if (/\b[a-z][a-z0-9_]*=/iu.test(alert.message)) {
    return "相談内容をお客様ページで確認してください。";
  }

  return alert.message.trim() || "対応内容をお客様ページで確認してください。";
}

function formatAlertActionTitle(alert: AdminAlertListItem, customerName: string): string {
  if (alert.type === "emergency" || alert.severity === "critical") {
    return `${customerName}へ至急連絡する`;
  }
  if (alert.type === "stale") {
    return `${customerName}の対応状況を確認する`;
  }
  if (alert.type === "ai_risk") {
    return `${customerName}の質問内容を確認する`;
  }
  return `${customerName}へ返信する`;
}
