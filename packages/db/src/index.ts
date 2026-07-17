export const tenantScopedTables = [
  "tenant_line_settings",
  "tenant_ai_settings",
  "staff_users",
  "staff_tenant_memberships",
  "customers",
  "messages",
  "consultations",
  "alerts",
  "knowledge_pages",
  "construction_cases",
  "reservations"
  ,"internal_notes"
  ,"reply_templates"
  ,"tenant_workspace_settings"
  ,"audit_events"
] as const;

export type TenantScopedTable = (typeof tenantScopedTables)[number];

export interface TableDefinition {
  name: "tenants" | TenantScopedTable;
  has_tenant_id: boolean;
  purpose: string;
}

export const tableDefinitions: TableDefinition[] = [
  { name: "tenants", has_tenant_id: false, purpose: "工務店テナントのマスター" },
  { name: "tenant_line_settings", has_tenant_id: true, purpose: "LINE公式アカウント設定" },
  { name: "tenant_ai_settings", has_tenant_id: true, purpose: "AIモデル・RAG設定" },
  { name: "staff_users", has_tenant_id: true, purpose: "管理画面を使う担当者" },
  {
    name: "staff_tenant_memberships",
    has_tenant_id: true,
    purpose: "担当者とtenantの所属・権限"
  },
  { name: "customers", has_tenant_id: true, purpose: "LINE友だち単位の顧客カルテ" },
  { name: "messages", has_tenant_id: true, purpose: "LINE・管理画面返信ログ" },
  { name: "consultations", has_tenant_id: true, purpose: "相談案件のまとまり" },
  { name: "alerts", has_tenant_id: true, purpose: "未返信・放置・緊急アラート" },
  { name: "knowledge_pages", has_tenant_id: true, purpose: "公式HP・FAQなどのRAG知識" },
  { name: "construction_cases", has_tenant_id: true, purpose: "施工事例レコメンド候補" },
  { name: "reservations", has_tenant_id: true, purpose: "モデルホーム・相談予約" }
  ,{ name: "internal_notes", has_tenant_id: true, purpose: "社内メモと引き継ぎ" }
  ,{ name: "reply_templates", has_tenant_id: true, purpose: "担当者返信テンプレート" }
  ,{ name: "tenant_workspace_settings", has_tenant_id: true, purpose: "管理画面と運用設定" }
  ,{ name: "audit_events", has_tenant_id: true, purpose: "操作監査履歴" }
];

export * from "./supabase";
export * from "./runtime";
