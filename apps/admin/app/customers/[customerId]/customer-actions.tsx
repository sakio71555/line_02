"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE,
  type AdminCustomerRichMenuType
} from "../../../src/admin-api";
import {
  runAiReplyDraftAction,
  runAiSummaryAction,
  runCustomerArchiveAction,
  runRagAnswerDraftAction,
  runRichMenuSwitchAction,
  runStaffReplyAction
} from "./actions";
import { RoleVisibilityNote } from "../../role-visibility-note";
import type {
  AiReplyDraftActionState,
  AiSummaryActionState,
  CustomerArchiveActionState,
  RagAnswerDraftActionState,
  RichMenuSwitchActionState,
  StaffReplyActionState
} from "./action-types";

const initialAiSummaryState: AiSummaryActionState = {
  status: "idle"
};

const initialAiReplyDraftState: AiReplyDraftActionState = {
  status: "idle"
};

const initialRagAnswerDraftState: RagAnswerDraftActionState = {
  status: "idle"
};

const initialStaffReplyState: StaffReplyActionState = {
  status: "idle"
};

const initialRichMenuSwitchState: RichMenuSwitchActionState = {
  status: "idle"
};

const initialCustomerArchiveState: CustomerArchiveActionState = {
  status: "idle"
};

const ragExampleKeywords = ["オンライン相談", "メンテナンス", "新築", "リフォーム"] as const;

const customerRichMenuSwitchOptions = [
  {
    menuType: "initial",
    label: "初期メニュー",
    description: "新規相談・未登録のお客様向け"
  },
  {
    menuType: "negotiation",
    label: "商談中メニュー",
    description: "面談中・見積中・プラン相談中のお客様向け"
  },
  {
    menuType: "aftercare",
    label: "アフターメニュー",
    description: "契約後・引き渡し後・OBのお客様向け"
  }
] as const satisfies ReadonlyArray<{
  menuType: AdminCustomerRichMenuType;
  label: string;
  description: string;
}>;

type FormAction = (formData: FormData) => void;

export function CustomerActionPanel({
  customerId,
  lineRealSendCustomerAvailable,
  lineRealSendWindowOpen,
  recipientLabel
}: {
  customerId: string;
  lineRealSendCustomerAvailable: boolean;
  lineRealSendWindowOpen: boolean;
  recipientLabel: string;
}) {
  const router = useRouter();
  const [staffReplyState, runStaffReply, staffReplyPending] = useActionState(
    runStaffReplyAction.bind(null, customerId),
    initialStaffReplyState
  );
  const [summaryState, runSummary, summaryPending] = useActionState(
    runAiSummaryAction.bind(null, customerId),
    initialAiSummaryState
  );
  const [replyDraftState, runReplyDraft, replyDraftPending] = useActionState(
    runAiReplyDraftAction.bind(null, customerId),
    initialAiReplyDraftState
  );
  const [ragAnswerState, runRagAnswer, ragAnswerPending] = useActionState(
    runRagAnswerDraftAction,
    initialRagAnswerDraftState
  );

  useEffect(() => {
    if (
      summaryState.status === "success" ||
      staffReplyState.status === "success"
    ) {
      router.refresh();
    }
  }, [
    router,
    staffReplyState.status,
    staffReplyState.result?.message.id,
    summaryState.status,
    summaryState.result?.message.id
  ]);

  return (
    <CustomerActionPanelView
      replyDraftPending={replyDraftPending}
      replyDraftState={replyDraftState}
      ragAnswerPending={ragAnswerPending}
      ragAnswerState={ragAnswerState}
      runRagAnswer={runRagAnswer}
      runReplyDraft={runReplyDraft}
      runStaffReply={runStaffReply}
      runSummary={runSummary}
      staffReplyLineRealSendCustomerAvailable={lineRealSendCustomerAvailable}
      staffReplyLineRealSendWindowOpen={lineRealSendWindowOpen}
      staffReplyRecipientLabel={recipientLabel}
      staffReplyPending={staffReplyPending}
      staffReplyState={staffReplyState}
      summaryPending={summaryPending}
      summaryState={summaryState}
    />
  );
}

