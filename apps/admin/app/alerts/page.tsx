import Link from "next/link";

import { AlertActionPanel } from "./alert-actions";
import {
  getAdminApiConfig,
  listAlerts,
  type AdminAlertListItem
} from "../../src/admin-api";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const config = getAdminApiConfig();
  const alerts = await loadAlerts();

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Development alert UI</p>
          <h1>アラート</h1>
          <p className="meta">
            tenant: <span className="mono">{config.tenantId}</span> / API:{" "}
            <span className="mono">{config.apiBaseUrl}</span>
          </p>
        </div>
        <Link href="/">トップへ戻る</Link>
      </div>

      <div className="notice">
        <p>
          現在は未返信チェックとMockStaffNotifier通知をローカルで確認する画面です。
          本番LINEグループ通知、Slack通知、scheduler、Supabase永続化は未接続です。
        </p>
      </div>

      <AlertActionPanel />

      <section className="section">
        <h2>alert一覧</h2>
        {alerts.status === "error" ? (
          <div className="error">
            <strong>APIエラー</strong>
            <pre>{alerts.message}</pre>
          </div>
        ) : alerts.alerts.length === 0 ? (
          <p className="empty">表示できるalertはまだありません。</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>status</th>
                  <th>severity</th>
                  <th>type</th>
                  <th>customer_id</th>
                  <th>message</th>
                  <th>notified_at</th>
                  <th>created_at</th>
                </tr>
              </thead>
              <tbody>
                {alerts.alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.status}</td>
                    <td>{alert.severity}</td>
                    <td>{alert.type}</td>
                    <td className="mono">
                      <Link href={`/customers/${encodeURIComponent(alert.customer_id)}`}>
                        {alert.customer_id}
                      </Link>
                    </td>
                    <td className="message-body">{alert.message}</td>
                    <td>{formatNullable(alert.notified_at)}</td>
                    <td>{alert.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

async function loadAlerts(): Promise<
  | { status: "ok"; alerts: AdminAlertListItem[] }
  | { status: "error"; message: string }
> {
  try {
    const response = await listAlerts();

    return {
      status: "ok",
      alerts: response.alerts
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function formatNullable(value: string | null): string {
  return value ?? "-";
}
