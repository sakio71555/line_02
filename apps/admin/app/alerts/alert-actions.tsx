"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { runCheckUnrepliedAction, runNotifyOpenAction } from "./actions";
import { RoleVisibilityNote } from "../role-visibility-note";
import type { CheckUnrepliedActionState, NotifyOpenActionState } from "./action-types";

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
    <section className="section">
      <h2>アラート操作</h2>
      <p className="meta">
        現在は開発用Mock通知です。本番LINEグループ通知は後続Loopで接続します。
      </p>
      <RoleVisibilityNote variant="alerts" />
      <div className="action-grid">
        <article className="action-panel">
          <h3>未返信チェック</h3>
          <form action={runCheck} className="action-form">
            <button type="submit" disabled={checkPending}>
              {checkPending ? "チェック中..." : "未返信チェックを実行"}
            </button>
          </form>
          <CheckResult state={checkState} />
        </article>

        <article className="action-panel">
          <h3>open alert通知</h3>
          <form action={runNotify} className="action-form">
            <button type="submit" disabled={notifyPending}>
              {notifyPending ? "通知中..." : "open alert通知を実行"}
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
      <p className="result-label">check-unreplied result</p>
      <ResultField label="checked_customers" value={String(result.checked_customers)} />
      <ResultField label="alerts_created" value={String(result.alerts_created)} />
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
      <p className="result-label">notify-open result</p>
      <ResultField label="notified" value={String(result.notified)} />
      <ResultField label="failed" value={String(result.failed)} />
      <ResultField label="skipped" value={String(result.skipped)} />
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
