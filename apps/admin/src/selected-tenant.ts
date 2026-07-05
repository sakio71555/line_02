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
