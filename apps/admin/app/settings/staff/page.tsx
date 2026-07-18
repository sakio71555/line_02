import { ArrowLeft, Clock3, ShieldCheck, UserCheck, UserRoundPlus } from "lucide-react";

import { getAdminStaffDirectory } from "../../../src/admin-api";
import { getStaffMemberDisplayState } from "../../../src/staff-management-display";
import { PageTitle, Metric } from "../../_components/ui";
import { getServerAdminApiRequestOptions } from "../../admin-api-request-options";
import { StaffManagement } from "./staff-management";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  let staff = null;

  try {
    staff = (await getAdminStaffDirectory(await getServerAdminApiRequestOptions())).staff;
  } catch {
    // The API already enforces owner-only access. Keep the browser error free of internal details.
  }

  return (
    <main>
      <PageTitle
        actions={<a className="button-link" href="/settings"><ArrowLeft size={17} />設定へ戻る</a>}
        description="管理画面を使う担当者を登録し、権限と利用状況を管理します。"
        eyebrow="会社の設定"
        title="担当者管理"
      />
      {!staff ? (
        <div className="inline-error">
          担当者情報を読み込めませんでした。管理者権限でログインしているか確認してください。
        </div>
      ) : (
        <>
          <section className="staff-summary" aria-label="担当者の利用状況">
            <Metric icon={<UserCheck size={20} />} label="利用中" value={staff.filter((member) => getStaffMemberDisplayState(member) === "active").length} />
            <Metric icon={<Clock3 size={20} />} label="招待待ち" tone="attention" value={staff.filter((member) => getStaffMemberDisplayState(member) === "invited").length} />
            <Metric icon={<ShieldCheck size={20} />} label="停止・削除" value={staff.filter((member) => ["disabled", "archived"].includes(getStaffMemberDisplayState(member))).length} />
            <Metric icon={<UserRoundPlus size={20} />} label="登録合計" value={staff.length} />
          </section>
          <StaffManagement initialStaff={staff} />
        </>
      )}
    </main>
  );
}
