import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CustomersPageView } from "../../apps/admin/app/customers/customers-page-view";
import type { AdminCustomerListItem } from "../../apps/admin/src/admin-api";

describe("admin customers mobile cards", () => {
  it("renders customers as beginner-friendly cards with the latest message", () => {
    const html = renderToStaticMarkup(
      <CustomersPageView
        config={{
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome",
          selectedTenantId: "tenant_amamihome"
        }}
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

    expect(html).toContain("相談中のお客様");
    expect(html).toContain("顧客一覧カード");
    expect(html).toContain("山田 太郎");
    expect(html).toContain("平屋とモデルホーム見学について相談したいです");
    expect(html).toContain("担当者の確認が必要");
    expect(html).toContain("担当者返信待ち");
    expect(html).toContain("詳細を見る");
    expect(html).toContain("href=\"/customers/customer_demo_yamada_taro\"");
  });

  it("renders an empty state that points to demo seed", () => {
    const html = renderToStaticMarkup(
      <CustomersPageView
        config={{
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        }}
        result={{ status: "ok", customers: [] }}
      />
    );

    expect(html).toContain("まだ顧客データがありません");
    expect(html).toContain("demo seedをもう一度投入してください");
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