export function CustomerActionPanelView({
  replyDraftPending,
  replyDraftState,
  ragAnswerPending,
  ragAnswerState,
  runRagAnswer,
  runReplyDraft,
  runStaffReply,
  runSummary,
  staffReplyForm,
  staffReplyLineRealSendCustomerAvailable,
  staffReplyLineRealSendWindowOpen,
  staffReplyRecipientLabel,
  staffReplyPending,
  staffReplyState,
  summaryPending,
  summaryState
}: {
  replyDraftPending: boolean;
  replyDraftState: AiReplyDraftActionState;
  ragAnswerPending: boolean;
  ragAnswerState: RagAnswerDraftActionState;
  runRagAnswer: FormAction;
  runReplyDraft: FormAction;
  runStaffReply: FormAction;
  runSummary: FormAction;
  staffReplyForm?: React.ReactNode;
  staffReplyLineRealSendCustomerAvailable: boolean;
  staffReplyLineRealSendWindowOpen: boolean;
  staffReplyRecipientLabel: string;
  staffReplyPending: boolean;
  staffReplyState: StaffReplyActionState;
  summaryPending: boolean;
  summaryState: AiSummaryActionState;
}) {
  return (
    <section className="section">
      <h2>返信と下書き</h2>
      <p className="meta">
        返信内容を保存したり、LINEへ送る前に確認できます。
        自動でお客様へ送信されることはありません。
      </p>
      <RoleVisibilityNote variant="customer-actions" />

      <details className="ai-assist-details">
        <summary>
          <strong>返信に使うメモを作る</strong>
          <span className="meta">下書きや参考回答は自動送信されません。</span>
        </summary>
        <div className="ai-assist-body">
          <div className="action-grid">
            <article className="action-panel">
              <div className="action-card-header">
                <p className="result-label">補助 1</p>
                <h3>相談内容をまとめる</h3>
              </div>
              <div className="status-pill-list">
                <span className="status-pill">相談まとめ</span>
                <span className="status-pill">履歴に保存</span>
              </div>
              <p className="meta">
                これまでの相談内容を短くまとめます。結果は履歴に保存されます。
              </p>
              <form action={runSummary} className="action-form">
                <button type="submit" disabled={summaryPending}>
                  {summaryPending ? "まとめています..." : "相談内容をまとめる"}
                </button>
              </form>
              <AiSummaryResult state={summaryState} />
            </article>

            <article className="action-panel">
              <div className="action-card-header">
                <p className="result-label">補助 2</p>
                <h3>返信文の下書きを作る</h3>
              </div>
              <div className="status-pill-list">
                <span className="status-pill">下書き確認用</span>
                <span className="status-pill">自動送信なし</span>
              </div>
              <p className="meta">
                お客様への返信文のたたき台を作ります。この下書きはLINEに自動送信されません。
                内容を確認してから担当者が返信します。
              </p>
              <form action={runReplyDraft} className="action-form">
                <button type="submit" disabled={replyDraftPending}>
                  {replyDraftPending ? "作成中..." : "返信文の下書きを作る"}
                </button>
              </form>
              <AiReplyDraftResult state={replyDraftState} />
            </article>

            <article className="action-panel action-panel-wide">
              <div className="action-card-header">
                <p className="result-label">補助 3</p>
                <h3>ホームページ情報から回答案を作る</h3>
              </div>
              <div className="status-pill-list">
                <span className="status-pill">参考情報つき回答案</span>
                <span className="status-pill">登録済み情報</span>
              </div>
              <p className="meta">
                登録済みのアマミホーム参考情報から、回答案を作ります。
                登録済み情報だけを参考にし、お客様へ自動送信しません。
              </p>
              <p className="meta">
                入力例: {ragExampleKeywords.join(" / ")}
              </p>
              <form action={runRagAnswer} className="action-form">
                <label htmlFor="rag-query">質問</label>
                <textarea
                  id="rag-query"
                  name="query"
                  placeholder="例: オンライン相談はできますか？"
                  rows={3}
                />
                <button type="submit" disabled={ragAnswerPending}>
                  {ragAnswerPending ? "作成中..." : "ホームページ情報から回答案を作る"}
                </button>
              </form>
              <RagAnswerDraftResult state={ragAnswerState} />
            </article>
          </div>
        </div>
      </details>

      <article className="action-panel action-panel-wide staff-reply-panel">
        <div className="action-card-header">
          <p className="result-label">担当者返信</p>
          <h3>担当者として返信する</h3>
        </div>
        <div className="status-pill-list">
          <span className="status-pill">履歴に保存</span>
          <span className="status-pill">LINE送信なし</span>
          <span className="status-pill">送信前に確認</span>
        </div>
        <p className="meta">
          入力した内容を担当者返信として履歴に保存します。
          LINEへ送る場合は、下の確認欄から1通だけ送れます。
        </p>
        {staffReplyForm ?? (
          <StaffReplyConfirmationForm
            lineRealSendCustomerAvailable={staffReplyLineRealSendCustomerAvailable}
            lineRealSendWindowOpen={staffReplyLineRealSendWindowOpen}
            pending={staffReplyPending}
            recipientLabel={staffReplyRecipientLabel}
            runStaffReply={runStaffReply}
            state={staffReplyState}
          />
        )}
        <StaffReplyResult state={staffReplyState} />
      </article>
    </section>
  );
}

