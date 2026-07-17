import { BellRing, MessageSquareText, Search, StickyNote, UserRound } from "lucide-react";
import Link from "next/link";

import { PageTitle } from "../_components/ui";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { searchAdminWorkspace, type AdminWorkspaceSearchResponse } from "../../src/admin-api";
import { formatCompactDateTime } from "../../src/admin-display";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim() ?? "";
  let result: AdminWorkspaceSearchResponse | null = null;
  let error = "";
  if (query) {
    try {
      result = await searchAdminWorkspace(query, await getServerAdminApiRequestOptions());
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    }
  }

  const total = result
    ? result.customers.length + result.messages.length + result.notes.length + result.alerts.length
    : 0;

  return (
    <main>
      <PageTitle eyebrow="横断検索" title="検索" description="お名前、電話番号、会話、社内メモ、対応内容をまとめて探します。" />
      <form className="workspace-search-form" method="get">
        <Search aria-hidden="true" size={21} />
        <input autoFocus defaultValue={query} name="q" placeholder="お名前、電話番号、会話の言葉を入力" />
        <button type="submit">検索</button>
      </form>
      {error ? <div className="inline-error">検索できませんでした。{error}</div> : null}
      {query && result ? (
        <section className="search-results">
          <header><strong>{total}件</strong><span>「{query}」の検索結果</span></header>
          {total === 0 ? <p className="empty">一致する情報はありませんでした。</p> : null}
          {result.customers.map((customer) => (
            <SearchResult key={`customer-${customer.id}`} href={`/customers/${customer.id}`} icon={<UserRound size={18} />} label="お客様" title={customer.display_name || "お名前未登録"} detail={customer.phone || customer.email || "顧客詳細を開く"} />
          ))}
          {result.messages.map(({ customer_id, message }) => (
            <SearchResult key={`message-${message.id}`} href={`/customers/${customer_id}`} icon={<MessageSquareText size={18} />} label="LINEトーク" title={message.body || "添付メッセージ"} detail={formatCompactDateTime(message.created_at)} />
          ))}
          {result.notes.map(({ customer_id, note }) => (
            <SearchResult key={`note-${note.id}`} href={`/customers/${customer_id}`} icon={<StickyNote size={18} />} label="社内メモ" title={note.body} detail={formatCompactDateTime(note.created_at)} />
          ))}
          {result.alerts.map((alert) => (
            <SearchResult key={`alert-${alert.id}`} href={`/customers/${alert.customer_id}`} icon={<BellRing size={18} />} label="対応タスク" title={alert.message} detail={formatCompactDateTime(alert.created_at)} />
          ))}
        </section>
      ) : !query ? <div className="search-placeholder"><Search size={28} /><strong>必要な情報をすぐ見つけられます</strong><span>お客様の氏名や会話の一部から検索してください。</span></div> : null}
    </main>
  );
}

function SearchResult({ detail, href, icon, label, title }: { detail: string; href: string; icon: React.ReactNode; label: string; title: string }) {
  return <Link className="search-result-row" href={href}><span className="search-result-icon">{icon}</span><span><small>{label}</small><strong>{title}</strong><em>{detail}</em></span><span aria-hidden="true">→</span></Link>;
}
