import type { AdminAction, AdminRole } from "@amami-line-crm/domain";

export const adminUiVisibilityStates = [
  "visible_enabled",
  "visible_disabled",
  "hidden"
] as const;

export type AdminUiVisibilityState = (typeof adminUiVisibilityStates)[number];

export const adminUiOperations = [
  "view_customers_page",
  "view_customer_detail_page",
  "view_timeline",
  "use_staff_reply_form",
  "use_ai_summary_button",
  "use_ai_reply_draft_button",
  "use_rag_answer_form",
  "view_alerts_page",
  "use_check_unreplied_button",
  "use_notify_open_alerts_button"
] as const;

export type AdminUiOperation = (typeof adminUiOperations)[number];

export interface AdminUiRoleVisibilityFixture {
  operation: AdminUiOperation;
  action: AdminAction;
  expectations: Record<AdminRole, AdminUiVisibilityState>;
  reason: string;
}

export const adminUiRoleVisibilityFixtures: readonly AdminUiRoleVisibilityFixture[] = [
  {
    operation: "view_customers_page",
    action: "view_customers",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_enabled"
    },
    reason: "Customer list is a tenant-scoped read operation for all staff roles."
  },
  {
    operation: "view_customer_detail_page",
    action: "view_customer_detail",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_enabled"
    },
    reason: "Customer detail is a tenant-scoped read operation for all staff roles."
  },
  {
    operation: "view_timeline",
    action: "view_timeline",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_enabled"
    },
    reason: "Timeline read access is needed by all staff roles for customer support."
  },
  {
    operation: "use_staff_reply_form",
    action: "send_staff_reply",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_enabled"
    },
    reason: "Staff reply is a day-to-day support action for all staff roles."
  },
  {
    operation: "use_ai_summary_button",
    action: "create_ai_summary",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_disabled"
    },
    reason: "AI summary persists a summary message, so staff should see a disabled control first."
  },
  {
    operation: "use_ai_reply_draft_button",
    action: "create_ai_reply_draft",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_enabled"
    },
    reason: "AI reply draft is not saved or sent automatically, so staff can use it."
  },
  {
    operation: "use_rag_answer_form",
    action: "create_rag_answer_draft",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_enabled"
    },
    reason: "RAG answer draft is a non-persistent support action for all staff roles."
  },
  {
    operation: "view_alerts_page",
    action: "view_alerts",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_enabled"
    },
    reason: "Alert list is a tenant-scoped read operation for all staff roles."
  },
  {
    operation: "use_check_unreplied_button",
    action: "check_unreplied_alerts",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_disabled"
    },
    reason: "Unreplied checks create alerts, so staff should see a disabled control first."
  },
  {
    operation: "use_notify_open_alerts_button",
    action: "notify_open_alerts",
    expectations: {
      owner: "visible_enabled",
      manager: "visible_enabled",
      staff: "visible_disabled"
    },
    reason: "Open alert notification mutates alert status, so staff should see a disabled control first."
  }
] as const;

export const adminUiRoleVisibilityRows = adminUiRoleVisibilityFixtures.flatMap((fixture) =>
  (["owner", "manager", "staff"] as const satisfies readonly AdminRole[]).map((role) => ({
    operation: fixture.operation,
    action: fixture.action,
    role,
    expectedVisibility: fixture.expectations[role],
    reason: fixture.reason
  }))
);