export function CustomerRichMenuSwitch({
  customerAvailable,
  customerId
}: {
  customerAvailable: boolean;
  customerId: string;
}) {
  const router = useRouter();
  const [richMenuSwitchState, runRichMenuSwitch, richMenuSwitchPending] = useActionState(
    runRichMenuSwitchAction.bind(null, customerId),
    initialRichMenuSwitchState
  );

  useEffect(() => {
    if (richMenuSwitchState.status === "success") {
      router.refresh();
    }
  }, [richMenuSwitchState.result?.message.id, richMenuSwitchState.status, router]);

  return (
    <CustomerRichMenuSwitchPanel
      customerAvailable={customerAvailable}
      pending={richMenuSwitchPending}
      runRichMenuSwitch={runRichMenuSwitch}
      state={richMenuSwitchState}
      variant="embedded"
    />
  );
}

export function CustomerRichMenuSwitchPanel({
  customerAvailable,
  pending,
  runRichMenuSwitch,
  state,
  variant = "standalone"
}: {
  customerAvailable: boolean;
  pending: boolean;
  runRichMenuSwitch: FormAction;
  state: RichMenuSwitchActionState;
  variant?: "embedded" | "standalone";
}) {
  return (
    <article
      className={
        variant === "embedded"
          ? "customer-rich-menu-switch"
          : "action-panel action-panel-wide"
      }
    >
      <div className="action-card-header">
        <p className="result-label">LINEメニュー</p>
        <h3>お客様のLINEメニューを変える</h3>
      </div>
      <div className="status-pill-list">
        <span className="status-pill">初期</span>
        <span className="status-pill">商談中</span>
        <span className="status-pill">アフター</span>
      </div>
      <p className="meta">
        このお客様に表示されるLINEメニューだけを変えます。メッセージは送りません。
      </p>
      {!customerAvailable ? (
        <p className="meta">このお客様はLINEとまだつながっていないため、メニュー変更はまだ使えません。</p>
      ) : null}
      <form action={runRichMenuSwitch} className="action-form">
        <div className="action-grid rich-menu-switch-grid">
          {customerRichMenuSwitchOptions.map((option) => (
            <button
              key={option.menuType}
              name="menu_type"
              type="submit"
              value={option.menuType}
              disabled={!customerAvailable || pending}
            >
              {pending ? "切替中..." : `${option.label}へ切替`}
              <span className="button-subtext">{option.description}</span>
            </button>
          ))}
        </div>
      </form>
      <RichMenuSwitchResult state={state} />
    </article>
  );
}

export function CustomerArchiveControl({
  customerId,
  customerName,
  isArchived
}: {
  customerId: string;
  customerName: string;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [state, runAction, pending] = useActionState(
    runCustomerArchiveAction.bind(null, customerId),
    initialCustomerArchiveState
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.result?.status, state.status]);

  if (isArchived) {
    return (
      <section className="workspace-section customer-archive-control customer-restore-control">
        <h3>削除済みのお客様</h3>
        <p className="meta">
          LINE履歴と登録情報は保管されています。一覧へ戻すと、再び対応できます。
        </p>
        <form action={runAction} className="action-form">
          <input name="archive_mode" type="hidden" value="restore" />
          <button disabled={pending} type="submit">
            {pending ? "戻しています..." : "顧客一覧へ戻す"}
          </button>
        </form>
        <CustomerArchiveResult state={state} />
      </section>
    );
  }

  return (
    <details className="customer-archive-control">
      <summary>このお客様を削除</summary>
      <div className="customer-archive-control-body">
        <p>
          顧客一覧から非表示にします。LINE履歴と登録情報は消えず、あとから元に戻せます。
        </p>
        <form action={runAction} className="action-form">
          <input name="archive_mode" type="hidden" value="archive" />
          <input name="expected_customer_name" type="hidden" value={customerName} />
          <label htmlFor="customer-name-confirmation">
            確認のため「{customerName}」と入力
          </label>
          <input
            autoComplete="off"
            id="customer-name-confirmation"
            name="customer_name_confirmation"
            required
            type="text"
          />
          <button className="danger-action-button" disabled={pending} type="submit">
            {pending ? "削除しています..." : "顧客一覧から削除する"}
          </button>
        </form>
        <CustomerArchiveResult state={state} />
      </div>
    </details>
  );
}

