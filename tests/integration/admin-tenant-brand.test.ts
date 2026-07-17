import { describe, expect, it } from "vitest";

import {
  defaultTenantBrand,
  readTenantBrandProfile,
  saveTenantBrandProfile,
  TENANT_BRAND_STORAGE_KEY
} from "../../apps/admin/src/tenant-brand";

describe("admin tenant brand settings", () => {
  it("normalizes and persists a company-specific brand without credentials", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };

    const saved = saveTenantBrandProfile(storage, {
      companyName: "  株式会社サンプル  ",
      productName: "  お客様サポート  ",
      accentPreset: "forest"
    });

    expect(saved).toEqual({
      companyName: "株式会社サンプル",
      productName: "お客様サポート",
      accentPreset: "forest"
    });
    expect(readTenantBrandProfile(storage)).toEqual(saved);
    expect(values.get(TENANT_BRAND_STORAGE_KEY)).not.toContain("token");
    expect(values.get(TENANT_BRAND_STORAGE_KEY)).not.toContain("secret");
  });

  it("falls back to a safe default when stored settings are malformed", () => {
    const storage = { getItem: () => "not-json" };
    expect(readTenantBrandProfile(storage)).toEqual(defaultTenantBrand);
  });
});
