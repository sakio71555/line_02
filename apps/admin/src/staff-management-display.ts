import type { AdminStaffMember } from "@amami-line-crm/domain";

export type StaffMemberDisplayState = "active" | "invited" | "disabled" | "archived";

export function getStaffMemberDisplayState(
  member: AdminStaffMember
): StaffMemberDisplayState {
  if (member.status === "archived" || member.membership_status === "archived") {
    return "archived";
  }

  if (member.status !== "active" || member.membership_status === "disabled") {
    return "disabled";
  }

  if (!member.auth_linked || !member.accepted_at || member.membership_status === "invited") {
    return "invited";
  }

  return "active";
}
