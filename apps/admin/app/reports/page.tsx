import { CalendarCheck2, CheckCircle2, ClockAlert, TrendingUp, UsersRound } from "lucide-react";

import { PageTitle } from "../_components/ui";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { getAdminOperationsReport } from "../../src/admin-api";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  let report = null;
  try { report = (await getAdminOperationsReport(await getServerAdminApiRequestOptions())).report; } catch { report = null; }
  return <main><PageTitle eyebrow="成果確認" title="レポート" description="顧客対応の量と進み具合を、専門用語なしで確認できます。" />
    {!report ? <div className="inline-error">レポートを読み込めませんでした。</div> : <>
      <section className="report-metrics">
        <ReportMetric icon={<UsersRound size={22} />} label="お客様" value={report.customers.total} note={`対応中 ${report.customers.active}件`} />
        <ReportMetric icon={<TrendingUp size={22} />} label="新規" value={report.customers.new} note={`情報登録済み ${report.customers.registered}件`} />
        <ReportMetric icon={<CheckCircle2 size={22} />} label="対応完了率" value={`${report.tasks.completion_rate}%`} note={`${report.tasks.completed}/${report.tasks.total}件 完了`} />
        <ReportMetric icon={<CalendarCheck2 size={22} />} label="今後の予定" value={report.reservations.upcoming} note={`予定総数 ${report.reservations.total}件`} />
      </section>
      <section className="report-panels"><div><h2>対応状況</h2><ReportBar label="完了" value={report.tasks.completed} total={report.tasks.total} /><ReportBar label="対応中・未対応" value={report.tasks.open} total={report.tasks.total} /><ReportBar label="期限超過" value={report.tasks.overdue} total={report.tasks.total} warning /></div><div><h2>予定状況</h2><ReportBar label="今後の予定" value={report.reservations.upcoming} total={report.reservations.total} /><ReportBar label="完了" value={report.reservations.completed} total={report.reservations.total} /><ReportBar label="取消" value={report.reservations.cancelled} total={report.reservations.total} warning /></div></section>
      {report.tasks.overdue > 0 ? <div className="report-attention"><ClockAlert size={20} /><span><strong>期限を過ぎた対応が{report.tasks.overdue}件あります。</strong><a href="/tasks">対応ボードで確認</a></span></div> : null}
    </>}
  </main>;
}

function ReportMetric({ icon, label, note, value }: { icon: React.ReactNode; label: string; note: string; value: number | string }) { return <div className="report-metric"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></div>; }
function ReportBar({ label, total, value, warning = false }: { label: string; total: number; value: number; warning?: boolean }) { const width = total > 0 ? Math.round(value / total * 100) : 0; return <div className="report-bar"><span><strong>{label}</strong><em>{value}件</em></span><div><i className={warning ? "is-warning" : ""} style={{ width: `${width}%` }} /></div></div>; }
