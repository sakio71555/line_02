export const SELECTED_TENANT_STORAGE_KEY = "amami-line-crm:selectedTenantId";
export const SELECTED_TENANT_COOKIE_NAME = "amami_line_crm_selected_tenant_id";
export const SELECTED_TENANT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

const SELECTED_TENANT_ID_PATTERN = /^tenant_[a-z0-9_]+$/u;

export type SelectedTenantErrorCode =
  | "tenant_selection_required"
  | "tenant_membership_denied"
  | "invalid_selected_tenant_id"
  | "authenticated_staff_required"
  | "session_expired"
  | "permission_denied"
  | "dev_tenant_header_not_allowed";

export interface SelectedTenantStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SelectedTenantValidationResult =
  | {
      ok: true;
      selectedTenantId: string | null;
    }
  | {
      ok: false;
      error: "invalid_selected_tenant_id";
    };

export function validateSelectedTenantId(input: unknown): SelectedTenantValidationResult {
  if (input === undefined || input === null) {
    return {
      ok: true,
      selectedTenantId: null
    };
  }

  if (typeof input !== "string") {
    return invalidSelectedTenantResult();
  }

  const selectedTenantId = input.trim();

  if (!selectedTenantId) {
    return {
      ok: true,
      selectedTenantId: null
    };
  }

  if (!SELECTED_TENANT_ID_PATTERN.test(selectedTenantId)) {
    return invalidSelectedTenantResult();
  }

  return {
    ok: true,
    selectedTenantId
  };
}

export function normalizeSelectedTenantId(input: unknown): string | null {
  const result = validateSelectedTenantId(input);

  return result.ok ? result.selectedTenantId : null;
}

export function readSelectedTenantIdFromStorage(
  storage: SelectedTenantStorageLike | null | undefined
): string | null {
  if (!storage) {
    return null;
  }

  try {
    return normalizeSelectedTenantId(storage.getItem(SELECTED_TENANT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeSelectedTenantIdToStorage(
  storage: SelectedTenantStorageLike | null | undefined,
  input: unknown
): SelectedTenantValidationResult {
  const result = validateSelectedTenantId(input);

  if (!result.ok || !storage) {
    return result;
  }

  try {
    if (result.selectedTenantId) {
      storage.setItem(SELECTED_TENANT_STORAGE_KEY, result.selectedTenantId);
    } else {
      storage.removeItem(SELECTED_TENANT_STORAGE_KEY);
    }
  } catch {
    return {
      ok: true,
      selectedTenantId: result.selectedTenantId
    };
  }

  return result;
}

export function clearSelectedTenantIdFromStorage(
  storage: SelectedTenantStorageLike | null | undefined
): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(SELECTED_TENANT_STORAGE_KEY);
  } catch {
    // Storage failures should not expose tokens or block the page render.
  }
}

export function createSelectedTenantCookieValue(selectedTenantId: string): string {
  return [
    `${SELECTED_TENANT_COOKIE_NAME}=${encodeURIComponent(selectedTenantId)}`,
    "Path=/",
    `Max-Age=${SELECTED_TENANT_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax"
  ].join("; ");
}

export function createClearSelectedTenantCookieValue(): string {
  return [`${SELECTED_TENANT_COOKIE_NAME}=`, "Path=/", "Max-Age=0", "SameSite=Lax"].join(
    "; "
  );
}

export function formatAdminApiErrorCodeForUi(errorCode: string): string | null {
  const workspaceLabels: Record<string, string> = {
    cannot_disable_current_staff_user:
      "現在ログインしている担当者は停止できません。別の管理者から操作してください。",
    last_owner_must_remain_active:
      "管理者を最低1名残す必要があります。別の担当者を管理者にしてから変更してください。",
    staff_email_already_registered:
      "このメールアドレスはすでに担当者として登録されています。",
    staff_invitation_failed:
      "招待メールを送信できませんでした。時間をおいて再送してください。",
    staff_invitation_state_save_failed:
      "招待情報を安全に保存できませんでした。画面を再読み込みして担当者の状態を確認してください。",
    staff_invitation_not_configured:
      "招待メールの設定が完了していません。システム管理者へ確認してください。",
    staff_invitation_not_required: "この担当者はすでに利用を開始しています。",
    staff_member_disabled:
      "停止中の担当者へ招待は送れません。先に担当者を利用中へ戻してください。",
    staff_member_archived:
      "削除済みの担当者は変更できません。再登録が必要な場合はシステム管理者へ確認してください。",
    staff_member_not_found: "担当者が見つかりません。画面を再読み込みしてください。",
    staff_auth_user_already_linked:
      "このログイン情報は別の担当者に連携されています。システム管理者へ確認してください。",
    invalid_staff_member_body:
      "入力内容を確認してください。担当者名、メールアドレス、権限が必要です。",
    invalid_line_menu_publication_state:
      "LINEメニューの公開状態が正しくありません。画面を再読み込みして確認してください。",
    published_line_menu_delete_forbidden:
      "公開したLINEメニューは削除できません。利用を終える場合はメニュー編集画面で公開を終了してください。",
    rich_menu_not_configured:
      "このLINEメニューはまだ公開されていません。設定画面で公開内容を確定してください。",
    workspace_settings_conflict:
      "ほかの担当者が先に設定を更新しました。画面を再読み込みしてから、もう一度変更してください。"
  };

  if (workspaceLabels[errorCode]) {
    return workspaceLabels[errorCode];
  }

  const labels: Record<SelectedTenantErrorCode, string> = {
    authenticated_staff_required:
      "ログイン確認が必要です。ログイン画面から入り直してください。",
    dev_tenant_header_not_allowed:
      "本番モードでは開発用の確認情報は使えません。ログイン済みの担当者として操作してください。",
    invalid_selected_tenant_id:
      "会社選択の形式が正しくありません。会社を選び直してください。",
    permission_denied: "この操作を行う権限がありません。",
    session_expired: "ログインの有効期限が切れています。再ログインしてください。",
    tenant_membership_denied:
      "選択した会社へアクセスできません。所属している会社を選び直してください。",
    tenant_selection_required:
      "操作する会社を選ぶ必要があります。会社選択画面で選んでください。"
  };

  return labels[errorCode as SelectedTenantErrorCode] ?? null;
}

function invalidSelectedTenantResult(): SelectedTenantValidationResult {
  return {
    ok: false,
    error: "invalid_selected_tenant_id"
  };
}