function CustomerArchiveResult({ state }: { state: CustomerArchiveActionState }) {
  if (state.status === "idle") return null;

  if (state.status === "error") {
    return <p className="action-error">{state.error}</p>;
  }

  return (
    <p className="action-result">
      {state.result?.status === "archived"
        ? "顧客一覧から削除しました。"
        : "顧客一覧へ戻しました。"}
    </p>
  );
}

function StaffReplyConfirmationForm({
  lineRealSendCustomerAvailable,
  lineRealSendWindowOpen,
  pending,
  recipientLabel,
  runStaffReply,
  state
}: {
  lineRealSendCustomerAvailable: boolean;
  lineRealSendWindowOpen: boolean;
  pending: boolean;
  recipientLabel: string;
  runStaffReply: FormAction;
  state: StaffReplyActionState;
}) {
  const [replyText, setReplyText] = useState("");
  const [confirmationMode, setConfirmationMode] = useState<"demo_save" | "real_line_push" | null>(
    null
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const replyPreview = replyText.trim();
  const isConfirming = confirmationMode !== null;
  const canPrepareRealLinePush = lineRealSendCustomerAvailable && lineRealSendWindowOpen;
  const realLineSendStatusLabel = !lineRealSendCustomerAvailable
    ? "LINE未連携"
    : lineRealSendWindowOpen
      ? "LINE送信できます"
      : "LINE送信停止中";
  const realLineSendDescription = !lineRealSendCustomerAvailable
    ? "このお客様にはLINE返信先がまだ紐づいていません。LINEから受信後に送信できます。"
    : lineRealSendWindowOpen
      ? "送信前に確認したうえで、このお客様へ1通だけ送ります。"
      : "今はLINEへ送信せず、履歴保存だけ使えます。";
  const realLineSendButtonLabel = !lineRealSendCustomerAvailable
    ? "LINE未連携"
    : lineRealSendWindowOpen
      ? "LINEへ送る前に確認する"
      : "LINE送信停止中";

  useEffect(() => {
    if (state.status === "success") {
      setReplyText("");
      setConfirmationMode(null);
      setIsConfirmed(false);
      setIdempotencyKey("");
    }
  }, [state.status, state.result?.message.id]);

  function handlePrepareConfirmation(mode: "demo_save" | "real_line_push") {
    if (!replyPreview) {
      return;
    }

    setConfirmationMode(mode);
    setIsConfirmed(false);
    setIdempotencyKey(mode === "real_line_push" ? createIdempotencyKey() : "");
  }

  function handleEdit() {
    setConfirmationMode(null);
    setIsConfirmed(false);
    setIdempotencyKey("");
  }

  return (
    <form action={runStaffReply} className="action-form">
      {isConfirming ? (
        <>
          <input type="hidden" name="body" value={replyPreview} />
          <StaffReplyConfirmationCard
            bodyPreview={replyPreview}
            deliveryMode={confirmationMode}
            idempotencyKey={idempotencyKey}
            isConfirmed={isConfirmed}
            onConfirmChange={setIsConfirmed}
            onEdit={handleEdit}
            pending={pending}
            recipientLabel={recipientLabel}
          />
        </>
      ) : (
        <>
          <label htmlFor="staff-reply-body">返信文</label>
          <textarea
            id="staff-reply-body"
            name="body"
            onChange={(event) => setReplyText(event.currentTarget.value)}
            placeholder="担当者として返信する内容を入力"
            rows={4}
            value={replyText}
          />
          <button
            type="button"
            disabled={!replyPreview || pending}
            onClick={() => handlePrepareConfirmation("demo_save")}
          >
            保存前に確認する
          </button>
          <div className="real-send-gate-card" aria-label="LINE送信">
            <div className="action-card-header">
              <p className="result-label">{realLineSendStatusLabel}</p>
              <h4>LINEへ1通送信</h4>
            </div>
            <div className="status-pill-list">
              <span className="status-pill status-pill-danger">1通だけ</span>
              <span className="status-pill status-pill-danger">再送信禁止</span>
              <span className="status-pill status-pill-danger">一斉送信なし</span>
            </div>
            <p className="meta">{realLineSendDescription}</p>
            <button
              className="danger-action-button"
              type="button"
              disabled={!canPrepareRealLinePush || !replyPreview || pending}
              onClick={() => handlePrepareConfirmation("real_line_push")}
            >
              {realLineSendButtonLabel}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function createIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) {
    return `staff-reply-${globalThis.crypto.randomUUID()}`;
  }

  return `staff-reply-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function StaffReplyConfirmationCard({
  bodyPreview,
  deliveryMode = "demo_save",
  idempotencyKey = "",
  isConfirmed,
  onConfirmChange,
  onEdit,
  pending,
  recipientLabel
}: {
  bodyPreview: string;
  deliveryMode?: "demo_save" | "real_line_push";
  idempotencyKey?: string;
  isConfirmed: boolean;
  onConfirmChange: (checked: boolean) => void;
  onEdit: () => void;
  pending: boolean;
  recipientLabel: string;
}) {
  const isRealLinePush = deliveryMode === "real_line_push";

  return (
    <div className={isRealLinePush ? "confirmation-card real-send-confirmation-card" : "confirmation-card"}>
      <div className="action-card-header">
        <p className="result-label">確認</p>
        <h4>{isRealLinePush ? "LINEへ1通送信しますか？" : "この内容を履歴に保存しますか？"}</h4>
      </div>
      <div className="status-pill-list">
        {isRealLinePush ? (
          <>
            <span className="status-pill status-pill-danger">LINEへ送信</span>
            <span className="status-pill status-pill-danger">1通だけ</span>
            <span className="status-pill status-pill-danger">再送信禁止</span>
          </>
        ) : (
          <>
            <span className="status-pill">履歴に保存</span>
            <span className="status-pill">担当者返信</span>
            <span className="status-pill">LINE送信なし</span>
          </>
        )}
      </div>
      <input type="hidden" name="delivery_mode" value={deliveryMode} />
      {isRealLinePush ? (
        <>
          <input
            type="hidden"
            name="line_push_confirmation"
            value={ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE}
          />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        </>
      ) : null}
      <dl className="compact-detail confirmation-detail">
        <dt>宛先</dt>
        <dd>{recipientLabel}</dd>
        <dt>送信種別</dt>
        <dd>
          {isRealLinePush
            ? "LINEへ1通だけ送信します。再送信や一斉送信は行いません。"
            : "履歴に保存します。LINEには送信されません。"}
        </dd>
        <dt>送信内容</dt>
        <dd className="message-body">{bodyPreview}</dd>
        <dt>注意</dt>
        <dd>
          {isRealLinePush
            ? "LINEへ送信されます。再送信や一斉送信は行いません。"
            : "この内容は履歴に担当者返信として保存されます。"}
        </dd>
      </dl>
      <label className="confirmation-check">
        <input
          checked={isConfirmed}
          name={isRealLinePush ? "confirm_single_line_send" : undefined}
          onChange={(event) => onConfirmChange(event.currentTarget.checked)}
          required
          type="checkbox"
        />
        <span>
          {isRealLinePush
            ? "LINEへ1通だけ送信すること、再送信や一斉送信をしないことを確認しました。"
            : "この内容を確認しました。LINEには送信されず、履歴に保存されることを理解しました。"}
        </span>
      </label>
      <div className="confirmation-actions">
        <button type="button" onClick={onEdit} disabled={pending}>
          内容を修正する
        </button>
        <button
          className={isRealLinePush ? "danger-action-button" : undefined}
          type="submit"
          disabled={!isConfirmed || pending}
        >
          {isRealLinePush
            ? pending
              ? "LINE送信中..."
              : "LINEへ1通送信する"
            : pending
              ? "保存中..."
              : "履歴に保存する"}
        </button>
      </div>
    </div>
  );
}

function StaffReplyResult({ state }: { state: StaffReplyActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "error") {
    return <ActionError message={state.error} />;
  }

  const result = state.result;

  if (!result) {
    return null;
  }

  return (
    <div className="action-result">
      <p className="result-label">送信結果</p>
      <p>
        {state.deliveryMode === "real_line_push"
          ? "担当者返信をLINEへ1通送信し、履歴へ保存しました。"
          : "担当者返信を履歴へ保存しました。"}
      </p>
      <ResultField label="保存番号" value={result.message.id} />
      <ResultField label="対応状況" value={formatResponseMode(result.customer.response_mode)} />
      <ResultField
        label="最後の担当者返信日時"
        value={result.customer.last_staff_reply_at ?? "-"}
      />
    </div>
  );
}

function RichMenuSwitchResult({ state }: { state: RichMenuSwitchActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "error") {
    return <ActionError message={state.error} />;
  }

  const result = state.result;

  if (!result) {
    return null;
  }

  return (
    <div className="action-result">
      <p className="result-label">切替結果</p>
      <p>{result.menu_label}へ切り替えました。LINEメッセージ送信は行っていません。</p>
      <ResultField label="保存番号" value={result.message.id} />
      <ResultField label="切替後のメニュー" value={result.menu_label} />
    </div>
  );
}

function AiSummaryResult({ state }: { state: AiSummaryActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "error") {
    return <ActionError message={state.error} />;
  }

  const result = state.result;

  if (!result) {
    return null;
  }

  return (
    <div className="action-result">
      <p className="result-label">相談まとめ</p>
      <p>{result.summary.summary}</p>
      <ResultList label="次に確認すること" items={result.summary.next_actions} />
      <ResultList label="注意点" items={result.summary.risk_flags} />
      <ResultField
        label="おすすめ対応"
        value={formatResponseMode(result.summary.recommended_response_mode)}
      />
      <ResultField label="作成方法" value={formatProvider(result.summary.provider)} />
      <ResultField label="保存番号" value={result.message.id} />
    </div>
  );
}

function AiReplyDraftResult({ state }: { state: AiReplyDraftActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "error") {
    return <ActionError message={state.error} />;
  }

  const result = state.result;

  if (!result) {
    return null;
  }

  return (
    <div className="action-result">
      <p className="result-label">返信文の下書き</p>
      <p className="message-body">{result.draft_body}</p>
      <ResultList label="次に確認すること" items={result.next_questions} />
      <ResultList label="注意点" items={result.risk_flags} />
      <ResultField
        label="おすすめ対応"
        value={formatResponseMode(result.recommended_response_mode)}
      />
      <ResultField label="担当者確認が必要か" value={formatBoolean(result.should_handoff)} />
      <ResultField label="作成方法" value={formatProvider(result.provider)} />
    </div>
  );
}

function RagAnswerDraftResult({ state }: { state: RagAnswerDraftActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "error") {
    return <ActionError message={state.error} />;
  }

  const result = state.result;

  if (!result) {
    return null;
  }

  return (
    <div className="action-result">
      <ResultField label="質問" value={result.query} />
      <ResultField label="回答できるか" value={result.can_answer ? "回答案あり" : "担当者確認"} />
      <p className="result-label">回答案</p>
      <p className="message-body">{result.answer_body}</p>
      <ResultList label="注意点" items={result.risk_flags} />
      <ResultField label="担当者確認が必要か" value={formatBoolean(result.handoff_required)} />
      <ResultField
        label="おすすめ対応"
        value={formatResponseMode(result.recommended_response_mode)}
      />
      <ResultField label="作成方法" value={formatProvider(result.provider)} />
      <div className="source-list">
        <p className="result-label">参考にした情報</p>
        {result.sources.length === 0 ? (
          <p className="meta">参考情報が見つかりませんでした。担当者確認が必要です。</p>
        ) : (
          <ul>
            {result.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url}>{source.title}</a>
                <dl className="compact-detail">
                  <dt>分類</dt>
                  <dd>{source.category}</dd>
                  <dt>情報の種類</dt>
                  <dd>{source.source_type}</dd>
                  <dt>参考度</dt>
                  <dd>{source.score}</dd>
                  <dt>該当部分</dt>
                  <dd>{source.excerpt}</dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActionError({ message }: { message: string | undefined }) {
  return (
    <div className="error">
      <strong>操作エラー</strong>
      <pre>{message ?? "Unknown error"}</pre>
    </div>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <p className="result-field">
      <span>{label}</span>
      <code>{value}</code>
    </p>
  );
}

function ResultList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="result-label">{label}</p>
      {items.length === 0 ? (
        <p className="meta">-</p>
      ) : (
        <ul className="result-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBoolean(value: boolean): string {
  return value ? "必要" : "不要";
}

function formatProvider(provider: string | undefined): string {
  if (provider === "mock") {
    return "下書き補助";
  }

  if (provider === "openai") {
    return "回答作成補助";
  }

  return "-";
}

function formatResponseMode(mode: string): string {
  const labels: Record<string, string> = {
    bot_auto: "自動返信中",
    human_required: "担当者の確認が必要",
    human_active: "担当者が対応中",
    emergency: "至急対応",
    closed: "対応完了"
  };

  return labels[mode] ?? mode;
}
