import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AlertActionPanelView } from "../../apps/admin/app/alerts/alert-actions";
import {
  AlertsPageView,
  formatAlertSeverity,
  formatAlertStatus,
  formatAlertType
} from "../../apps/admin/app/alerts/alerts-page-view";
import type { AdminAlertListItem } from "../../apps/admin/src/admin-api";

describe("admin alerts page", () => {
  it("renders production alerts page guidance and status labels", () => {
    const html = renderToStaticMarkup(
      <AlertsPageView
        alerts={{
          status: "ok",
          alerts: [
            createAlert({
              status: "open",
              severity: "high",
              notified_at: null
            }),
            createAlert({
              id: "alert_notified",
              status: "notified",
              severity: "critical",
              notified_at: "2026-06-15T10:30:00.000Z"
            })
          ]
        }}
        actionPanel={createActionPanelView()}
      />
    );

    expect(html).toContain("受信トレイ");
    expect(html).toContain("1件の相談が対応を待っています");
    expect(html).toContain("受信状況を更新");
    expect(html).toContain("未対応");
    expect(html).toContain("確認済み");
    expect(html).toContain("未対応カード");
    expect(html).toContain("未返信の相談");
    expect(html).toContain("href=\"/customers/customer_demo_yamada_taro\"");
    expect(html).toContain("お客様ページを開く");
  });

  it("renders an empty state that points to the first action", () => {
    const html = renderToStaticMarkup(
      <AlertsPageView
        alerts={{ status: "ok", alerts: [] }}
        actionPanel={createActionPanelView()}
      />
    );

    expect(html).toContain("まだ対応が必要な相談はありません");
    expect(html).toContain("新しい相談が入ると、自動でここに表示されます");
  });

  it("renders beginner-friendly action cards without changing action wiring", () => {
    const noopAction = () => {};
    const html = renderToStaticMarkup(
      <AlertActionPanelView
        checkPending={false}
        checkState={{ status: "idle" }}
        notifyPending={false}
        notifyState={{ status: "idle" }}
        runCheck={noopAction}
        runNotify={noopAction}
      />
    );

    expect(html).toContain("未対応を確認する");
    expect(html).toContain("1つ目のボタンで返せていない相談を探します");
    expect(html).toContain("返せていない相談を探す");
    expect(html).toContain("手動確認");
    expect(html).toContain("未対応を整理");
    expect(html).toContain("確認済みにする");
    expect(html).toContain("確認記録");
    expect(html).toContain("未対応確認の使い方");
    expect(html).toContain("一斉送信や自動送信をする画面ではありません");
  });

  it("formats alert status severity and type labels", () => {
    expect(formatAlertStatus("open")).toBe("未対応");
    expect(formatAlertStatus("notified")).toBe("確認済み");
    expect(formatAlertStatus("resolved")).toBe("対応済み");
    expect(formatAlertStatus("dismissed")).toBe("非表示");
    expect(formatAlertSeverity("low")).toBe("低");
    expect(formatAlertSeverity("medium")).toBe("通常");
    expect(formatAlertSeverity("high")).toBe("高");
    expect(formatAlertSeverity("critical")).toBe("至急");
    expect(formatAlertType("unreplied_customer_message")).toBe("未返信の相談");
  });
});

function createAlert(overrides: Partial<AdminAlertListItem> = {}): AdminAlertListItem {
  return {
    id: "alert_open",
    tenant_id: "tenant_amamihome",
    customer_id: "customer_demo_yamada_taro",
    type: "unreplied_customer_message",
    severity: "medium",
    status: "open",
    message: "未返信の相談があります",
    notified_at: null,
    resolved_at: null,
    created_at: "2026-06-15T10:00:00.000Z",
    ...overrides
  };
}

function createActionPanelView(): React.ReactNode {
  const noopAction = () => {};

  return (
    <AlertActionPanelView
      checkPending={false}
      checkState={{ status: "idle" }}
      notifyPending={false}
      notifyState={{ status: "idle" }}
      runCheck={noopAction}
      runNotify={noopAction}
    />
  );
}
