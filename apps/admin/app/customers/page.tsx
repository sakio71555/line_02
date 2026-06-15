import Link from "next/link";

import { getAdminApiConfig, getAdminCustomers } from "../../src/admin-api";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const config = getAdminApiConfig();
  const result = await loadCustomers();

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Local demo customer list</p>
          <h1>顧客一覧</h1>
          <p className="meta">
            tenant: <span className="mono">{config.tenantId}</span>
          </p>
        </div>
        <Link href="/">トップへ戻る</Link>
      </div>

      <div className="notice">
        <p>
          demo seed投入後に、未返信確認用の顧客と返信済み確認用の顧客が表示されます。
        </p>
        <p className="meta">
          顧客データはin-memoryです。API processを再起動すると消えるため、空の場合は
          `POST /api/dev/seed-demo-data` を再実行してください。
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
                <th>status</th>
                <th>response_mode</th>
                <th>last_customer_message_at</th>
                <th>last_staff_reply_at</th>
                <th>latest message body</th>
                <th>latest message at</th>
                <th>詳細</th>
              </tr>
            </thead>
            <tbody>
              {result.customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="mono">{customer.id}</td>
                  <td>{formatValue(customer.display_name)}</td>
                  <td>{formatValue(customer.name)}</td>
                  <td>{customer.status}</td>
                  <td>{customer.response_mode}</td>
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

async function loadCustomers() {
  try {
    const response = await getAdminCustomers();
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
