import { describe, expect, it } from "vitest";

import {
  formatAdminDateTime,
  sortTimelineMessagesNewestFirst,
  toLineConversationTimelineMessages
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

  it("builds the customer detail conversation timeline from LINE-visible roles newest first", () => {
    const messages = [
      {
        id: "customer-menu",
        role: "customer",
        body: "担当者に相談",
        created_at: "2026-07-04T16:52:00.000Z"
      },
      {
        id: "system-tree",
        role: "system",
        body: "分類ツリー: 初期メニュー -> 担当者に相談",
        created_at: "2026-07-04T16:52:01.000Z"
      },
      {
        id: "bot-prompt",
        role: "bot",
        body: "相談カテゴリを次から選んで、そのままLINEで送ってください。",
        created_at: "2026-07-04T16:52:01.000Z"
      },
      {
        id: "customer-answer",
        role: "customer",
        body: "モデルハウス見学について",
        created_at: "2026-07-04T16:53:00.000Z"
      },
      {
        id: "ai-summary",
        role: "ai",
        body: "要約: モデルハウス相談",
        created_at: "2026-07-04T16:54:00.000Z"
      },
      {
        id: "staff-reply",
        role: "staff",
        body: "担当者から返信します。",
        created_at: "2026-07-04T16:55:00.000Z"
      }
    ];

    const conversation = toLineConversationTimelineMessages(messages);

    expect(conversation.map((message) => message.id)).toEqual([
      "staff-reply",
      "customer-answer",
      "bot-prompt",
      "customer-menu"
    ]);
    expect(messages.map((message) => message.id)).toEqual([
      "customer-menu",
      "system-tree",
      "bot-prompt",
      "customer-answer",
      "ai-summary",
      "staff-reply"
    ]);
    expect(conversation.map((message) => message.body)).toEqual([
      "担当者から返信します。",
      "モデルハウス見学について",
      "相談カテゴリを次から選んで、そのままLINEで送ってください。",
      "担当者に相談"
    ]);
  });

  it("formats ISO timestamps as concise Japan-time labels for the detail screen", () => {
    expect(formatAdminDateTime("2026-06-27T13:10:28.206+00:00")).toBe(
      "2026/06/27 22:10"
    );
    expect(formatAdminDateTime(null)).toBe("-");
    expect(formatAdminDateTime("not-a-date")).toBe("not-a-date");
  });
});
