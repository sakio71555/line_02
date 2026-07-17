import type { AdminAction } from "@amami-line-crm/domain";

import {
  mapAdminAuthErrorToHttp,
  type AdminAuthErrorHttpResponse
} from "./auth-error-response";
import {
  evaluateAdminRoleGuard,
  mapAdminRoleGuardFailureToAuthError,
  type AuthenticatedStaffRoleGuardContext
} from "./role-guard";
import type { AdminTenantContext } from "./tenant-context";

export const adminRouteActions = {
  listCustomers: "view_customers",
  getCustomerDetail: "view_customer_detail",
  archiveCustomer: "manage_customers",
  restoreCustomer: "manage_customers",
  getCustomerTimeline: "view_timeline",
  createAiSummary: "create_ai_summary",
  createAiReplyDraft: "create_ai_reply_draft",
  searchRag: "search_rag",
  createRagAnswerDraft: "create_rag_answer_draft",
  sendStaffReply: "send_staff_reply",
  previewBroadcast: "send_broadcast",
  sendBroadcast: "send_broadcast",
  listAlerts: "view_alerts",
  checkUnrepliedAlerts: "check_unreplied_alerts",
  notifyOpenAlerts: "notify_open_alerts"
} as const satisfies Record<string, AdminAction>;

export interface AdminRoleGuardedHandlerInput<TBody> {
  context: AdminTenantContext;
  action: AdminAction;
  handler: (context: AuthenticatedStaffRoleGuardContext) => TBody | Promise<TBody>;
}

export type AdminRoleGuardedHandlerResult<TBody> =
  | {
      ok: true;
      status: 200;
      body: TBody;
      action: AdminAction;
      context: AuthenticatedStaffRoleGuardContext;
    }
  | {
      ok: false;
      status: AdminAuthErrorHttpResponse["status"];
      body: AdminAuthErrorHttpResponse["body"];
      placeholderRoute: AdminAuthErrorHttpResponse["placeholderRoute"];
    };

export interface AdminRouteRoleGuardCompatibilityInput {
  context: AdminTenantContext;
  action: AdminAction;
}

export type AdminRouteRoleGuardCompatibilityResult =
  | {
      ok: true;
      action: AdminAction;
      context: AdminTenantContext;
      mode: "skipped_dev_header" | "enforced_authenticated_staff";
    }
  | {
      ok: false;
      status: AdminAuthErrorHttpResponse["status"];
      body: AdminAuthErrorHttpResponse["body"];
      placeholderRoute: AdminAuthErrorHttpResponse["placeholderRoute"];
    };

export async function runRoleGuardedAdminHandler<TBody>(
  input: AdminRoleGuardedHandlerInput<TBody>
): Promise<AdminRoleGuardedHandlerResult<TBody>> {
  const guard = evaluateAdminRoleGuard({
    context: input.context,
    action: input.action
  });

  if (!guard.ok) {
    const response = mapAdminAuthErrorToHttp(mapAdminRoleGuardFailureToAuthError(guard));

    return {
      ok: false,
      status: response.status,
      body: response.body,
      placeholderRoute: response.placeholderRoute
    };
  }

  const body = await input.handler(guard.context);

  return {
    ok: true,
    status: 200,
    body,
    action: guard.action,
    context: guard.context
  };
}

export function evaluateAdminRouteRoleGuardCompatibility(
  input: AdminRouteRoleGuardCompatibilityInput
): AdminRouteRoleGuardCompatibilityResult {
  if (input.context.source === "dev_header") {
    return {
      ok: true,
      action: input.action,
      context: input.context,
      mode: "skipped_dev_header"
    };
  }

  const guard = evaluateAdminRoleGuard({
    context: input.context,
    action: input.action
  });

  if (!guard.ok) {
    const response = mapAdminAuthErrorToHttp(mapAdminRoleGuardFailureToAuthError(guard));

    return {
      ok: false,
      status: response.status,
      body: response.body,
      placeholderRoute: response.placeholderRoute
    };
  }

  return {
    ok: true,
    action: guard.action,
    context: guard.context,
    mode: "enforced_authenticated_staff"
  };
}
