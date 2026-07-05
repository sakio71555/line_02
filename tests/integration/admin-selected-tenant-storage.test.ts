import { describe, expect, it } from "vitest";

import {
  clearSelectedTenantIdFromStorage,
  createClearSelectedTenantCookieValue,
  createSelectedTenantCookieValue,
  formatAdminApiErrorCodeForUi,
  readSelectedTenantIdFromStorage,
  SELECTED_TENANT_COOKIE_NAME,
  SELECTED_TENANT_STORAGE_KEY,
  validateSelectedTenantId,
  writeSelectedTenantIdToStorage,
  type SelectedTenantStorageLike
} from "../../apps/admin/src/selected-tenant";

describe("admin selected tenant storage boundary", () => {
  it("validates tenant selector format without treating it as permission", () => {
    expect(validateSelectedTenantId("tenant_amamihome")).toEqual({
      ok: true,
      selectedTenantId: "tenant_amamihome"
    });
    expect(validateSelectedTenantId("  tenant_other  ")).toEqual({
      ok: true,
      selectedTenantId: "tenant_other"
    });
    expect(validateSelectedTenantId("")).toEqual({
      ok: true,
      selectedTenantId: null
    });
    expect(validateSelectedTenantId("tenant invalid")).toEqual({
      ok: false,
      error: "invalid_selected_tenant_id"
    });
  });

  it("reads writes and clears selectedTenantId from storage", () => {
    const storage = new MemoryStorage();

    expect(readSelectedTenantIdFromStorage(storage)).toBeNull();
    expect(writeSelectedTenantIdToStorage(storage, "tenant_amamihome")).toEqual({
      ok: true,
      selectedTenantId: "tenant_amamihome"
    });
    expect(storage.getItem(SELECTED_TENANT_STORAGE_KEY)).toBe("tenant_amamihome");
    expect(readSelectedTenantIdFromStorage(storage)).toBe("tenant_amamihome");

    clearSelectedTenantIdFromStorage(storage);

    expect(readSelectedTenantIdFromStorage(storage)).toBeNull();
  });

  it("does not persist invalid selectedTenantId values", () => {
    const storage = new MemoryStorage();

    expect(writeSelectedTenantIdToStorage(storage, "tenant invalid")).toEqual({
      ok: false,
      error: "invalid_selected_tenant_id"
    });
    expect(storage.getItem(SELECTED_TENANT_STORAGE_KEY)).toBeNull();
  });

  it("formats cookie values for server-side Admin API forwarding without tokens", () => {
    expect(createSelectedTenantCookieValue("tenant_amamihome")).toContain(
      `${SELECTED_TENANT_COOKIE_NAME}=tenant_amamihome`
    );
    expect(createSelectedTenantCookieValue("tenant_amamihome")).toContain("SameSite=Lax");
    expect(createSelectedTenantCookieValue("tenant_amamihome")).not.toContain("Bearer");
    expect(createClearSelectedTenantCookieValue()).toContain("Max-Age=0");
  });

  it("maps selected tenant auth errors to safe UI messages", () => {
    expect(formatAdminApiErrorCodeForUi("tenant_selection_required")).toContain("会社");
    expect(formatAdminApiErrorCodeForUi("tenant_membership_denied")).toContain("アクセス");
    expect(formatAdminApiErrorCodeForUi("invalid_selected_tenant_id")).toContain("形式");
    expect(formatAdminApiErrorCodeForUi("authenticated_staff_required")).toContain("ログイン");
    expect(formatAdminApiErrorCodeForUi("unknown_error")).toBeNull();
  });
});

class MemoryStorage implements SelectedTenantStorageLike {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}
