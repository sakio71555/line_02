"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE } from "../../../src/admin-api";
import {
  runAiReplyDraftAction,
  runAiSummaryAction,
  runRagAnswerDraftAction,
  runStaffReplyAction
} from "./actions";
import { RoleVisibilityNote } from "../../role-visibility-note";
import type {
  AiReplyDraftActionState,
  AiSummaryActionState,
  RagAnswerDraftActionState,
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

const ragExampleKeywords = ["オンライン相談", "メンテナンス", "新築", "リフォーム"] as const;

type FormAction = (formData: FormData) => void;

export function CustomerActionPanel({
  customerId,
  lineRealSendActionVisible,
  recipientLabel,
  tenantId
}: {
  customerId: string;
  lineRealSendActionVisible: boolean;
  recipientLabel: string;
  tenantId: string;
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
    if (summaryState.status === "success" || staffReplyState.status === "success") {
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
      staffReplyLineRealSendActionVisible={lineRealSendActionVisible}
      staffReplyRecipientLabel={recipientLabel}
      staffReplyPending={staffReplyPending}
      staffReplyState={staffReplyState}
      staffReplyTenantId={tenantId}
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
  staffReplyLineRealSendActionVisible,
  staffReplyRecipientLabel,
  staffReplyPending,
  staffReplyState,
  staffReplyTenantId,
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
  staffReplyLineRealSendActionVisible: boolean;
  staffReplyRecipientLabel: string;
  staffReplyPending: boolean;
  staffReplyState: StaffReplyActionState;
  staffReplyTenantId: string;
  summaryPending: boolean;
  summaryState: AiSummaryActionState;
}) {
  return (
    <section className="section">
      <h2>AI補助と担当者返信</h2>
      <p className="meta">
        AI下書きと回答案は確認用です。お客様へ自動送信せず、最後は担当者が内容を見て返信します。
      </p>
      <RoleVisibilityNote variant="customer-actions" />

      <details className="ai-assist-details">
        <summary>
          <strong>AI補助を開く</strong>
          <span className="meta">AI下書きと回答案は自動送信されません。</span>
        </summary>
        <div className="ai-assist-body">
          <div className="action-grid">
            <article className="action-panel">
              <div className="action-card-header">
                <p className="result-label">AI補助 1</p>
                <h3>相談内容をまとめる</h3>
              </div>
              <div className="status-pill-list">
                <span className="status-pill">デモ用AI</span>
                <span className="status-pill">タイムラインに保存</span>
              </div>
              <p className="meta">
                デモ用AIが、これまでの相談内容を短くまとめます。結果はタイムラインに
                AI要約として保存されます。
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
                <p className="result-label">AI補助 2</p>
                <h3>返信文の下書きを作る</h3>
              </div>
              <div className="status-pill-list">
                <span className="status-pill">下書き確認用</span>
                <span className="status-pill">LINEには送信されません</span>
              </div>
              <p className="meta">
                お客様への返信文をデモ用AIで作ります。この下書きはまだLINEに送信されません。
                内容を確認してから担当者が返信する想定です。
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
                <p className="result-label">AI補助 3</p>
                <h3>ホームページ情報から回答案を作る</h3>
              </div>
              <div className="status-pill-list">
                <span className="status-pill">参考情報つき回答案</span>
                <span className="status-pill">デモ用AI</span>
                <span className="status-pill">事前登録情報</span>
              </div>
              <p className="meta">
                デモ用に登録したアマミホームの参考情報から、回答案を作ります。
                事前登録した情報だけを参考にし、お客様へ自動送信しません。
              </p>
              <p className="meta">
                試しやすいキーワード: {ragExampleKeywords.join(" / ")}
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
          <span className="status-pill">これはデモ保存です</span>
          <span className="status-pill">本物のLINEには送信されません</span>
          <span className="status-pill">タイムラインに保存</span>
        </div>
        <p className="meta">
          入力した内容をスタッフ返信としてタイムラインに保存します。今はデモ用送信なので、
          本物のLINEには送信されません。
        </p>
        {staffReplyForm ?? (
          <StaffReplyConfirmationForm
            lineRealSendActionVisible={staffReplyLineRealSendActionVisible}
            pending={staffReplyPending}
            recipientLabel={staffReplyRecipientLabel}
            runStaffReply={runStaffReply}
            state={staffReplyState}
            tenantId={staffReplyTenantId}
          />
        )}
        <StaffReplyResult state={staffReplyState} />
      </article>
    </section>
  );
}

function StaffReplyConfirmationForm({
  lineRealSendActionVisible,
  pending,
  recipientLabel,
  runStaffReply,
  state,
  tenantId
}: {
  lineRealSendActionVisible: boolean;
  pending: boolean;
  recipientLabel: string;
  runStaffReply: FormAction;
  state: StaffReplyActionState;
  tenantId: string;
}) {
  const [replyText, setReplyText] = useState("");
  const [confirmationMode, setConfirmationMode] = useState<"demo_save" | "real_line_push" | null>(
    null
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const replyPreview = replyText.trim();
  const isConfirming = confirmationMode !== null;

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
            tenantId={tenantId}
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
            デモ保存前に確認する
          </button>
          {lineRealSendActionVisible ? (
            <div className="real-send-gate-card" aria-label="本番LINE送信の危険操作">
              <div className="action-card-header">
                <p className="result-label">危険操作</p>
                <h4>本番LINEへ1通送信</h4>
              </div>
              <div className="status-pill-list">
                <span className="status-pill status-pill-danger">1通だけ</span>
                <span className="status-pill status-pill-danger">再送信禁止</span>
                <span className="status-pill status-pill-danger">一斉送信なし</span>
              </div>
              <p className="meta">
                canary windowが開いている時だけ使う操作です。送信後はwindowを閉じてください。
                OpenAI、再送信、一斉送信、broadcast、multicastは行いません。
              </p>
              <button
                className="danger-action-button"
                type="button"
                disabled={!replyPreview || pending}
                onClick={() => handlePrepareConfirmation("real_line_push")}
              >
                本番LINEへ1通送信する確認へ進む
              </button>
            </div>
          ) : null}
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
  recipientLabel,
  tenantId
}: {
  bodyPreview: string;
  deliveryMode?: "demo_save" | "real_line_push";
  idempotencyKey?: string;
  isConfirmed: boolean;
  onConfirmChange: (checked: boolean) => void;
  onEdit: () => void;
  pending: boolean;
  recipientLabel: string;
  tenantId: string;
}) {
  const isRealLinePush = deliveryMode === "real_line_push";

  return (
    <div className={isRealLinePush ? "confirmation-card real-send-confirmation-card" : "confirmation-card"}>
      <div className="action-card-header">
        <p className="result-label">送信前の確認</p>
        <h4>{isRealLinePush ? "本番LINEへ1通送信しますか？" : "この内容でデモ保存しますか？"}</h4>
      </div>
      <div className="status-pill-list">
        {isRealLinePush ? (
          <>
            <span className="status-pill status-pill-danger">本番LINE送信</span>
            <span className="status-pill status-pill-danger">1通だけ</span>
            <span className="status-pill status-pill-danger">再送信禁止</span>
          </>
        ) : (
          <>
            <span className="status-pill">これはデモ保存です</span>
            <span className="status-pill">デモ用</span>
            <span className="status-pill">本物のLINEには送信されません</span>
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
        <dt>利用先</dt>
        <dd>{tenantId}</dd>
        <dt>送信種別</dt>
        <dd>
          {isRealLinePush
            ? "本番LINEへ1通だけ送信します。retry / broadcast / multicastは禁止です。"
            : "デモ用。本物LINEには送信されません。"}
        </dd>
        <dt>送信内容</dt>
        <dd className="message-body">{bodyPreview}</dd>
        <dt>注意</dt>
        <dd>
          {isRealLinePush
            ? "送信後はoperator canary windowを閉じてください。"
            : "この内容はタイムラインにスタッフ返信として保存されます。"}
        </dd>
      </dl>
      <label className="confirmation-check">
        <input
          checked={isConfirmed}
          name={isRealLinePush ? "confirm_single_canary_send" : undefined}
          onChange={(event) => onConfirmChange(event.currentTarget.checked)}
          required
          type="checkbox"
        />
        <span>
          {isRealLinePush
            ? "本番LINEへ1通だけ送信すること、再送信や一斉送信をしないこと、送信後にwindowを閉じることを確認しました。"
            : "この内容を確認しました。本物LINEには送信されず、デモ用に保存されることを理解しました。"}
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
              ? "本番LINE送信中..."
              : "本番LINEへ1通送信する"
            : pending
              ? "デモ保存中..."
              : "この内容でデモ保存する"}
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
          ? "担当者返信を本番LINEへ1通送信し、タイムラインへ保存しました。windowを閉じてください。"
          : "担当者返信をデモ用送信として確認し、タイムラインへ保存しました。"}
      </p>
      <ResultField label="保存したメッセージID" value={result.message.id} />
      <ResultField label="対応モード" value={formatResponseMode(result.customer.response_mode)} />
      <ResultField
        label="最後の担当者返信日時"
        value={result.customer.last_staff_reply_at ?? "-"}
      />
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
        label="おすすめ対応モード"
        value={formatResponseMode(result.summary.recommended_response_mode)}
      />
      <ResultField label="AIの種類" value={formatProvider(result.summary.provider)} />
      <ResultField label="保存したメッセージID" value={result.message.id} />
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
        label="おすすめ対応モード"
        value={formatResponseMode(result.recommended_response_mode)}
      />
      <ResultField label="担当者確認が必要か" value={formatBoolean(result.should_handoff)} />
      <ResultField label="AIの種類" value={formatProvider(result.provider)} />
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
        label="おすすめ対応モード"
        value={formatResponseMode(result.recommended_response_mode)}
      />
      <ResultField label="AIの種類" value={formatProvider(result.provider)} />
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
                  <dt>カテゴリ</dt>
                  <dd>{source.category}</dd>
                  <dt>情報の種類</dt>
                  <dd>{source.source_type}</dd>
                  <dt>スコア</dt>
                  <dd>{source.score}</dd>
                  <dt>抜粋</dt>
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
      <strong>アクションエラー</strong>
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
    return "デモ用AI";
  }

  if (provider === "openai") {
    return "外部AI";
  }

  return "-";
}

function formatResponseMode(mode: string): string {
  const labels: Record<string, string> = {
    bot_auto: "自動対応中",
    human_required: "担当者の確認が必要",
    human_active: "担当者が対応中",
    emergency: "至急対応",
    closed: "対応完了"
  };

  return labels[mode] ?? mode;
}
