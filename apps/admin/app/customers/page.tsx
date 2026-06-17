import Link from "next/link";

import {
  getAdminApiConfig,
  getAdminCustomers,
  type AdminApiRequestOptions
} from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const requestOptions = await getServerAdminApiRequestOptions();
  const config = requestOptions.config ?? getAdminApiConfig();
  const result = await loadCustomers(requestOptions);

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">ローカルデモ顧客一覧</p>
          <h1>顧客一覧</h1>
          <p className="meta">
            利用先ID: <span className="mono">{config.tenantId}</span>
          </p>
          <p className="meta">
            選択中の利用先:{" "}
            <span className="mono">{config.selectedTenantId ?? "未選択"}</span>
          </p>
        </div>
        <Link href="/">トップへ戻る</Link>
      </div>

      <div className="notice">
        <p>
          demo seed投入後に、未返信確認用の顧客と返信済み確認用の顧客が表示されます。
        </p>
        <p className="meta">
          顧客データは一時保存です。APIを再起動すると消えるため、空の場合はdemo seedを
          もう一度投入してください。
        </p>
        <p className="meta">
          本物のLINE送信、OpenAI API、Supabase本番DBにはまだ接続していません。
        </p>
        <p className="meta">
          選択中の利用先は <span className="mono">x-selected-tenant-id</span>{" "}
          として送られます。開発用の <span className="mono">x-tenant-id</span>{" "}
          とは別の値です。
        </p>
      </div>

      {result.status === "error" ? (
        <div className="error">
          <strong>APIエラー</strong>
          <pre>{result.message}</pre>
        </div>
      ) : result.customers.length === 0 ? (
        <p className="empty">
          表示できる顧客はまだありません。ローカルデモではdemo seedを投入してから確認します。
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>顧客ID</th>
                <th>LINE表示名</th>
                <th>顧客名</th>
                <th>顧客状態</th>
                <th>対応モード</th>
                <th>最後のお客様メッセージ</th>
                <th>最後の担当者返信</th>
                <th>最新メッセージ</th>
                <th>最新日時</th>
                <th>詳細</th>
              </tr>
            </thead>
            <tbody>
              {result.customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="mono">{customer.id}</td>
                  <td>{formatValue(customer.display_name)}</td>
                  <td>{formatValue(customer.name)}</td>
                  <td>{formatCustomerStatus(customer.status)}</td>
                  <td>{formatResponseMode(customer.response_mode)}</td>
                  <td>{formatValue(customer.last_customer_message_at)}</td>
                  <td>{formatValue(customer.last_staff_reply_at)}</td>
                  <td className="message-body">{formatValue(customer.last_message_body)}</td>
                  <td>{formatValue(customer.last_message_at)}</td>
                  <td>
                    <Link href={`/customers/${encodeURIComponent(customer.id)}`}>開く</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

async function loadCustomers(options: AdminApiRequestOptions) {
  try {
    const response = await getAdminCustomers(options);
    return {
      status: "ok" as const,
      customers: response.customers
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatCustomerStatus(status: string): string {
  const labels: Record<string, string> = {
    active: "対応中",
    closed: "対応完了"
  };

  return labels[status] ?? status;
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
