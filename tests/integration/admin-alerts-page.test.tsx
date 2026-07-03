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
        config={{
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        }}
        actionPanel={createActionPanelView()}
      />
    );

    expect(html).toContain("対応が必要な相談を確認する");
    expect(html).toContain("未返信のままになっている相談を見つけます");
    expect(html).toContain("未返信チェックを実行する");
    expect(html).toContain("本番運用確認");
    expect(html).toContain("手動チェック");
    expect(html).toContain("外部通知なし");
    expect(html).toContain("手動実行");
    expect(html).toContain("通知記録");
    expect(html).toContain("状態の見方");
    expect(html).toContain("対応待ち");
    expect(html).toContain("通知記録済み");
    expect(html).toContain("未返信アラート一覧");
    expect(html).toContain("アラートカード");
    expect(html).toContain("未返信の相談");
    expect(html).toContain("href=\"/customers/customer_demo_yamada_taro\"");
    expect(html).toContain("お客様詳細を見る");
    expect(html).toContain("LINE、Slack、メールへの外部通知はこの画面から自動送信しません");
  });

  it("renders an empty state that points to the first action", () => {
    const html = renderToStaticMarkup(
      <AlertsPageView
        alerts={{ status: "ok", alerts: [] }}
        config={{
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        }}
        actionPanel={createActionPanelView()}
      />
    );

    expect(html).toContain("まだ対応が必要な相談は表示されていません");
    expect(html).toContain("未返信チェックを実行する");
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

    expect(html).toContain("次にすること");
    expect(html).toContain("未返信チェックを実行する");
    expect(html).toContain("お客様からの相談にまだ担当者返信がないものを確認");
    expect(html).toContain("手動実行");
    expect(html).toContain("開いているアラートを通知記録済みにする");
    expect(html).toContain("LINE、Slack、メールへの外部通知は送信しません");
    expect(html).toContain("通知記録");
    expect(html).toContain("アラート操作の確認範囲");
    expect(html).toContain("外部通知や一斉送信は、この画面から自動実行しません");
  });

  it("formats alert status severity and type labels", () => {
    expect(formatAlertStatus("open")).toBe("対応待ち");
    expect(formatAlertStatus("notified")).toBe("通知記録済み");
    expect(formatAlertStatus("resolved")).toBe("対応済み");
    expect(formatAlertStatus("dismissed")).toBe("非表示");
    expect(formatAlertSeverity("low")).toBe("低");
    expect(formatAlertSeverity("medium")).toBe("中");
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
