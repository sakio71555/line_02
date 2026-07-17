import type { StaffRole } from "./index";

export const adminRoles = ["owner", "manager", "staff"] as const satisfies readonly StaffRole[];

export type AdminRole = StaffRole;

export const adminActions = [
  "view_customers",
  "view_customer_detail",
  "manage_customers",
  "view_timeline",
  "send_staff_reply",
  "send_broadcast",
  "create_ai_summary",
  "create_ai_reply_draft",
  "search_rag",
  "create_rag_answer_draft",
  "view_alerts",
  "check_unreplied_alerts",
  "notify_open_alerts",
  "manage_knowledge",
  "manage_staff",
  "manage_tenant_settings",
  "run_dev_seed"
] as const;

export type AdminAction = (typeof adminActions)[number];

export const roleGuardedAdminActions = [
  "view_customers",
  "view_customer_detail",
  "manage_customers",
  "view_timeline",
  "send_staff_reply",
  "send_broadcast",
  "create_ai_summary",
  "create_ai_reply_draft",
  "search_rag",
  "create_rag_answer_draft",
  "view_alerts",
  "check_unreplied_alerts",
  "notify_open_alerts",
  "manage_knowledge",
  "manage_staff",
  "manage_tenant_settings"
] as const satisfies readonly AdminAction[];

export type RoleGuardedAdminAction = (typeof roleGuardedAdminActions)[number];

export type AdminPermissionDeniedReason =
  | "role_not_allowed"
  | "unknown_action"
  | "unknown_role";

export type AdminPermissionDecision =
  | {
      allowed: true;
      role: AdminRole;
      action: AdminAction;
    }
  | {
      allowed: false;
      reason: AdminPermissionDeniedReason;
      role: string;
      action: string;
    };

const ownerAllowedActions = new Set<AdminAction>(roleGuardedAdminActions);
const managerAllowedActions = new Set<AdminAction>([
  "view_customers",
  "view_customer_detail",
  "manage_customers",
  "view_timeline",
  "send_staff_reply",
  "send_broadcast",
  "create_ai_summary",
  "create_ai_reply_draft",
  "search_rag",
  "create_rag_answer_draft",
  "view_alerts",
  "check_unreplied_alerts",
  "notify_open_alerts"
]);
const staffAllowedActions = new Set<AdminAction>([
  "view_customers",
  "view_customer_detail",
  "view_timeline",
  "send_staff_reply",
  "create_ai_reply_draft",
  "search_rag",
  "create_rag_answer_draft",
  "view_alerts"
]);

const rolePermissionMatrix: Record<AdminRole, ReadonlySet<AdminAction>> = {
  owner: ownerAllowedActions,
  manager: managerAllowedActions,
  staff: staffAllowedActions
};

export class AdminPermissionError extends Error {
  readonly code = "permission_denied";
  readonly decision: Extract<AdminPermissionDecision, { allowed: false }>;

  constructor(decision: Extract<AdminPermissionDecision, { allowed: false }>) {
    super(`Admin permission denied: ${decision.reason}`);
    this.name = "AdminPermissionError";
    this.decision = decision;
  }
}

export function isAdminRole(role: string): role is AdminRole {
  return (adminRoles as readonly string[]).includes(role);
}

export function isAdminAction(action: string): action is AdminAction {
  return (adminActions as readonly string[]).includes(action);
}

export function evaluateAdminPermission(input: {
  role: string;
  action: string;
}): AdminPermissionDecision {
  if (!isAdminRole(input.role)) {
    return {
      allowed: false,
      reason: "unknown_role",
      role: input.role,
      action: input.action
    };
  }

  if (!isAdminAction(input.action)) {
    return {
      allowed: false,
      reason: "unknown_action",
      role: input.role,
      action: input.action
    };
  }

  if (!rolePermissionMatrix[input.role].has(input.action)) {
    return {
      allowed: false,
      reason: "role_not_allowed",
      role: input.role,
      action: input.action
    };
  }

  return {
    allowed: true,
    role: input.role,
    action: input.action
  };
}

export function canPerformAdminAction(role: string, action: string): boolean {
  return evaluateAdminPermission({ role, action }).allowed;
}

export function requireAdminPermission(input: {
  role: string;
  action: string;
}): Extract<AdminPermissionDecision, { allowed: true }> {
  const decision = evaluateAdminPermission(input);

  if (!decision.allowed) {
    throw new AdminPermissionError(decision);
  }

  return decision;
}
