import type { StaffAuthLookup, StaffTenantMembership, StaffUser } from "@amami-line-crm/domain";

import type { SupabaseRepositoryClient } from "./customer-repository";
import { unwrapSupabaseResult, type SupabaseRepositoryResult } from "./errors";

interface SupabaseStaffUserRow {
  id: string;
  tenant_id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  role: StaffUser["role"];
  status: StaffUser["status"];
  line_user_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  disabled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseStaffTenantMembershipRow {
  id: string;
  tenant_id: string;
  staff_user_id: string;
  role: StaffTenantMembership["role"];
  status: StaffTenantMembership["status"];
  invited_at: string | null;
  accepted_at: string | null;
  disabled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseStaffAuthLookupRepository implements StaffAuthLookup {
  constructor(private readonly client: SupabaseRepositoryClient) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    const normalizedAuthUserId = authUserId.trim();

    if (!normalizedAuthUserId) {
      return null;
    }

    const result = (await this.client
      .from("staff_users")
      .select("*")
      .eq("auth_user_id", normalizedAuthUserId)
      .maybeSingle()) as SupabaseRepositoryResult<SupabaseStaffUserRow>;
    const row = unwrapSupabaseResult(result, "staff_users", "findStaffByAuthUserId");

    return row && row.auth_user_id === normalizedAuthUserId ? toStaffUser(row) : null;
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    const normalizedStaffUserId = staffUserId.trim();

    if (!normalizedStaffUserId) {
      return [];
    }

    const result = (await this.client
      .from("staff_tenant_memberships")
      .select("*")
      .eq("staff_user_id", normalizedStaffUserId)
      .order("created_at", { ascending: true })) as SupabaseRepositoryResult<
      SupabaseStaffTenantMembershipRow[]
    >;
    const rows = unwrapSupabaseResult(
      result,
      "staff_tenant_memberships",
      "listMembershipsByStaffUserId"
    );

    return (rows ?? [])
      .filter((row) => row.staff_user_id === normalizedStaffUserId)
      .sort(compareMembershipRowsByCreatedAtAsc)
      .map(toStaffTenantMembership);
  }

  async activateInvitedMembershipsForStaffUserId(staffUserId: string): Promise<void> {
    const normalizedStaffUserId = staffUserId.trim();
    if (!normalizedStaffUserId) {
      return;
    }

    const result = (await this.client.rpc("activate_staff_invited_memberships", {
      target_staff_user_id: normalizedStaffUserId
    })) as SupabaseRepositoryResult<number>;
    unwrapSupabaseResult(
      result,
      "activate_staff_invited_memberships",
      "activateInvitedMembershipsForStaffUserId"
    );
  }
}

function toStaffUser(row: SupabaseStaffUserRow): StaffUser {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    auth_user_id: row.auth_user_id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    status: row.status,
    line_user_id: row.line_user_id,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    disabled_at: row.disabled_at,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function toStaffTenantMembership(
  row: SupabaseStaffTenantMembershipRow
): StaffTenantMembership {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    staff_user_id: row.staff_user_id,
    role: row.role,
    status: row.status,
    invited_at: row.invited_at,
    accepted_at: row.accepted_at,
    disabled_at: row.disabled_at,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function compareMembershipRowsByCreatedAtAsc(
  a: SupabaseStaffTenantMembershipRow,
  b: SupabaseStaffTenantMembershipRow
): number {
  return a.created_at.localeCompare(b.created_at);
}
