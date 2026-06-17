import Link from "next/link";

import {
  getAdminApiConfig,
  getAdminCustomerDetail,
  getAdminCustomerTimeline,
  type AdminApiRequestOptions
} from "../../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../../admin-api-request-options";
import { CustomerActionPanel } from "./customer-actions";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const requestOptions = await getServerAdminApiRequestOptions();
  const config = requestOptions.config ?? getAdminApiConfig();
  const detail = await loadCustomerDetail(customerId, requestOptions);
  const timeline = await loadCustomerTimeline(customerId, requestOptions);

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">ローカルデモ顧客詳細</p>
          <h1>顧客詳細</h1>
          <p className="meta">
            利用先ID: <span className="mono">{config.tenantId}</span> / お客様ID:{" "}
            <span className="mono">{customerId}</span>
          </p>
          <p className="meta">
            選択中の利用先:{" "}
            <span className="mono">{config.selectedTenantId ?? "未選択"}</span>
          </p>
        </div>
        <Link href="/customers">一覧へ戻る</Link>
      </div>

      <div className="notice">
        <p>
          この画面では、お客様情報、相談の流れ、AIの下書き、担当者返信をまとめて確認します。
        </p>
        <p className="meta">
          AIでまとめた内容はタイムラインへ保存されます。返信文の下書きとホームページ情報からの回答案は
          確認用で、LINE送信も保存もしません。
        </p>
        <p className="meta">
          選択中の利用先は <span className="mono">x-selected-tenant-id</span>{" "}
          でAdmin APIへ渡します。開発用 <span className="mono">x-tenant-id</span>{" "}
          は本番権限ではありません。
        </p>
      </div>

      <section className="section">
        <h2>お客様情報</h2>
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

      {detail.status === "error" ? null : (
        <CustomerActionPanel
          customerId={customerId}
          recipientLabel={getCustomerRecipientLabel(detail.customer)}
          tenantId={config.selectedTenantId ?? config.tenantId}
        />
      )}

      <section className="section">
        <h2>相談の流れ / タイムライン</h2>
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
                  <th>日時</th>
                  <th>発言者</th>
                  <th>種類</th>
                  <th>内容</th>
                  <th>LINEメッセージID</th>
                </tr>
              </thead>
              <tbody>
                {timeline.messages.map((message) => (
                  <tr key={message.id}>
                    <td>{message.created_at}</td>
                    <td>{formatMessageRole(message.role)}</td>
                    <td>{formatMessageType(message.message_type)}</td>
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

async function loadCustomerDetail(customerId: string, options: AdminApiRequestOptions) {
  try {
    const response = await getAdminCustomerDetail(customerId, options);
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

async function loadCustomerTimeline(customerId: string, options: AdminApiRequestOptions) {
  try {
    const response = await getAdminCustomerTimeline(customerId, options);
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
    ["お客様ID", customer.id],
    ["利用先ID", customer.tenant_id],
    ["LINEユーザーID（デモ）", customer.line_user_id],
    ["LINE表示名", customer.line_display_name],
    ["お名前", customer.name],
    ["電話番号", customer.phone],
    ["メール", customer.email],
    ["顧客状態", formatCustomerStatus(customer.status)],
    ["対応モード", formatResponseMode(customer.response_mode)],
    ["担当者ID", customer.assigned_staff_id],
    ["住所エリア", customer.address_area],
    ["計画エリア", customer.planned_area],
    ["土地の有無", customer.has_land],
    ["希望時期", customer.desired_timing],
    ["温度感スコア", customer.temperature_score],
    ["タグ", customer.tags],
    ["最後のお客様メッセージ", customer.last_customer_message_at],
    ["最後の担当者返信", customer.last_staff_reply_at],
    ["作成日時", customer.created_at],
    ["更新日時", customer.updated_at]
  ] as const;
}

function getCustomerRecipientLabel(
  customer: Awaited<ReturnType<typeof getAdminCustomerDetail>>["customer"]
): string {
  return customer.line_display_name || customer.name || customer.id;
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

function formatMessageRole(role: string): string {
  const labels: Record<string, string> = {
    customer: "お客様",
    bot: "自動応答",
    staff: "担当者",
    system: "システム",
    ai: "AI要約"
  };

  return labels[role] ?? role;
}

function formatMessageType(type: string): string {
  const labels: Record<string, string> = {
    text: "テキスト",
    image: "画像",
    file: "ファイル",
    form: "フォーム",
    reservation: "予約",
    alert: "アラート",
    summary: "要約"
  };

  return labels[type] ?? type;
}
