import { describe, expect, it, vi } from "vitest";

import {
  AdminPermissionError,
  adminActions,
  canPerformAdminAction,
  evaluateAdminPermission,
  requireAdminPermission,
  roleGuardedAdminActions,
  type AdminAction
} from "@amami-line-crm/domain";

describe("admin role permission boundary", () => {
  it("exports the boundary without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("@amami-line-crm/domain")).resolves.toHaveProperty(
      "evaluateAdminPermission"
    );

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("allows owner to perform every role-guarded admin action", () => {
    for (const action of roleGuardedAdminActions) {
      expect(evaluateAdminPermission({ role: "owner", action })).toEqual({
        allowed: true,
        role: "owner",
        action
      });
    }
  });

  it("allows manager to perform customer AI RAG and alert operations", () => {
    const allowedActions: AdminAction[] = [
      "view_customers",
      "view_customer_detail",
      "view_timeline",
      "manage_customers",
      "send_broadcast",
      "send_staff_reply",
      "create_ai_summary",
      "create_ai_reply_draft",
      "search_rag",
      "create_rag_answer_draft",
      "view_alerts",
      "check_unreplied_alerts",
      "notify_open_alerts"
    ];

    for (const action of allowedActions) {
      expect(canPerformAdminAction("manager", action)).toBe(true);
    }
  });

  it("denies manager staff management tenant settings and knowledge management", () => {
    const deniedActions: AdminAction[] = [
      "manage_staff",
      "manage_tenant_settings",
      "manage_knowledge"
    ];

    for (const action of deniedActions) {
      expect(evaluateAdminPermission({ role: "manager", action })).toEqual({
        allowed: false,
        reason: "role_not_allowed",
        role: "manager",
        action
      });
    }
  });

  it("allows staff to perform day-to-day customer support actions", () => {
    const allowedActions: AdminAction[] = [
      "view_customers",
      "view_customer_detail",
      "view_timeline",
      "send_staff_reply",
      "create_ai_reply_draft",
      "search_rag",
      "create_rag_answer_draft",
      "view_alerts"
    ];

    for (const action of allowedActions) {
      expect(canPerformAdminAction("staff", action)).toBe(true);
    }
  });

  it("denies staff persistent AI summary alert operations and settings", () => {
    const deniedActions: AdminAction[] = [
      "create_ai_summary",
      "check_unreplied_alerts",
      "notify_open_alerts",
      "manage_customers",
      "send_broadcast",
      "manage_knowledge",
      "manage_staff",
      "manage_tenant_settings"
    ];

    for (const action of deniedActions) {
      expect(evaluateAdminPermission({ role: "staff", action })).toEqual({
        allowed: false,
        reason: "role_not_allowed",
        role: "staff",
        action
      });
    }
  });

  it("keeps dev seed out of role-granted production actions", () => {
    expect(adminActions).toContain("run_dev_seed");
    expect(roleGuardedAdminActions).not.toContain("run_dev_seed");

    for (const role of ["owner", "manager", "staff"]) {
      expect(evaluateAdminPermission({ role, action: "run_dev_seed" })).toEqual({
        allowed: false,
        reason: "role_not_allowed",
        role,
        action: "run_dev_seed"
      });
    }
  });

  it("rejects unknown action and unknown role by default", () => {
    expect(evaluateAdminPermission({ role: "owner", action: "delete_everything" })).toEqual({
      allowed: false,
      reason: "unknown_action",
      role: "owner",
      action: "delete_everything"
    });
    expect(evaluateAdminPermission({ role: "viewer", action: "view_customers" })).toEqual({
      allowed: false,
      reason: "unknown_role",
      role: "viewer",
      action: "view_customers"
    });
    expect(canPerformAdminAction("platform_admin", "view_customers")).toBe(false);
  });

  it("returns and throws results that can map to permission_denied later", () => {
    const denied = evaluateAdminPermission({
      role: "staff",
      action: "notify_open_alerts"
    });

    expect(denied).toEqual({
      allowed: false,
      reason: "role_not_allowed",
      role: "staff",
      action: "notify_open_alerts"
    });
    expect(() =>
      requireAdminPermission({
        role: "staff",
        action: "notify_open_alerts"
      })
    ).toThrow(AdminPermissionError);

    try {
      requireAdminPermission({
        role: "staff",
        action: "notify_open_alerts"
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AdminPermissionError);
      if (error instanceof AdminPermissionError) {
        expect(error.code).toBe("permission_denied");
        expect(error.decision).toEqual(denied);
      }
    }
  });
});
