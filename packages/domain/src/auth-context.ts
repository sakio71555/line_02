import type { StaffTenantMembership, StaffUser } from "./index";

export interface AuthUserIdentity {
  authUserId: string;
  email?: string | null;
}

export interface TenantContextResolutionInput extends AuthUserIdentity {
  selectedTenantId?: string | null;
}

export interface ResolvedTenantContext {
  tenantId: string;
  staffUserId: string;
  authUserId: string;
  role: StaffTenantMembership["role"];
  source: "authenticated_staff";
}

export type AuthContextErrorCode =
  | "missing_auth_user"
  | "staff_not_found"
  | "staff_inactive"
  | "membership_not_found"
  | "tenant_selection_required"
  | "tenant_membership_denied";

export interface AuthContextError {
  code: AuthContextErrorCode;
}

export type TenantContextResolutionResult =
  | { ok: true; context: ResolvedTenantContext }
  | { ok: false; error: AuthContextError };

export interface StaffAuthLookup {
  findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null>;
  listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]>;
}

export async function resolveAuthenticatedTenantContext(
  input: TenantContextResolutionInput,
  lookup: StaffAuthLookup
): Promise<TenantContextResolutionResult> {
  const authUserId = input.authUserId.trim();

  if (!authUserId) {
    return authContextFailure("missing_auth_user");
  }

  const staff = await lookup.findStaffByAuthUserId(authUserId);

  if (!staff || staff.auth_user_id !== authUserId) {
    return authContextFailure("staff_not_found");
  }

  if (staff.status !== "active" || !staff.is_active) {
    return authContextFailure("staff_inactive");
  }

  const memberships = await lookup.listMembershipsByStaffUserId(staff.id);
  const activeMemberships = memberships.filter(
    (membership) => membership.staff_user_id === staff.id && membership.status === "active"
  );

  if (activeMemberships.length === 0) {
    return authContextFailure("membership_not_found");
  }

  const selectedTenantId = input.selectedTenantId?.trim() || null;
  const selectedMembership =
    selectedTenantId === null
      ? resolveDefaultMembership(activeMemberships)
      : activeMemberships.find((membership) => membership.tenant_id === selectedTenantId);

  if (selectedTenantId === null && selectedMembership === null) {
    return authContextFailure("tenant_selection_required");
  }

  if (!selectedMembership) {
    return authContextFailure("tenant_membership_denied");
  }

  return {
    ok: true,
    context: {
      tenantId: selectedMembership.tenant_id,
      staffUserId: staff.id,
      authUserId,
      role: selectedMembership.role,
      source: "authenticated_staff"
    }
  };
}

function resolveDefaultMembership(
  activeMemberships: StaffTenantMembership[]
): StaffTenantMembership | null {
  if (activeMemberships.length === 1) {
    return activeMemberships[0] ?? null;
  }

  return null;
}

function authContextFailure(code: AuthContextErrorCode): TenantContextResolutionResult {
  return {
    ok: false,
    error: { code }
  };
}
