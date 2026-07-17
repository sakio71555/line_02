import { CalendarCheck2, CalendarClock, CircleCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { PageTitle } from "../_components/ui";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { getAdminCustomers, getAdminReservations } from "../../src/admin-api";
import { formatCompactDateTime } from "../../src/admin-display";
import { createReservationAction } from "./actions";

export const dynamic = "force-dynamic";

const reservationLabels: Record<string, string> = { model_home: "モデルハウス", online_consultation: "オンライン相談", office_visit: "来店", after_support: "点検・アフター" };
const statusLabels: Record<string, string> = { requested: "日程調整中", confirmed: "確定", cancelled: "取消", completed: "完了" };

export default async function CalendarPage() {
  const options = await getServerAdminApiRequestOptions();
  const [reservationsResult, customersResult] = await Promise.allSettled([getAdminReservations(options), getAdminCustomers(options)]);
  const reservations = reservationsResult.status === "fulfilled" ? reservationsResult.value.reservations : [];
  const customers = customersResult.status === "fulfilled" ? customersResult.value.customers : [];
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.display_name]));

  return (
    <main>
      <PageTitle eyebrow="予定管理" title="予約・予定" description="相談予約、来店、モデルハウス、点検予定を一つの画面で確認します。" />
      <div className="calendar-layout">
        <section className="workspace-section reservation-list-section">
          <header className="calendar-section-heading"><div><h2>予定一覧</h2><p>日時の近い順に表示します。</p></div><CalendarClock size={22} /></header>
          {reservations.length === 0 ? <p className="empty">登録された予定はありません。</p> : (
            <ol className="reservation-list">{reservations.map((reservation) => (
              <li key={reservation.id}>
                <span className={`reservation-status is-${reservation.status}`}>{statusLabels[reservation.status] ?? reservation.status}</span>
                <div><strong>{reservationLabels[reservation.reservation_type] ?? reservation.reservation_type}</strong><span>{formatCompactDateTime(reservation.confirmed_start_at ?? reservation.created_at)}</span><small>{reservation.notes || "補足なし"}</small></div>
                <Link href={`/customers/${reservation.customer_id}`}><UserRound size={16} />{customerNames.get(reservation.customer_id) || "お客様詳細"}</Link>
              </li>
            ))}</ol>
          )}
        </section>
        <section className="workspace-section reservation-create-section">
          <header className="calendar-section-heading"><div><h2>予定を追加</h2><p>確定した予定を登録します。</p></div><CalendarCheck2 size={22} /></header>
          <form action={createReservationAction} className="stacked-form">
            <label><span>お客様</span><select name="customer_id" required><option value="">選択してください</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.display_name || customer.id}</option>)}</select></label>
            <label><span>予定の種類</span><select name="reservation_type"><option value="model_home">モデルハウス</option><option value="office_visit">来店</option><option value="online_consultation">オンライン相談</option><option value="after_support">点検・アフター</option></select></label>
            <div className="form-row"><label><span>開始日時</span><input name="confirmed_start_at" required type="datetime-local" /></label><label><span>終了日時</span><input name="confirmed_end_at" type="datetime-local" /></label></div>
            <label><span>状態</span><select name="status"><option value="confirmed">確定</option><option value="requested">日程調整中</option><option value="completed">完了</option><option value="cancelled">取消</option></select></label>
            <label><span>補足</span><textarea name="notes" rows={3} placeholder="打合せ内容、場所など" /></label>
            <button type="submit"><CircleCheck size={17} />予定を登録</button>
          </form>
        </section>
      </div>
    </main>
  );
}
