"use client";

import { ArrowRight, Search, UserRound } from "lucide-react";
import React, { useMemo, useState } from "react";

import { EmptyState, PageTitle, StatusBadge } from "../_components/ui";
import type { AdminCustomerListItem } from "../../src/admin-api";
import {
  formatCompactDateTime,
  getCustomerDisplayName,
  getCustomerResponseLabel,
  getCustomerResponseTone
} from "../../src/admin-display";

export type CustomersPageLoadResult =
  | { status: "ok"; customers: AdminCustomerListItem[] }
  | { status: "error"; message: string };

type CustomerFilter = "all" | "needs_action" | "in_progress" | "closed" | "deleted";

const customerFilters: Array<{ label: string; value: CustomerFilter }> = [
  { label: "すべて", value: "all" },
  { label: "要対応", value: "needs_action" },
  { label: "対応中", value: "in_progress" },
  { label: "完了", value: "closed" },
  { label: "削除済み", value: "deleted" }
];

export function CustomersPageView({ result }: { result: CustomersPageLoadResult }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const customers = result.status === "ok" ? result.customers : [];
  const visibleCustomers = useMemo(
    () => customers.filter((customer) => matchesCustomer(customer, query, filter)),
    [customers, filter, query]
  );

  return (
    <main>
      <PageTitle
        eyebrow="顧客管理"
        title="顧客"
        description="名前やLINEの内容から、対応するお客様を探せます。"
      />

      <div className="list-toolbar">
        <label className="search-field">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">顧客を検索</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前・LINE内容で検索"
            type="search"
            value={query}
          />
        </label>
        <div className="segmented-control" aria-label="顧客の絞り込み">
          {customerFilters.map((item) => (
            <button
              aria-pressed={filter === item.value}
              className="segment-button"
              key={item.value}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {result.status === "error" ? (
        <div className="inline-error">
          <strong>顧客を読み込めませんでした。</strong>
          <span>時間を置いて再度お試しください。</span>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState title="まだお客様が表示されていません">
          <p>LINEから問い合わせや登録が入ると、ここに表示されます。</p>
        </EmptyState>
      ) : visibleCustomers.length === 0 ? (
        <EmptyState title="条件に合うお客様がいません">
          <p>検索語や絞り込みを変更してください。</p>
        </EmptyState>
      ) : (
        <ul className="customer-card-list customer-directory" aria-label="お客様一覧カード">
          {visibleCustomers.map((customer) => (
            <li className="customer-card" key={customer.id}>
              <a href={`/customers/${encodeURIComponent(customer.id)}`}>
                <span className="customer-avatar" aria-hidden="true">
                  <UserRound size={21} />
                </span>
                <span className="customer-directory-main">
                  <span className="customer-directory-title">
                    <strong>{getCustomerDisplayName(customer)}</strong>
                    {customer.display_name && customer.display_name !== customer.name ? (
                      <small>LINE: {customer.display_name}</small>
                    ) : null}
                  </span>
                  <span className="customer-directory-message">
                    {customer.last_message_body || "メッセージはまだありません"}
                  </span>
                </span>
                <span className="customer-directory-status">
                  <StatusBadge tone={getCustomerResponseTone(customer.response_mode)}>
                    {getCustomerResponseLabel(customer.response_mode)}
                  </StatusBadge>
                  <small>{formatCompactDateTime(customer.last_message_at)}</small>
                </span>
                <ArrowRight aria-hidden="true" className="row-arrow" size={18} />
                <span className="sr-only">お客様ページを開く</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function matchesCustomer(
  customer: AdminCustomerListItem,
  rawQuery: string,
  filter: CustomerFilter
): boolean {
  const query = rawQuery.trim().toLocaleLowerCase("ja");
  const matchesQuery =
    !query ||
    [customer.name, customer.display_name, customer.last_message_body]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase("ja").includes(query));

  if (!matchesQuery) return false;
  const isArchived = customer.status === "archived";
  if (filter === "deleted") return isArchived;
  if (isArchived) return false;
  if (filter === "all") return true;
  if (filter === "needs_action") {
    return ["human_required", "emergency"].includes(customer.response_mode);
  }
  if (filter === "in_progress") return customer.response_mode === "human_active";
  return customer.response_mode === "closed";
}
