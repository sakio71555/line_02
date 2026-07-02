import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CustomerActionPanelView,
  StaffReplyConfirmationCard
} from "../../apps/admin/app/customers/[customerId]/customer-actions";

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
        staffReplyLineRealSendActionVisible={false}
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

    expect(html).toContain("AI補助と担当者返信");
    expect(html).toContain("AI補助を開く");
    expect(html).toContain("AI下書きと回答案は自動送信されません");
    expect(html).toContain("相談内容をまとめる");
    expect(html).toContain("デモ用AI");
    expect(html).toContain("返信文の下書きを作る");
    expect(html).toContain("LINEに送信されません");
    expect(html).toContain("ホームページ情報から回答案を作る");
    expect(html).toContain("事前登録した情報だけを参考");
    expect(html).toContain("オンライン相談 / メンテナンス / 新築 / リフォーム");
    expect(html).toContain("担当者として返信する");
    expect(html).toContain("これはデモ保存です");
    expect(html).toContain("本物のLINEには送信されません");
    expect(html).toContain("送信前に確認する");
    expect(html).toContain("権限ごとの表示制御は準備中です");
    expect(html).toContain("今はデモ確認のため、操作ボタンは従来通り使えます");
    expect(html).toContain("name=\"body\"");
    expect(html).toContain("name=\"query\"");
  });

  it("hides the real LINE send action while the runtime capability is closed", () => {
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
        staffReplyLineRealSendActionVisible={false}
        staffReplyRecipientLabel="山田 太郎"
        staffReplyPending={false}
        staffReplyState={{ status: "idle" }}
        staffReplyTenantId="tenant_amamihome"
        summaryPending={false}
        summaryState={{ status: "idle" }}
      />
    );

    expect(html).toContain("デモ保存前に確認する");
    expect(html).toContain("本物のLINEには送信されません");
    expect(html).not.toContain("本番LINEへ1通送信");
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
        staffReplyLineRealSendActionVisible={true}
        staffReplyRecipientLabel="山田 太郎"
        staffReplyPending={false}
        staffReplyState={{ status: "idle" }}
        staffReplyTenantId="tenant_amamihome"
        summaryPending={false}
        summaryState={{ status: "idle" }}
      />
    );

    expect(html).toContain("危険操作");
    expect(html).toContain("本番LINEへ1通送信");
    expect(html).toContain("再送信禁止");
    expect(html).toContain("一斉送信なし");
    expect(html).toContain("本番LINEへ1通送信する確認へ進む");
  });

  it("renders the staff reply confirmation card with demo-save safety wording", () => {
    const html = renderToStaticMarkup(
      <StaffReplyConfirmationCard
        bodyPreview="モデルホーム見学について担当者より確認いたします。"
        isConfirmed={false}
        onConfirmChange={() => {}}
        onEdit={() => {}}
        pending={false}
        recipientLabel="山田 太郎"
        tenantId="tenant_amamihome"
      />
    );

    expect(html).toContain("送信前の確認");
    expect(html).toContain("この内容でデモ保存しますか？");
    expect(html).toContain("宛先");
    expect(html).toContain("山田 太郎");
    expect(html).toContain("利用先");
    expect(html).toContain("tenant_amamihome");
    expect(html).toContain("送信内容");
    expect(html).toContain("モデルホーム見学について担当者より確認いたします。");
    expect(html).toContain("デモ用");
    expect(html).toContain("これはデモ保存です");
    expect(html).toContain("本物のLINEには送信されません");
    expect(html).toContain("タイムラインにスタッフ返信として保存されます");
    expect(html).toContain("この内容を確認しました");
    expect(html).toContain("この内容でデモ保存する");
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
        tenantId="tenant_amamihome"
      />
    );

    expect(html).toContain("本番LINEへ1通送信しますか？");
    expect(html).toContain("本番LINE送信");
    expect(html).toContain("1通だけ");
    expect(html).toContain("再送信禁止");
    expect(html).toContain("name=\"delivery_mode\" value=\"real_line_push\"");
    expect(html).toContain("name=\"line_push_confirmation\"");
    expect(html).toContain("name=\"idempotency_key\" value=\"idem_test_card\"");
    expect(html).toContain("name=\"confirm_single_canary_send\"");
    expect(html).toContain("本番LINEへ1通送信する");
  });
});
