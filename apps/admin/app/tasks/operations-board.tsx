"use client";

import { AlertTriangle, ArrowRight, Check, Clock3, UserRound } from "lucide-react";
import React, { useActionState } from "react";

import type { OperationsStaffMember } from "@amami-line-crm/domain";

import type { AdminOperationsTask } from "../../src/admin-api";
import {
  formatCompactDateTime,
  getAlertPresentation,
  getAlertPriorityLabel,
  getAlertTone
} from "../../src/admin-display";
import { StatusBadge } from "../_components/ui";
import { updateOperationsTaskAction, type OperationsTaskActionState } from "./actions";

const initialState: OperationsTaskActionState = { status: "idle" };

export function OperationsBoard({
  staff,
  tasks
}: {
  staff: OperationsStaffMember[];
  tasks: AdminOperationsTask[];
}) {
  const columns = [
    { key: "open", label: "未対応", note: "まず担当者と期限を決めます" },
    { key: "in_progress", label: "対応中", note: "返信・確認を進めています" },
    { key: "waiting_customer", label: "お客様待ち", note: "返答や資料を待っています" },
    { key: "completed", label: "完了", note: "対応済みです" }
  ] as const;

  return (
    <div className="operations-board">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.workflow_status === column.key);
        return (
          <section className="operations-column" key={column.key}>
            <header>
              <div><h2>{column.label}</h2><p>{column.note}</p></div>
              <strong>{columnTasks.length}</strong>
            </header>
            <div className="operations-column-list">
              {columnTasks.length === 0 ? <p className="operations-empty">該当する対応はありません</p> : null}
              {columnTasks.map((task) => <OperationsTaskCard key={task.id} staff={staff} task={task} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function OperationsTaskCard({ staff, task }: { staff: OperationsStaffMember[]; task: AdminOperationsTask }) {
  const action = updateOperationsTaskAction.bind(null, task.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const dueAtValue = task.due_at ? toDateTimeLocal(task.due_at) : "";
  const presentation = getAlertPresentation(task, task.customer ?? undefined);

  return (
    <article className={`operations-task-card ${task.is_overdue ? "is-overdue" : ""}`}>
      <div className="operations-task-heading">
        <div>
          <span className="operations-customer"><UserRound size={15} />{presentation.customerName}</span>
          <h3>{presentation.title}</h3>
          {presentation.detail ? <p className="operations-task-detail">{presentation.detail}</p> : null}
        </div>
        <StatusBadge tone={getAlertTone(task.severity)}>{getAlertPriorityLabel(task.severity)}</StatusBadge>
      </div>
      <div className="operations-task-meta">
        <span><Clock3 size={15} />受付 {formatCompactDateTime(task.created_at)}</span>
        {task.due_at ? (
          <span className={task.is_overdue ? "operations-overdue" : ""}>
            {task.is_overdue ? <AlertTriangle size={15} /> : <Clock3 size={15} />}
            期限 {formatCompactDateTime(task.due_at)}
          </span>
        ) : null}
      </div>
      <form action={formAction} className="operations-task-form">
        <input name="customer_id" type="hidden" value={task.customer_id} />
        <label><span>対応状況</span><select defaultValue={task.workflow_status} name="workflow_status">
          <option value="open">未対応</option><option value="in_progress">対応中</option>
          <option value="waiting_customer">お客様待ち</option><option value="completed">完了</option>
        </select></label>
        <label><span>担当者</span><select defaultValue={task.assigned_staff_user_id ?? ""} name="assigned_staff_user_id">
          <option value="">未割り当て</option>
          {staff.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}
        </select></label>
        <label><span>返信期限</span><input defaultValue={dueAtValue} name="due_at" type="datetime-local" /></label>
        <label><span>優先度</span><select defaultValue={task.severity} name="severity">
          <option value="low">低</option><option value="medium">通常</option><option value="high">高</option>
          <option value="critical">至急</option>
        </select></label>
        <div className="operations-task-actions">
          <button disabled={pending} type="submit"><Check size={16} />{pending ? "保存中" : "更新"}</button>
          <a href={`/customers/${encodeURIComponent(task.customer_id)}`}>顧客詳細 <ArrowRight size={16} /></a>
        </div>
        {state.status === "error" ? <p className="form-error">{state.error}</p> : null}
        {state.status === "success" ? <p className="form-success">更新しました。</p> : null}
      </form>
    </article>
  );
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
