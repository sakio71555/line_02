import { ArrowRight, CalendarClock, CheckCircle2, CircleHelp } from "lucide-react";
import React from "react";

import { EmptyState, PageTitle, StatusBadge } from "../_components/ui";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import {
  getAdminCustomers,
  listAlerts,
  type AdminAlertListItem,
  type AdminCustomerListItem
} from "../../src/admin-api";
import {
  formatCompactDateTime,
  getAlertPresentation,
  getAlertPriorityLabel,
  getAlertTone,
  isLikelyTestAlert
} from "../../src/admin-display";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const requestOptions = await getServerAdminApiRequestOptions();
  let alerts: AdminAlertListItem[] = [];
  let customers: AdminCustomerListItem[] = [];
  let loadError = false;

  const [alertResult, customerResult] = await Promise.allSettled([
    listAlerts(undefined, requestOptions),
    getAdminCustomers(requestOptions)
  ]);

  if (alertResult.status === "fulfilled") {
    alerts = alertResult.value.alerts;
  } else {
    loadError = true;
  }

  if (customerResult.status === "fulfilled") {
    customers = customerResult.value.customers;
  }

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const activeAlerts = alerts.filter((alert) => !["resolved", "dismissed"].includes(alert.status));
  const testAlerts = activeAlerts.filter(isLikelyTestAlert);
  const active = sortAlertsByPriority(activeAlerts.filter((alert) => !isLikelyTestAlert(alert)));
  const completed = alerts.filter(
    (alert) => ["resolved", "dismissed"].includes(alert.status) && !isLikelyTestAlert(alert)
  );

  return (
    <main>
      <PageTitle
        eyebrow="対応管理"
        title="タスク"
        description="上から順に開き、内容を確認してお客様へ返信してください。"
      />

      {loadError ? <div className="inline-error">タスクを読み込めませんでした。</div> : null}

      <section className="task-summary" aria-label="タスク件数">
        <div><span>未対応</span><strong>{active.length}</strong><small>返信・確認が必要</small></div>
        <div><span>至急</span><strong>{active.filter((item) => item.severity === "critical").length}</strong><small>最優先で対応</small></div>
        <div><span>対応済み</span><strong>{completed.length}</strong><small>完了した件数</small></div>
      </section>

      <div className="task-guidance">
        <CircleHelp aria-hidden="true" size={22} />
        <div>
          <strong>何をすればよい？</strong>
          <span>一番上のカードを開き、お客様のLINE履歴を確認して返信します。</span>
        </div>
      </div>

      <section className="workspace-section">
        <h2>やること</h2>
        {active.length === 0 ? (
          <EmptyState title="現在のタスクはありません" />
        ) : (
          <TaskList alerts={active} customerMap={customerMap} />
        )}
      </section>

      {completed.length > 0 ? (
        <details className="completed-details">
          <summary><CheckCircle2 aria-hidden="true" size={18} />完了したタスク ({completed.length})</summary>
          <ul className="compact-list">
            {completed.map((task) => {
              const presentation = getAlertPresentation(task, customerMap.get(task.customer_id));
              return <li key={task.id}>{presentation.title}</li>;
            })}
          </ul>
        </details>
      ) : null}

      {testAlerts.length > 0 ? (
        <details className="completed-details task-test-details">
          <summary>確認用データ ({testAlerts.length})</summary>
          <div className="task-test-note">動作確認で作られた通知です。実際の対応件数には含めていません。</div>
          <TaskList alerts={testAlerts} customerMap={customerMap} />
        </details>
      ) : null}
    </main>
  );
}

function TaskList({
  alerts,
  customerMap
}: {
  alerts: AdminAlertListItem[];
  customerMap: Map<string, AdminCustomerListItem>;
}) {
  return (
    <ul className="task-list">
      {alerts.map((task) => {
        const presentation = getAlertPresentation(task, customerMap.get(task.customer_id));
        return (
          <li key={task.id}>
            <a href={`/customers/${encodeURIComponent(task.customer_id)}`}>
              <span
                className={`task-check ${task.severity === "critical" ? "task-check-critical" : ""}`}
                aria-hidden="true"
              >
                <CalendarClock size={19} />
              </span>
              <span className="task-main">
                <span className="task-title-row">
                  <strong>{presentation.title}</strong>
                  <StatusBadge tone={getAlertTone(task.severity)}>
                    {getAlertPriorityLabel(task.severity)}
                  </StatusBadge>
                </span>
                <span className="task-detail">{presentation.detail}</span>
                <small>受付 {formatCompactDateTime(task.created_at)}</small>
              </span>
              <span className="task-link-label">{presentation.actionLabel}</span>
              <ArrowRight aria-hidden="true" className="row-arrow" size={18} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function sortAlertsByPriority(alerts: AdminAlertListItem[]): AdminAlertListItem[] {
  const severityOrder: Record<AdminAlertListItem["severity"], number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  return [...alerts].sort((left, right) => {
    const priorityDifference = severityOrder[right.severity] - severityOrder[left.severity];
    if (priorityDifference !== 0) return priorityDifference;
    return Date.parse(left.created_at) - Date.parse(right.created_at);
  });
}
