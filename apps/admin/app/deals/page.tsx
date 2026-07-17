import { ArrowRight, CircleDot } from "lucide-react";
import React from "react";

import { EmptyState, PageTitle, StatusBadge } from "../_components/ui";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { getAdminCustomers, type AdminCustomerListItem } from "../../src/admin-api";
import {
  formatCompactDateTime,
  getCustomerDisplayName,
  getCustomerResponseLabel,
  getCustomerResponseTone
} from "../../src/admin-display";

export const dynamic = "force-dynamic";

const dealStages = [
  { key: "needs_action", label: "要対応" },
  { key: "in_progress", label: "対応中" },
  { key: "automated", label: "自動対応" },
  { key: "closed", label: "完了" }
] as const;

type DealStage = (typeof dealStages)[number]["key"];

export default async function DealsPage() {
  const requestOptions = await getServerAdminApiRequestOptions();
  let customers: AdminCustomerListItem[] = [];
  let loadError = false;

  try {
    customers = (await getAdminCustomers(requestOptions)).customers;
  } catch {
    loadError = true;
  }

  return (
    <main>
      <PageTitle
        eyebrow="進捗管理"
        title="案件"
        description="お客様ごとの対応状況を一覧で確認します。"
      />

      {loadError ? <div className="inline-error">案件を読み込めませんでした。</div> : null}
      {customers.length === 0 ? (
        <EmptyState title="表示できる案件はありません" />
      ) : (
        <div className="deal-board" aria-label="案件の進捗">
          {dealStages.map((stage) => {
            const stageCustomers = customers.filter((customer) => getDealStage(customer) === stage.key);
            return (
              <section className="deal-column" key={stage.key}>
                <header>
                  <span><CircleDot aria-hidden="true" size={16} />{stage.label}</span>
                  <strong>{stageCustomers.length}</strong>
                </header>
                {stageCustomers.length === 0 ? (
                  <p className="deal-column-empty">該当なし</p>
                ) : (
                  <ul>
                    {stageCustomers.map((customer) => (
                      <li key={customer.id}>
                        <a href={`/customers/${encodeURIComponent(customer.id)}`}>
                          <strong>{getCustomerDisplayName(customer)}</strong>
                          <span>{customer.last_message_body || "メッセージなし"}</span>
                          <small>{formatCompactDateTime(customer.updated_at)}</small>
                          <span className="deal-card-footer">
                            <StatusBadge tone={getCustomerResponseTone(customer.response_mode)}>
                              {getCustomerResponseLabel(customer.response_mode)}
                            </StatusBadge>
                            <ArrowRight aria-hidden="true" size={17} />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function getDealStage(customer: AdminCustomerListItem): DealStage {
  if (customer.status === "archived" || customer.response_mode === "closed") return "closed";
  if (["human_required", "emergency"].includes(customer.response_mode)) return "needs_action";
  if (customer.response_mode === "human_active") return "in_progress";
  return "automated";
}
