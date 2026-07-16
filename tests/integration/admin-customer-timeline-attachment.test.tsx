import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CustomerTimelineList } from "../../apps/admin/app/customers/[customerId]/customer-timeline-list";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("admin customer timeline private attachments", () => {
  it("shows an authenticated attachment action without rendering the private storage path", () => {
    const html = renderToStaticMarkup(
      <CustomerTimelineList
        customerId="customer_001"
        messages={[
          {
            id: "message_001",
            tenant_id: "tenant_amamihome",
            customer_id: "customer_001",
            role: "customer",
            message_type: "image",
            body: null,
            source_url: null,
            attachment_available: true,
            created_at: "2026-07-16T00:00:00.000Z"
          }
        ]}
      />
    );

    expect(html).toContain("画像を表示");
    expect(html).not.toContain("tenant_amamihome/customer_001");
    expect(html).not.toContain("line-message-attachments");
  });

  it("keeps non-private reference URLs available", () => {
    const html = renderToStaticMarkup(
      <CustomerTimelineList
        customerId="customer_001"
        messages={[
          {
            id: "message_002",
            tenant_id: "tenant_amamihome",
            customer_id: "customer_001",
            role: "customer",
            message_type: "text",
            body: "案内URL",
            source_url: "https://example.invalid/reference",
            attachment_available: false,
            created_at: "2026-07-16T00:01:00.000Z"
          }
        ]}
      />
    );

    expect(html).toContain("https://example.invalid/reference");
    expect(html).toContain("参考URL");
  });
});
