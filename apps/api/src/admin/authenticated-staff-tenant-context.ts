import {
  resolveAuthenticatedTenantContext,
  type AuthContextError,
  type AuthUserIdentity,
  type StaffAuthLookup,
  type StaffRole,
  type TenantContextResolutionInput
} from "@amami-line-crm/domain";

import type { AdminAuthError } from "./auth-error-response";
import type { AdminTenantContext } from "./tenant-context";

export interface AuthenticatedStaffTenantContextInput {
  authUser: AuthUserIdentity;
  selectedTenantId?: string | null;
}

export interface AuthenticatedStaffAdminTenantContext extends AdminTenantContext {
  tenantId: string;
  source: "authenticated_staff";
  staffUserId: string;
  authUserId: string;
  role: StaffRole;
}

export type AuthenticatedStaffTenantGuardResult =
  | {
      ok: true;
      tenantId: string;
      context: AuthenticatedStaffAdminTenantContext;
    }
  | {
      ok: false;
      error: AdminAuthError;
    };

export async function resolveAuthenticatedStaffAdminTenantContext(
  input: AuthenticatedStaffTenantContextInput,
  lookup: StaffAuthLookup
): Promise<AuthenticatedStaffTenantGuardResult> {
  const resolverInput: TenantContextResolutionInput = {
    authUserId: input.authUser.authUserId
  };

  if (input.authUser.email !== undefined) {
    resolverInput.email = input.authUser.email;
  }

  if (input.selectedTenantId !== undefined) {
    resolverInput.selectedTenantId = input.selectedTenantId;
  }

  const result = await resolveAuthenticatedTenantContext(resolverInput, lookup);

  if (!result.ok) {
    return {
      ok: false,
      error: mapAuthContextErrorToAdminAuthError(result.error)
    };
  }

  const context: AuthenticatedStaffAdminTenantContext = {
    tenantId: result.context.tenantId,
    source: "authenticated_staff",
    staffUserId: result.context.staffUserId,
    authUserId: result.context.authUserId,
    role: result.context.role
  };

  return {
    ok: true,
    tenantId: context.tenantId,
    context
  };
}

export function mapAuthContextErrorToAdminAuthError(error: AuthContextError): AdminAuthError {
  return {
    code: error.code
  };
}
