"use client";

import { BellRing, Check, MessageSquareLock, UserRound } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type {
  InternalNote,
  OperationsStaffMember,
  WorkspaceSettings
} from "@amami-line-crm/domain";

import { formatCompactDateTime } from "../../../src/admin-display";
import {
  runCustomerStageAction,
  runCustomerStatusNotificationAction,
  runInternalNoteAction
} from "./actions";
import type { CustomerOperationsActionState } from "./action-types";

const initialState: CustomerOperationsActionState = { status: "idle" };

export function CustomerOperationsPanel({
  customerAvailable,
  customerId,
  currentStage,
  notes,
  settings,
  staff
}: {
  customerAvailable: boolean;
  customerId: string;
  currentStage: "initial" | "negotiation" | "aftercare";
  notes: InternalNote[];
  settings: WorkspaceSettings;
  staff: OperationsStaffMember[];
}) {
  const router = useRouter();
  const noteFormRef = useRef<HTMLFormElement>(null);
  const notificationFormRef = useRef<HTMLFormElement>(null);
  const [noteState, noteAction, notePending] = useActionState(
    runInternalNoteAction.bind(null, customerId),
    initialState
  );
  const [stageState, stageAction, stagePending] = useActionState(
    runCustomerStageAction.bind(null, customerId),
    initialState
  );
  const [notificationState, notificationAction, notificationPending] = useActionState(
    runCustomerStatusNotificationAction.bind(null, customerId),
    initialState
  );

  useEffect(() => {
    if (noteState.status === "success") {
      noteFormRef.current?.reset();
      router.refresh();
    }
  }, [noteState.status, router]);

  useEffect(() => {
    if (stageState.status === "success") router.refresh();
  }, [router, stageState.status]);

  useEffect(() => {
    if (notificationState.status === "success") {
      notificationFormRef.current?.reset();
      router.refresh();
    }
  }, [notificationState.status, router]);

  return (
    <div className="customer-operations-panel">
      <section className="customer-operations-block">
        <div className="customer-operations-heading">
          <UserRound size={18} />
          <div><h3>顧客段階</h3><p>段階に合わせて対応とLINEメニューを揃えます。</p></div>
        </div>
        <form action={stageAction} className="customer-compact-form">
          <label><span>現在の段階</span><select defaultValue={currentStage} name="menu_type">
            <option value="initial">新規・初期相談</option>
            <option value="negotiation">商談中</option>
            <option value="aftercare">契約後・アフター</option>
          </select></label>
          <label className="customer-check-row">
            <input
              disabled={!customerAvailable || !settings.rich_menu_auto_switch_enabled}
              name="apply_rich_menu"
              type="checkbox"
            />
            <span>LINEメニューも同時に切り替える</span>
          </label>
          {!settings.rich_menu_auto_switch_enabled ? <p className="form-hint">会社設定で自動切替が停止中です。</p> : null}
          <button disabled={stagePending} type="submit"><Check size={16} />{stagePending ? "更新中" : "段階を更新"}</button>
          <ActionMessage state={stageState} />
        </form>
      </section>

      <section className="customer-operations-block">
        <div className="customer-operations-heading">
          <MessageSquareLock size={18} />
          <div><h3>社内メモ・引継ぎ</h3><p>お客様には表示されません。</p></div>
        </div>
        <form action={noteAction} className="customer-compact-form" ref={noteFormRef}>
          <label><span>メモ</span><textarea name="body" placeholder="確認事項、引継ぎ、対応方針" required rows={3} /></label>
          {staff.length > 0 ? (
            <fieldset className="mention-fieldset"><legend>知らせる担当者</legend>
              <div>{staff.map((member) => <label key={member.id}><input name="mention_staff_user_ids" type="checkbox" value={member.id} /><span>{member.display_name}</span></label>)}</div>
            </fieldset>
          ) : null}
          <button disabled={notePending} type="submit">{notePending ? "保存中" : "社内メモを保存"}</button>
          <ActionMessage state={noteState} />
        </form>
        <div className="internal-note-list">
          {notes.length === 0 ? <p className="empty">社内メモはまだありません。</p> : notes.map((note) => (
            <article key={note.id}>
              <p>{note.body}</p>
              <small>{staff.find((member) => member.id === note.author_staff_user_id)?.display_name ?? "担当者"} ・ {formatCompactDateTime(note.created_at)}</small>
            </article>
          ))}
        </div>
      </section>

      {settings.customer_status_notifications_enabled ? (
        <details className="customer-status-notification">
          <summary><BellRing size={18} /><span><strong>お客様へ状況を知らせる</strong><small>確認後にLINEへ1通送信</small></span></summary>
          <form action={notificationAction} className="customer-compact-form" ref={notificationFormRef}>
            <label><span>通知内容</span><textarea name="body" placeholder="例：ご相談内容を確認中です。本日中に担当者よりご連絡します。" required rows={4} /></label>
            <label className="customer-check-row customer-check-danger"><input name="confirm_status_notification" type="checkbox" /><span>この内容をLINEへ1通送信することを確認しました</span></label>
            <button className="danger-action-button" disabled={!customerAvailable || notificationPending} type="submit">{notificationPending ? "送信中" : "LINEへ1通送信"}</button>
            <ActionMessage state={notificationState} />
          </form>
        </details>
      ) : null}
    </div>
  );
}

function ActionMessage({ state }: { state: CustomerOperationsActionState }) {
  if (state.status === "error") return <p className="form-error">{state.error}</p>;
  if (state.status === "success") return <p className="form-success">{state.message}</p>;
  return null;
}
