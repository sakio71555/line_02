import Link from "next/link";

import {
  getAdminApiConfig,
  getAdminCustomerDetail,
  getAdminCustomerTimeline
} from "../../../src/admin-api";
import { CustomerActionPanel } from "./customer-actions";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const config = getAdminApiConfig();
  const detail = await loadCustomerDetail(customerId);
  const timeline = await loadCustomerTimeline(customerId);

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Local demo customer detail</p>
          <h1>顧客詳細</h1>
          <p className="meta">
            tenant: <span className="mono">{config.tenantId}</span> / customer:{" "}
            <span className="mono">{customerId}</span>
          </p>
        </div>
        <Link href="/customers">一覧へ戻る</Link>
      </div>

      <div className="notice">
        <p>
          この画面では顧客カルテ、timeline、AI/RAG mock、担当者返信mockをまとめて確認します。
        </p>
        <p className="meta">
          AI要約はsummary messageとしてtimelineへ保存されます。AI返信下書きとRAG回答案は
          確認用レスポンスのみで、LINE送信もmessage保存もしません。
        </p>
      </div>

      <section className="section">
        <h2>顧客情報</h2>
        {detail.status === "error" ? (
          <div className="error">
            <strong>APIエラー</strong>
            <pre>{detail.message}</pre>
          </div>
        ) : (
          <dl className="detail-grid">
            {customerDetailEntries(detail.customer).map(([label, value]) => (
              <FragmentPair key={label} label={label} value={formatDetailValue(value)} />
            ))}
          </dl>
        )}
      </section>

      {detail.status === "error" ? null : <CustomerActionPanel customerId={customerId} />}

      <section className="section">
        <h2>タイムライン</h2>
        {timeline.status === "error" ? (
          <div className="error">
            <strong>APIエラー</strong>
            <pre>{timeline.message}</pre>
          </div>
        ) : timeline.messages.length === 0 ? (
          <p className="empty">表示できるメッセージはまだありません。</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>created_at</th>
                  <th>role</th>
                  <th>message_type</th>
                  <th>body</th>
                  <th>line_message_id</th>
                </tr>
              </thead>
              <tbody>
                {timeline.messages.map((message) => (
                  <tr key={message.id}>
                    <td>{message.created_at}</td>
                    <td>{message.role}</td>
                    <td>{message.message_type}</td>
                    <td className="message-body">{formatDetailValue(message.body)}</td>
                    <td className="mono">{formatDetailValue(message.line_message_id)}</td>
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

function FragmentPair({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

async function loadCustomerDetail(customerId: string) {
  try {
    const response = await getAdminCustomerDetail(customerId);
    return {
      status: "ok" as const,
      customer: response.customer
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function loadCustomerTimeline(customerId: string) {
  try {
    const response = await getAdminCustomerTimeline(customerId);
    return {
      status: "ok" as const,
      messages: response.messages
    };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function customerDetailEntries(customer: Awaited<ReturnType<typeof getAdminCustomerDetail>>["customer"]) {
  return [
    ["id", customer.id],
    ["tenant_id", customer.tenant_id],
    ["line_user_id", customer.line_user_id],
    ["line_display_name", customer.line_display_name],
    ["name", customer.name],
    ["phone", customer.phone],
    ["email", customer.email],
    ["status", customer.status],
    ["response_mode", customer.response_mode],
    ["assigned_staff_id", customer.assigned_staff_id],
    ["address_area", customer.address_area],
    ["planned_area", customer.planned_area],
    ["has_land", customer.has_land],
    ["desired_timing", customer.desired_timing],
    ["temperature_score", customer.temperature_score],
    ["tags", customer.tags],
    ["last_customer_message_at", customer.last_customer_message_at],
    ["last_staff_reply_at", customer.last_staff_reply_at],
    ["created_at", customer.created_at],
    ["updated_at", customer.updated_at]
  ] as const;
}

function formatDetailValue(value: string | number | boolean | string[] | null | undefined): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}
