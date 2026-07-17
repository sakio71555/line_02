"use client";

import {
  AlertTriangle,
  Archive,
  CopyX,
  SendHorizontal,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import React, { useActionState, useEffect, useState } from "react";

import {
  ADMIN_BROADCAST_CONFIRMATION_VALUE,
  type AdminBroadcastPreviewResponse
} from "../../src/admin-api";
import { PageTitle } from "../_components/ui";
import { runBroadcastAction, type BroadcastActionState } from "./actions";

export type BroadcastPageLoadResult =
  | { status: "ok"; preview: AdminBroadcastPreviewResponse }
  | { status: "error"; message: string };

const initialState: BroadcastActionState = { status: "idle" };

export function BroadcastPageView({ result }: { result: BroadcastPageLoadResult }) {
  const [state, runBroadcast, pending] = useActionState(runBroadcastAction, initialState);
  const [body, setBody] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    if (state.status !== "success" && !idempotencyKey) {
      setIdempotencyKey(createBroadcastIdempotencyKey());
    }
  }, [idempotencyKey, state.status]);

  const preview = result.status === "ok" ? result.preview : null;
  const overLimit = Boolean(
    preview && preview.eligible_recipients > preview.max_recipients
  );
  const canSend = Boolean(
    preview &&
      preview.broadcast_enabled &&
      preview.eligible_recipients > 0 &&
      !overLimit &&
      body.trim() &&
      confirmed &&
      confirmation === ADMIN_BROADCAST_CONFIRMATION_VALUE &&
      idempotencyKey &&
      state.status !== "success"
  );

  return (
    <main>
      <PageTitle
        eyebrow="LINE配信"
        title="一斉メッセージ"
        description="LINEにつながっているお客様全員へ、同じ内容を1回だけ送信します。"
      />

      {result.status === "error" ? (
        <div className="inline-error">
          <strong>送信対象を確認できませんでした。</strong>
          <span>権限とAPIの状態を確認してから、画面を再読み込みしてください。</span>
        </div>
      ) : (
        <>
          <section className="broadcast-summary" aria-label="送信対象の確認">
            <div>
              <UsersRound aria-hidden="true" size={21} />
              <strong>{preview?.eligible_recipients ?? 0}人</strong>
              <span>今回の送信対象</span>
            </div>
            <div>
              <Archive aria-hidden="true" size={21} />
              <strong>{preview?.excluded_archived ?? 0}人</strong>
              <span>削除済みのため除外</span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" size={21} />
              <strong>{preview?.excluded_without_line ?? 0}人</strong>
              <span>LINE未連携のため除外</span>
            </div>
            <div>
              <CopyX aria-hidden="true" size={21} />
              <strong>{preview?.excluded_duplicate_line ?? 0}人</strong>
              <span>同じLINE宛先の重複を除外</span>
            </div>
          </section>

          {!preview?.broadcast_enabled ? (
            <div className="broadcast-gate-notice">
              <AlertTriangle aria-hidden="true" size={20} />
              <div>
                <strong>一斉送信は現在停止中です</strong>
                <p>本番APIで一斉送信を許可した後に、この画面から送信できます。</p>
              </div>
            </div>
          ) : null}

          {overLimit ? (
            <div className="inline-error">
              <strong>安全上限を超えています。</strong>
              <span>送信対象は最大{preview?.max_recipients}人です。対象を整理してください。</span>
            </div>
          ) : null}

          <section className="workspace-section broadcast-compose-section">
            <div className="broadcast-compose-heading">
              <span className="broadcast-compose-icon"><SendHorizontal aria-hidden="true" size={22} /></span>
              <div>
                <h2>送信内容</h2>
                <p>個人名の差し込みは行わず、入力した内容をそのまま全員へ送ります。</p>
              </div>
            </div>

            <form action={runBroadcast} className="broadcast-form">
              <input name="idempotency_key" type="hidden" value={idempotencyKey} />
              <label htmlFor="broadcast-body">メッセージ</label>
              <textarea
                disabled={pending || state.status === "success"}
                id="broadcast-body"
                maxLength={5000}
                name="body"
                onChange={(event) => setBody(event.currentTarget.value)}
                placeholder="お客様全員へ送る内容を入力"
                required
                rows={8}
                value={body}
              />
              <div className="broadcast-character-count">{body.length} / 5000文字</div>

              <div className="broadcast-confirmation">
                <p>
                  送信対象と内容を確認し、確認欄に
                  <strong>「{ADMIN_BROADCAST_CONFIRMATION_VALUE}」</strong>
                  と入力してください。
                </p>
                <label htmlFor="broadcast-confirmation">確認文</label>
                <input
                  autoComplete="off"
                  disabled={pending || state.status === "success"}
                  id="broadcast-confirmation"
                  name="confirmation"
                  onChange={(event) => setConfirmation(event.currentTarget.value)}
                  required
                  type="text"
                  value={confirmation}
                />
                <label className="confirmation-check">
                  <input
                    checked={confirmed}
                    disabled={pending || state.status === "success"}
                    name="confirmed"
                    onChange={(event) => setConfirmed(event.currentTarget.checked)}
                    required
                    type="checkbox"
                  />
                  <span>
                    {preview?.eligible_recipients ?? 0}人へ1回だけ送信し、失敗時も自動再送しないことを確認しました。
                  </span>
                </label>
              </div>

              <button
                className="danger-action-button broadcast-send-button"
                disabled={!canSend || pending}
                type="submit"
              >
                {pending ? "送信しています..." : `${preview?.eligible_recipients ?? 0}人へ一斉送信する`}
              </button>
            </form>

            <BroadcastResult state={state} />
          </section>
        </>
      )}
    </main>
  );
}

function BroadcastResult({ state }: { state: BroadcastActionState }) {
  if (state.status === "idle") return null;
  if (state.status === "error") {
    return <div className="action-error">{state.error}</div>;
  }

  return (
    <div className="broadcast-result" role="status">
      <strong>一斉送信処理が完了しました。</strong>
      <span>送信成功: {state.result?.sent_count ?? 0}件</span>
      <span>送信失敗: {state.result?.failed_count ?? 0}件</span>
      <span>履歴保存失敗: {state.result?.history_record_failed_count ?? 0}件</span>
      <small>二重送信を避けるため、この結果からの再送はできません。</small>
    </div>
  );
}

function createBroadcastIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) {
    return `admin-broadcast-${globalThis.crypto.randomUUID()}`;
  }

  return `admin-broadcast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
