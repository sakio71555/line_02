import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  adminActions,
  adminRoles,
  canPerformAdminAction,
  evaluateAdminPermission
} from "@amami-line-crm/domain";

import { RoleVisibilityNote } from "../../apps/admin/app/role-visibility-note";
import {
  adminUiOperations,
  adminUiRoleVisibilityFixtures,
  adminUiRoleVisibilityRows,
  adminUiVisibilityStates
} from "../fixtures/admin-ui-role-visibility";

describe("admin UI role visibility fixtures", () => {
  it("defines UI operations and maps each operation to a known AdminAction", () => {
    expect(adminUiOperations).toEqual([
      "view_customers_page",
      "view_customer_detail_page",
      "view_timeline",
      "use_staff_reply_form",
      "use_ai_summary_button",
      "use_ai_reply_draft_button",
      "use_rag_answer_form",
      "view_alerts_page",
      "use_check_unreplied_button",
      "use_notify_open_alerts_button"
    ]);

    for (const fixture of adminUiRoleVisibilityFixtures) {
      expect(adminUiOperations).toContain(fixture.operation);
      expect(adminActions).toContain(fixture.action);
      expect(fixture.action).not.toBe("run_dev_seed");
    }
  });

  it("covers owner manager and staff expectations for every current role-controlled UI operation", () => {
    expect(adminUiRoleVisibilityFixtures).toHaveLength(adminUiOperations.length);

    for (const fixture of adminUiRoleVisibilityFixtures) {
      expect(Object.keys(fixture.expectations).sort()).toEqual([...adminRoles].sort());

      for (const role of adminRoles) {
        expect(adminUiVisibilityStates).toContain(fixture.expectations[role]);
      }
    }
  });

  it("keeps expected visibility consistent with the domain permission boundary", () => {
    for (const row of adminUiRoleVisibilityRows) {
      const decision = evaluateAdminPermission({
        role: row.role,
        action: row.action
      });

      if (row.expectedVisibility === "visible_enabled") {
        expect(decision, `${row.role} ${row.operation}`).toEqual({
          allowed: true,
          role: row.role,
          action: row.action
        });
      } else {
        expect(decision, `${row.role} ${row.operation}`).toEqual({
          allowed: false,
          reason: "role_not_allowed",
          role: row.role,
          action: row.action
        });
      }
    }
  });

  it("sets staff restricted operations to visible_disabled for first UI rollout", () => {
    const staffRows = adminUiRoleVisibilityRows.filter((row) => row.role === "staff");

    expect(
      staffRows
        .filter((row) => row.expectedVisibility === "visible_disabled")
        .map((row) => row.operation)
        .sort()
    ).toEqual([
      "use_ai_summary_button",
      "use_check_unreplied_button",
      "use_notify_open_alerts_button"
    ]);

    expect(canPerformAdminAction("staff", "create_ai_summary")).toBe(false);
    expect(canPerformAdminAction("staff", "check_unreplied_alerts")).toBe(false);
    expect(canPerformAdminAction("staff", "notify_open_alerts")).toBe(false);
  });

  it("keeps staff support actions visible_enabled where the permission boundary allows them", () => {
    const staffEnabledOperations = adminUiRoleVisibilityRows
      .filter((row) => row.role === "staff" && row.expectedVisibility === "visible_enabled")
      .map((row) => row.operation)
      .sort();

    expect(staffEnabledOperations).toEqual([
      "use_ai_reply_draft_button",
      "use_rag_answer_form",
      "use_staff_reply_form",
      "view_alerts_page",
      "view_customer_detail_page",
      "view_customers_page",
      "view_timeline"
    ]);
  });

  it("keeps manager alert operations visible_enabled", () => {
    const managerAlertOperations = adminUiRoleVisibilityRows.filter(
      (row) =>
        row.role === "manager" &&
        ["view_alerts_page", "use_check_unreplied_button", "use_notify_open_alerts_button"].includes(
          row.operation
        )
    );

    expect(managerAlertOperations).toHaveLength(3);
    for (const row of managerAlertOperations) {
      expect(row.expectedVisibility).toBe("visible_enabled");
      expect(canPerformAdminAction(row.role, row.action)).toBe(true);
    }
  });

  it("does not include dev seed unknown role or placeholder-only auth pages as role visibility fixtures", () => {
    expect(adminUiRoleVisibilityFixtures.map((fixture) => fixture.action)).not.toContain(
      "run_dev_seed"
    );
    expect(adminUiOperations).not.toContain("view_auth_placeholder_pages");

    expect(evaluateAdminPermission({ role: "viewer", action: "view_customers" })).toEqual({
      allowed: false,
      reason: "unknown_role",
      role: "viewer",
      action: "view_customers"
    });
  });

  it("keeps RoleVisibilityNote guidance aligned with the fixture expectations without enforcement", () => {
    const customerActionsHtml = renderToStaticMarkup(
      React.createElement(RoleVisibilityNote, { variant: "customer-actions" })
    );
    const alertsHtml = renderToStaticMarkup(
      React.createElement(RoleVisibilityNote, { variant: "alerts" })
    );

    expect(customerActionsHtml).toContain("担当者操作の確認範囲");
    expect(customerActionsHtml).toContain("管理者、チーム管理者、担当者");
    expect(customerActionsHtml).toContain("相談内容のまとめ");
    expect(customerActionsHtml).toContain("返信文の下書き");
    expect(customerActionsHtml).toContain("ホームページ情報からの回答案");
    expect(customerActionsHtml).toContain("LINE実送信はruntime gate");
    expect(alertsHtml).toContain("未返信チェックと通知記録");
    expect(alertsHtml).toContain("担当者は対応が必要な相談の確認から始めます");
    expect(alertsHtml).toContain("外部通知や一斉送信は、この画面から自動実行しません");
  });
});
