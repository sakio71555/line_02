import { describe, expect, it } from "vitest";

import type { AdminStaffMember } from "@amami-line-crm/domain";

import { getStaffMemberDisplayState } from "../../apps/admin/src/staff-management-display";

describe("admin staff management display state", () => {
  it("shows authenticated accepted members as active", () => {
    expect(getStaffMemberDisplayState(createMember())).toBe("active");
  });

  it("shows unaccepted or unlinked members as invited", () => {
    expect(
      getStaffMemberDisplayState(
        createMember({ auth_linked: false, membership_status: "invited" })
      )
    ).toBe("invited");
    expect(getStaffMemberDisplayState(createMember({ accepted_at: null }))).toBe("invited");
  });

  it("shows a disabled membership as disabled", () => {
    expect(getStaffMemberDisplayState(createMember({ membership_status: "disabled" }))).toBe(
      "disabled"
    );
  });

  it("keeps archived state distinct from a reversible disable", () => {
    expect(
      getStaffMemberDisplayState({
        ...createMember({ status: "disabled", membership_status: "disabled" }),
        status: "archived"
      })
    ).toBe("archived");
    expect(getStaffMemberDisplayState(createMember({ membership_status: "archived" }))).toBe(
      "archived"
    );
  });
});

function createMember(overrides: Partial<AdminStaffMember> = {}): AdminStaffMember {
  return {
    id: "staff_1",
    tenant_id: "tenant_amamihome",
    email: "staff@example.test",
    display_name: "担当者",
    role: "staff",
    status: "active",
    membership_status: "active",
    auth_linked: true,
    line_linked: false,
    last_login_at: null,
    invited_at: "2026-07-18T02:00:00.000Z",
    accepted_at: "2026-07-18T02:00:00.000Z",
    created_at: "2026-07-18T02:00:00.000Z",
    updated_at: "2026-07-18T02:00:00.000Z",
    ...overrides
  };
}
