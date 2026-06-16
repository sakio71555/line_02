import type { AdminAction, AuthUserIdentity, StaffAuthLookup } from "@amami-line-crm/domain";

import {
  extractAdminAuthSession,
  mapAuthSessionErrorToAdminAuthError,
  type AuthSessionVerifier
} from "./auth-session";
import {
  resolveAuthenticatedStaffAdminTenantContext,
  type AuthenticatedStaffAdminTenantContext
} from "./authenticated-staff-tenant-context";
import type { AdminAuthError } from "./auth-error-response";
import {
  evaluateAdminRoleGuard,
  mapAdminRoleGuardFailureToAuthError,
  type AdminRoleGuardFailure
} from "./role-guard";
import { normalizeSelectedTenantId } from "./selected-tenant-transport";

export interface AuthenticatedAdminRuntimeInput {
  authorizationHeader?: string | null;
  selectedTenantId?: string | null;
  action?: AdminAction;
}

export interface AuthenticatedAdminRuntimeDependencies {
  sessionVerifier: AuthSessionVerifier;
  staffAuthLookup: StaffAuthLookup;
}

export type AuthenticatedAdminRuntimeResult =
  | {
      ok: true;
      tenantId: string;
      context: AuthenticatedStaffAdminTenantContext;
      action?: AdminAction;
    }
  | {
      ok: false;
      error: AdminAuthError;
      permission?: AdminRoleGuardFailure["permission"];
    };

export async function resolveAuthenticatedAdminRuntimeContext(
  input: AuthenticatedAdminRuntimeInput,
  dependencies: AuthenticatedAdminRuntimeDependencies
): Promise<AuthenticatedAdminRuntimeResult> {
  const session = await extractAdminAuthSession({
    authorizationHeader: input.authorizationHeader,
    verifier: dependencies.sessionVerifier
  });

  if (!session.ok) {
    return {
      ok: false,
      error: mapAuthSessionErrorToAdminAuthError(session.error)
    };
  }

  const selectedTenant = normalizeSelectedTenantId(input.selectedTenantId);

  if (!selectedTenant.ok) {
    return {
      ok: false,
      error: selectedTenant.error
    };
  }

  const tenantContext = await resolveAuthenticatedStaffAdminTenantContext(
    createAuthenticatedStaffTenantContextInput(session.authUser, selectedTenant.selectedTenantId),
    dependencies.staffAuthLookup
  );

  if (!tenantContext.ok) {
    return {
      ok: false,
      error: tenantContext.error
    };
  }

  if (input.action === undefined) {
    return {
      ok: true,
      tenantId: tenantContext.tenantId,
      context: tenantContext.context
    };
  }

  const roleGuard = evaluateAdminRoleGuard({
    context: tenantContext.context,
    action: input.action
  });

  if (!roleGuard.ok) {
    return roleGuardFailure(roleGuard);
  }

  return {
    ok: true,
    tenantId: tenantContext.tenantId,
    context: tenantContext.context,
    action: roleGuard.action
  };
}

function createAuthenticatedStaffTenantContextInput(
  authUser: AuthUserIdentity,
  selectedTenantId: string | null | undefined
): Parameters<typeof resolveAuthenticatedStaffAdminTenantContext>[0] {
  if (selectedTenantId === undefined) {
    return { authUser };
  }

  return {
    authUser,
    selectedTenantId
  };
}

function roleGuardFailure(failure: AdminRoleGuardFailure): AuthenticatedAdminRuntimeResult {
  if (failure.permission) {
    return {
      ok: false,
      error: mapAdminRoleGuardFailureToAuthError(failure),
      permission: failure.permission
    };
  }

  return {
    ok: false,
    error: mapAdminRoleGuardFailureToAuthError(failure)
  };
}
