"use client";

import React, { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { runCheckUnrepliedAction, runNotifyOpenAction } from "./actions";
import { RoleVisibilityNote } from "../role-visibility-note";
import type { CheckUnrepliedActionState, NotifyOpenActionState } from "./action-types";

type FormAction = (formData: FormData) => void;

const initialCheckState: CheckUnrepliedActionState = {
  status: "idle"
};

const initialNotifyState: NotifyOpenActionState = {
  status: "idle"
};

export function AlertActionPanel() {
  const router = useRouter();
  const [checkState, runCheck, checkPending] = useActionState(
    runCheckUnrepliedAction,
    initialCheckState
  );
  const [notifyState, runNotify, notifyPending] = useActionState(
    runNotifyOpenAction,
    initialNotifyState
  );

  useEffect(() => {
    if (checkState.status === "success" || notifyState.status === "success") {
      router.refresh();
    }
  }, [checkState.status, notifyState.status, router]);

  return (
    <AlertActionPanelView
      checkPending={checkPending}
      checkState={checkState}
      notifyPending={notifyPending}
      notifyState={notifyState}
      runCheck={runCheck}
      runNotify={runNotify}
    />
  );
}

export function AlertActionPanelView({
  checkPending,
  checkState,
  notifyPending,
  notifyState,
  runCheck,
  runNotify
}: {
  checkPending: boolean;
  checkState: CheckUnrepliedActionState;
  notifyPending: boolean;
  notifyState: NotifyOpenActionState;
  runCheck: FormAction;
  runNotify: FormAction;
}) {
  return (
    <section className="section">
      <h2>未対応を確認する</h2>
      <p className="meta">
        1つ目のボタンで返せていない相談を探します。
        2つ目のボタンは、開いている相談を確認済みとして記録します。
      </p>
      <RoleVisibilityNote variant="alerts" />
      <div className="action-grid">
        <article className="action-panel">
          <div className="action-card-header">
            <p className="eyebrow">STEP 1</p>
            <h3>返せていない相談を探す</h3>
          </div>
          <div className="status-pill-list">
            <span className="status-pill">手動確認</span>
            <span className="status-pill">未対応を整理</span>
          </div>
          <p className="meta">
            お客様からの相談にまだ担当者返信がないものを確認します。
          </p>
          <form action={runCheck} className="action-form">
            <button type="submit" disabled={checkPending}>
              {checkPending ? "確認中..." : "未対応を確認する"}
            </button>
          </form>
          <CheckResult state={checkState} />
        </article>

        <article className="action-panel">
          <div className="action-card-header">
            <p className="eyebrow">STEP 2</p>
            <h3>確認済みにする</h3>
          </div>
          <div className="status-pill-list">
            <span className="status-pill">確認記録</span>
            <span className="status-pill">手動操作</span>
          </div>
          <p className="meta">
            開いている未対応の相談を、担当者が確認した状態として記録します。
          </p>
          <form action={runNotify} className="action-form">
            <button type="submit" disabled={notifyPending}>
              {notifyPending ? "記録中..." : "確認済みにする"}
            </button>
          </form>
          <NotifyResult state={notifyState} />
        </article>
      </div>
    </section>
  );
}

function CheckResult({ state }: { state: CheckUnrepliedActionState }) {
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
      <p className="result-label">確認結果</p>
      <ResultField label="確認したお客様" value={String(result.checked_customers)} />
      <ResultField label="見つかった未対応" value={String(result.alerts_created)} />
    </div>
  );
}

function NotifyResult({ state }: { state: NotifyOpenActionState }) {
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
      <p className="result-label">確認済みの記録</p>
      <ResultField label="確認済み" value={String(result.notified)} />
      <ResultField label="失敗" value={String(result.failed)} />
      <ResultField label="対象外" value={String(result.skipped)} />
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
