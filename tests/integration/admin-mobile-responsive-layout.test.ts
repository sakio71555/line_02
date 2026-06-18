import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "apps/admin/app/globals.css"), "utf8");

describe("admin mobile responsive layout styles", () => {
  it("keeps mobile-first shell and touch target safeguards", () => {
    expect(css).toContain("--admin-bottom-nav-height");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain(".admin-bottom-nav");
    expect(css).toContain(".admin-bottom-nav-link");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("@media (min-width: 768px)");
  });

  it("uses card and timeline layouts instead of mobile-hostile tables for main admin screens", () => {
    expect(css).toContain(".customer-card-list");
    expect(css).toContain(".alert-card-list");
    expect(css).toContain(".timeline-list");
    expect(css).toContain(".timeline-item-customer");
    expect(css).toContain(".timeline-item-staff");
    expect(css).toContain(".ai-assist-details");
    expect(css).toContain(".staff-reply-panel");
  });
});
