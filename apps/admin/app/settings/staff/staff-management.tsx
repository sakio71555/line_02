"use client";

import {
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX
} from "lucide-react";
import { useActionState } from "react";

import type { AdminStaffMember, StaffRole } from "@amami-line-crm/domain";

import { formatCompactDateTime } from "../../../src/admin-display";
import { getStaffMemberDisplayState } from "../../../src/staff-management-display";
import { StatusBadge } from "../../_components/ui";
import {
  createStaffMemberAction,
  resendStaffInvitationAction,
  type StaffActionState,
  updateStaffMemberAction
} from "./actions";

const initialState: StaffActionState = { status: "idle" };

const roleLabels: Record<StaffRole, string> = {
  owner: "管理者",
  manager: "責任者",
  staff: "担当者"
};

export function StaffManagement({ initialStaff }: { initialStaff: AdminStaffMember[] }) {
  const [createState, createAction, createPending] = useActionState(
    createStaffMemberAction,
    initialState
  );

  return (
    <div className="staff-management">
      <section className="staff-create-panel" aria-labelledby="staff-create-title">
        <header>
          <div>
            <p className="eyebrow">新しい利用者</p>
            <h2 id="staff-create-title">担当者を登録</h2>
            <p>登録後、招待メールからログインを開始できます。</p>
          </div>
          <UserPlus aria-hidden="true" size={24} />
        </header>
        <form action={createAction} className="staff-create-form">
          <label><span>担当者名</span><input autoComplete="name" maxLength={120} name="display_name" placeholder="例：山田 花子" required /></label>
          <label><span>メールアドレス</span><input autoComplete="email" maxLength={320} name="email" placeholder="staff@example.com" required type="email" /></label>
          <label><span>権限</span><select defaultValue="staff" name="role"><RoleOptions /></select></label>
          <button disabled={createPending} type="submit"><UserPlus size={17} />{createPending ? "登録中" : "登録して招待"}</button>
        </form>
        <ActionMessage state={createState} />
      </section>

      <section className="staff-directory" aria-labelledby="staff-directory-title">
        <header>
          <div>
            <p className="eyebrow">登録済み</p>
            <h2 id="staff-directory-title">担当者一覧</h2>
            <p>管理者は全設定、責任者は日常運用、担当者は顧客対応を行えます。</p>
          </div>
          <strong>{initialStaff.length}名</strong>
        </header>
        {initialStaff.length === 0 ? (
          <p className="staff-empty">担当者はまだ登録されていません。</p>
        ) : (
          <div className="staff-member-list">
            {initialStaff.map((member) => <StaffMemberCard key={member.id} member={member} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function StaffMemberCard({ member }: { member: AdminStaffMember }) {
  const updateAction = updateStaffMemberAction.bind(null, member.id);
  const inviteAction = resendStaffInvitationAction.bind(null, member.id);
  const [updateState, runUpdate, updatePending] = useActionState(updateAction, initialState);
  const [inviteState, runInvite, invitePending] = useActionState(inviteAction, initialState);
  const displayState = getStaffMemberDisplayState(member);
  const archived = displayState === "archived";
  const disabled = displayState === "disabled";
  const invited = displayState === "invited";

  return (
    <article className={`staff-member-card ${disabled || archived ? "is-disabled" : ""}`}>
      <header className="staff-member-heading">
        <div>
          <strong>{member.display_name}</strong>
          <span><Mail size={15} />{member.email}</span>
        </div>
        <StatusBadge tone={disabled || archived ? "neutral" : invited ? "attention" : "success"}>
          {archived ? "削除済み" : disabled ? "停止中" : invited ? "招待待ち" : "利用中"}
        </StatusBadge>
      </header>

      <div className="staff-member-meta">
        <span><ShieldCheck size={15} />{roleLabels[member.role]}</span>
        <span><MessageCircle size={15} />LINE {member.line_linked ? "連携済み" : "未連携"}</span>
        <span>{member.last_login_at ? `最終ログイン ${formatCompactDateTime(member.last_login_at)}` : member.invited_at ? `登録 ${formatCompactDateTime(member.invited_at)}` : "ログイン前"}</span>
      </div>

      {archived ? (
        <p className="staff-empty">削除済みの担当者です。再登録が必要な場合はシステム管理者へ確認してください。</p>
      ) : (
        <form action={runUpdate} className="staff-member-form">
          <label><span>担当者名</span><input defaultValue={member.display_name} disabled={disabled} maxLength={120} name="display_name" required /></label>
          <label><span>権限</span><select defaultValue={member.role} disabled={disabled} name="role"><RoleOptions /></select></label>
          <div className="staff-member-actions">
            {!disabled ? <button disabled={updatePending} name="intent" type="submit" value="save"><Save size={16} />{updatePending ? "保存中" : "変更を保存"}</button> : null}
            <button className={disabled ? "secondary-action-button" : "danger-action-button"} disabled={updatePending} name="intent" type="submit" value={disabled ? "enable" : "disable"}>
              {disabled ? <UserCheck size={16} /> : <UserX size={16} />}
              {updatePending ? "更新中" : disabled ? "利用を再開" : "利用を停止"}
            </button>
          </div>
          <ActionMessage state={updateState} />
        </form>
      )}

      {invited ? (
        <form action={runInvite} className="staff-invite-action">
          <button className="secondary-action-button" disabled={invitePending} type="submit"><RefreshCw size={16} />{invitePending ? "送信中" : "招待メールを再送"}</button>
          <ActionMessage state={inviteState} />
        </form>
      ) : null}
    </article>
  );
}

function RoleOptions() {
  return <><option value="staff">担当者</option><option value="manager">責任者</option><option value="owner">管理者</option></>;
}

function ActionMessage({ state }: { state: StaffActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return <p className={state.status === "error" ? "form-error" : "form-success"}>{state.message}</p>;
}
