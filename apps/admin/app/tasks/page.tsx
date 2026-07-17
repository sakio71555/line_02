import { ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import React from "react";

import { EmptyState, PageTitle, StatusBadge } from "../_components/ui";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { listAlerts, type AdminAlertListItem } from "../../src/admin-api";
import {
  formatCompactDateTime,
  getAlertPriorityLabel,
  getAlertTone
} from "../../src/admin-display";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const requestOptions = await getServerAdminApiRequestOptions();
  let alerts: AdminAlertListItem[] = [];
  let loadError = false;

  try {
    alerts = (await listAlerts(undefined, requestOptions)).alerts;
  } catch {
    loadError = true;
  }

  const active = alerts.filter((alert) => !["resolved", "dismissed"].includes(alert.status));
  const completed = alerts.filter((alert) => ["resolved", "dismissed"].includes(alert.status));

  return (
    <main>
      <PageTitle
        eyebrow="対応管理"
        title="タスク"
        description="お客様対応で、今やることを優先度順に確認します。"
      />

      {loadError ? <div className="inline-error">タスクを読み込めませんでした。</div> : null}

      <div className="task-summary">
        <div><strong>{active.length}</strong><span>対応中</span></div>
        <div><strong>{active.filter((item) => item.severity === "critical").length}</strong><span>至急</span></div>
        <div><strong>{completed.length}</strong><span>完了</span></div>
      </div>

      <section className="workspace-section">
        <h2>やること</h2>
        {active.length === 0 ? (
          <EmptyState title="現在のタスクはありません" />
        ) : (
          <ul className="task-list">
            {active.map((task) => (
              <li key={task.id}>
                <a href={`/customers/${encodeURIComponent(task.customer_id)}`}>
                  <span className="task-check" aria-hidden="true"><CalendarClock size={19} /></span>
                  <span className="task-main">
                    <strong>{task.message}</strong>
                    <small>受付 {formatCompactDateTime(task.created_at)}</small>
                  </span>
                  <StatusBadge tone={getAlertTone(task.severity)}>
                    {getAlertPriorityLabel(task.severity)}
                  </StatusBadge>
                  <ArrowRight aria-hidden="true" className="row-arrow" size={18} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {completed.length > 0 ? (
        <details className="completed-details">
          <summary><CheckCircle2 aria-hidden="true" size={18} />完了したタスク ({completed.length})</summary>
          <ul className="compact-list">
            {completed.map((task) => <li key={task.id}>{task.message}</li>)}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
