import { describe, expect, it } from "vitest";

import {
  formatAdminDateTime,
  sortTimelineMessagesNewestFirst
} from "../../apps/admin/src/customer-timeline-display";

describe("admin customer timeline display", () => {
  it("sorts timeline messages newest first without mutating the API response order", () => {
    const messages = [
      {
        id: "old",
        created_at: "2026-06-27T13:10:28.206+00:00"
      },
      {
        id: "latest",
        created_at: "2026-06-27T13:20:28.206+00:00"
      },
      {
        id: "middle",
        created_at: "2026-06-27T13:15:28.206+00:00"
      }
    ];

    const sorted = sortTimelineMessagesNewestFirst(messages);

    expect(sorted.map((message) => message.id)).toEqual(["latest", "middle", "old"]);
    expect(messages.map((message) => message.id)).toEqual(["old", "latest", "middle"]);
  });

  it("formats ISO timestamps as concise Japan-time labels for the detail screen", () => {
    expect(formatAdminDateTime("2026-06-27T13:10:28.206+00:00")).toBe(
      "2026/06/27 22:10"
    );
    expect(formatAdminDateTime(null)).toBe("-");
    expect(formatAdminDateTime("not-a-date")).toBe("not-a-date");
  });
});
