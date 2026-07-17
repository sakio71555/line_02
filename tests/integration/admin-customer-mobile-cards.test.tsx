import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CustomersPageView } from "../../apps/admin/app/customers/customers-page-view";
import type { AdminCustomerListItem } from "../../apps/admin/src/admin-api";

describe("admin customers mobile cards", () => {
  it("renders customers as beginner-friendly cards with the latest message", () => {
    const html = renderToStaticMarkup(
      <CustomersPageView
        result={{
          status: "ok",
          customers: [
            createCustomer({
              response_mode: "human_required",
              last_staff_reply_at: null
            })
          ]
        }}
      />
    );

    expect(html).toContain("顧客管理");
    expect(html).toContain("お客様一覧カード");
    expect(html).toContain("山田 太郎");
    expect(html).toContain("平屋とモデルホーム見学について相談したいです");
    expect(html).toContain("要対応");
    expect(html).toContain("お客様ページを開く");
    expect(html).toContain("href=\"/customers/customer_demo_yamada_taro\"");
  });

  it("renders an empty state that points to operational intake", () => {
    const html = renderToStaticMarkup(
      <CustomersPageView
        result={{ status: "ok", customers: [] }}
      />
    );

    expect(html).toContain("まだお客様が表示されていません");
    expect(html).toContain("LINEから問い合わせや登録が入ると");
  });
});

function createCustomer(overrides: Partial<AdminCustomerListItem> = {}): AdminCustomerListItem {
  return {
    id: "customer_demo_yamada_taro",
    tenant_id: "tenant_amamihome",
    line_user_id: "line_demo",
    display_name: "山田 太郎",
    name: "山田 太郎",
    response_mode: "human_active",
    status: "active",
    last_message_body: "平屋とモデルホーム見学について相談したいです",
    last_message_at: "2026-06-18T10:10:00.000Z",
    last_customer_message_at: "2026-06-18T10:10:00.000Z",
    last_staff_reply_at: "2026-06-18T10:20:00.000Z",
    created_at: "2026-06-18T10:00:00.000Z",
    updated_at: "2026-06-18T10:20:00.000Z",
    ...overrides
  };
}
