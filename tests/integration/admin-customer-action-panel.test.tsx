import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CustomerActionPanelView,
  CustomerRichMenuSwitchPanel,
  StaffReplyConfirmationCard
} from "../../apps/admin/app/customers/[customerId]/customer-actions";

describe("admin customer action panel", () => {
  it("keeps conversation primary and the rich-menu switch in the customer sidebar", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "apps/admin/app/customers/[customerId]/page.tsx"),
      "utf8"
    );
    const workspace = pageSource.indexOf('<div className="customer-workspace"');
    const conversation = pageSource.indexOf('title="LINEトーク"', workspace);
    const actionPanel = pageSource.indexOf("<CustomerActionPanel", conversation);
    const sidebar = pageSource.indexOf('<aside className="customer-sidebar">', actionPanel);
    const richMenuSwitch = pageSource.indexOf("<CustomerRichMenuSwitch", sidebar);

    expect(workspace).toBeGreaterThanOrEqual(0);
    expect(conversation).toBeGreaterThan(workspace);
    expect(actionPanel).toBeGreaterThan(conversation);
    expect(sidebar).toBeGreaterThan(actionPanel);
    expect(richMenuSwitch).toBeGreaterThan(sidebar);
  });

  it("renders production action cards without changing action wiring", () => {
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
        staffReplyLineRealSendCustomerAvailable={false}
        staffReplyLineRealSendWindowOpen={false}
        staffReplyForm={
          <form className="action-form">
            <label htmlFor="staff-reply-body">返信文</label>
            <textarea id="staff-reply-body" name="body" />
            <button type="button">送信前に確認する</button>
          </form>
        }
        staffReplyRecipientLabel="山田 太郎"
        staffReplyPending={false}
        staffReplyState={{ status: "idle" }}
        staffReplyTenantId="tenant_amamihome"
        summaryPending={false}
        summaryState={{ status: "idle" }}
      />
    );

    expect(html).toContain("返信と下書き");
    expect(html).toContain("返信に使うメモを作る");
    expect(html).toContain("下書きや参考回答は自動送信されません");
    expect(html).toContain("相談内容をまとめる");
    expect(html).toContain("相談まとめ");
    expect(html).toContain("返信文の下書きを作る");
    expect(html).toContain("自動送信なし");
    expect(html).toContain("ホームページ情報から回答案を作る");
    expect(html).toContain("登録済み情報だけを参考");
    expect(html).toContain("オンライン相談 / メンテナンス / 新築 / リフォーム");
    expect(html).toContain("担当者として返信する");
    expect(html).toContain("履歴に保存");
    expect(html).toContain("LINE送信なし");
    expect(html).toContain("送信前に確認する");
    expect(html).toContain("返信するときの注意");
    expect(html).toContain("返信文は必ず内容を確認してから保存・送信します。");
    expect(html).toContain("name=\"body\"");
    expect(html).toContain("name=\"query\"");
    expect(html).not.toContain("お客様のLINEメニューを変える");
  });

  it("renders the rich menu switch as an embedded customer detail control", () => {
    const noopAction = () => {};
    const html = renderToStaticMarkup(
      <CustomerRichMenuSwitchPanel
        customerAvailable={true}
        pending={false}
        runRichMenuSwitch={noopAction}
        state={{ status: "idle" }}
        variant="embedded"
      />
    );

    expect(html).toContain("class=\"customer-rich-menu-switch\"");
    expect(html).toContain("お客様のLINEメニューを変える");
    expect(html).toContain("初期メニューへ切替");
    expect(html).toContain("商談中メニューへ切替");
    expect(html).toContain("アフターメニューへ切替");
    expect(html).toContain("value=\"initial\" name=\"menu_type\"");
    expect(html).toContain("value=\"negotiation\" name=\"menu_type\"");
    expect(html).toContain("value=\"aftercare\" name=\"menu_type\"");
  });

  it("renders a disabled real LINE send action while the runtime capability is closed", () => {
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
        staffReplyLineRealSendCustomerAvailable={true}
        staffReplyLineRealSendWindowOpen={false}
        staffReplyRecipientLabel="山田 太郎"
        staffReplyPending={false}
        staffReplyState={{ status: "idle" }}
        staffReplyTenantId="tenant_amamihome"
        summaryPending={false}
        summaryState={{ status: "idle" }}
      />
    );

    expect(html).toContain("保存前に確認する");
    expect(html).toContain("LINE送信なし");
    expect(html).toContain("LINE送信停止中");
    expect(html).toContain("LINEへ1通送信");
    expect(html).toContain("今はLINEへ送信せず、履歴保存だけ使えます。");
    expect(html).not.toContain("name=\"delivery_mode\" value=\"real_line_push\"");
  });

  it("keeps the real LINE send card visible when the customer is not linked to LINE", () => {
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
        staffReplyLineRealSendCustomerAvailable={false}
        staffReplyLineRealSendWindowOpen={true}
        staffReplyRecipientLabel="山田 太郎"
        staffReplyPending={false}
        staffReplyState={{ status: "idle" }}
        staffReplyTenantId="tenant_amamihome"
        summaryPending={false}
        summaryState={{ status: "idle" }}
      />
    );

    expect(html).toContain("LINEへ1通送信");
    expect(html).toContain("LINE未連携");
    expect(html).toContain("このお客様にはLINE返信先がまだ紐づいていません");
    expect(html).not.toContain("name=\"delivery_mode\" value=\"real_line_push\"");
  });

  it("shows the guarded real LINE send action only when the runtime capability is open", () => {
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
        staffReplyLineRealSendCustomerAvailable={true}
        staffReplyLineRealSendWindowOpen={true}
        staffReplyRecipientLabel="山田 太郎"
        staffReplyPending={false}
        staffReplyState={{ status: "idle" }}
        staffReplyTenantId="tenant_amamihome"
        summaryPending={false}
        summaryState={{ status: "idle" }}
      />
    );

    expect(html).toContain("LINE送信できます");
    expect(html).toContain("LINEへ1通送信");
    expect(html).toContain("再送信禁止");
    expect(html).toContain("一斉送信なし");
    expect(html).toContain("LINEへ送る前に確認する");
  });

  it("renders the staff reply confirmation card with timeline-save safety wording", () => {
    const html = renderToStaticMarkup(
      <StaffReplyConfirmationCard
        bodyPreview="モデルホーム見学について担当者より確認いたします。"
        isConfirmed={false}
        onConfirmChange={() => {}}
        onEdit={() => {}}
        pending={false}
        recipientLabel="山田 太郎"
      />
    );

    expect(html).toContain("確認");
    expect(html).toContain("この内容を履歴に保存しますか？");
    expect(html).toContain("宛先");
    expect(html).toContain("山田 太郎");
    expect(html).toContain("送信内容");
    expect(html).toContain("モデルホーム見学について担当者より確認いたします。");
    expect(html).toContain("履歴に保存");
    expect(html).toContain("担当者返信");
    expect(html).toContain("LINE送信なし");
    expect(html).toContain("この内容は履歴に担当者返信として保存されます");
    expect(html).toContain("この内容を確認しました");
    expect(html).toContain("履歴に保存する");
    expect(html).toContain("disabled=\"\"");
  });

  it("renders the real LINE confirmation card with explicit mode and single-send wording", () => {
    const html = renderToStaticMarkup(
      <StaffReplyConfirmationCard
        bodyPreview="モデルホーム見学について担当者より確認いたします。"
        deliveryMode="real_line_push"
        idempotencyKey="idem_test_card"
        isConfirmed={false}
        onConfirmChange={() => {}}
        onEdit={() => {}}
        pending={false}
        recipientLabel="山田 太郎"
      />
    );

    expect(html).toContain("LINEへ1通送信しますか？");
    expect(html).toContain("LINEへ送信");
    expect(html).toContain("1通だけ");
    expect(html).toContain("再送信禁止");
    expect(html).toContain("再送信や一斉送信をしないことを確認しました");
    expect(html).toContain("name=\"delivery_mode\" value=\"real_line_push\"");
    expect(html).toContain("name=\"line_push_confirmation\"");
    expect(html).toContain("name=\"idempotency_key\" value=\"idem_test_card\"");
    expect(html).toContain("name=\"confirm_single_line_send\"");
    expect(html).toContain("LINEへ1通送信する");
  });
});
