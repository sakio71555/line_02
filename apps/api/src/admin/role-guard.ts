import {
  evaluateAdminPermission,
  type AdminAction,
  type AdminPermissionDecision,
  type StaffRole
} from "@amami-line-crm/domain";

import type { AdminAuthError } from "./auth-error-response";
import type { AdminTenantContext } from "./tenant-context";

export type AuthenticatedStaffRoleGuardContext = AdminTenantContext & {
  source: "authenticated_staff";
  role: StaffRole;
};

export interface AdminRoleGuardInput {
  context: AdminTenantContext;
  action: AdminAction;
}

export interface AdminRoleGuardSuccess {
  ok: true;
  context: AuthenticatedStaffRoleGuardContext;
  action: AdminAction;
}

export interface AdminRoleGuardFailure {
  ok: false;
  error: AdminAuthError;
  permission?: Extract<AdminPermissionDecision, { allowed: false }>;
}

export type AdminRoleGuardResult = AdminRoleGuardSuccess | AdminRoleGuardFailure;

export class AdminRoleGuardError extends Error {
  readonly error: AdminAuthError;
  readonly result: AdminRoleGuardFailure;

  constructor(result: AdminRoleGuardFailure) {
    super(`Admin role guard failed: ${result.error.code}`);
    this.name = "AdminRoleGuardError";
    this.error = result.error;
    this.result = result;
  }
}

export function evaluateAdminRoleGuard(input: AdminRoleGuardInput): AdminRoleGuardResult {
  if (!isAuthenticatedStaffRoleGuardContext(input.context)) {
    return {
      ok: false,
      error: { code: "authenticated_staff_required" }
    };
  }

  const permission = evaluateAdminPermission({
    role: input.context.role,
    action: input.action
  });

  if (!permission.allowed) {
    return {
      ok: false,
      error: { code: "permission_denied" },
      permission
    };
  }

  return {
    ok: true,
    context: input.context,
    action: input.action
  };
}

export function requireAdminRole(input: AdminRoleGuardInput): AdminRoleGuardSuccess {
  const result = evaluateAdminRoleGuard(input);

  if (!result.ok) {
    throw new AdminRoleGuardError(result);
  }

  return result;
}

export function mapAdminRoleGuardFailureToAuthError(
  failure: AdminRoleGuardFailure
): AdminAuthError {
  return failure.error;
}

function isAuthenticatedStaffRoleGuardContext(
  context: AdminTenantContext
): context is AuthenticatedStaffRoleGuardContext {
  return context.source === "authenticated_staff" && typeof context.role === "string";
}
