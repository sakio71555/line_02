import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CustomerActionPanelView } from "../../apps/admin/app/customers/[customerId]/customer-actions";

describe("admin customer action panel", () => {
  it("renders beginner-friendly action cards without changing action wiring", () => {
    const noopAction = () => {};
    const html = renderToStaticMarkup(
      <CustomerActionPanelView
        replyDraftPending={false}
        replyDraftState={{ status: "idle" }}
        ragAnswerPending={false}
        ragAnswerState={{ status: "idle" }}
        runRagAnswer={noopAction}
        runReplyDraft={noopAction}
        runStaffReply={noopAction}
        runSummary={noopAction}
        staffReplyPending={false}
        staffReplyState={{ status: "idle" }}
        summaryPending={false}
        summaryState={{ status: "idle" }}
      />
    );

    expect(html).toContain("次にできること");
    expect(html).toContain("相談内容をまとめる");
    expect(html).toContain("OpenAI APIには接続していません");
    expect(html).toContain("返信文の下書きを作る");
    expect(html).toContain("LINEに送信されません");
    expect(html).toContain("ホームページ情報から回答案を作る");
    expect(html).toContain("Webクロール、embedding、pgvectorは未接続");
    expect(html).toContain("オンライン相談 / メンテナンス / 新築 / リフォーム");
    expect(html).toContain("担当者として返信する");
    expect(html).toContain("本物のLINEには送信されません");
    expect(html).toContain("権限ごとの表示制御は準備中です");
    expect(html).toContain("今はデモ確認のため、操作ボタンは従来通り使えます");
    expect(html).toContain("name=\"body\"");
    expect(html).toContain("name=\"query\"");
  });
});
