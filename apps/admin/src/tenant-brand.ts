export const TENANT_BRAND_STORAGE_KEY = "amami-line-crm.tenant-brand.v1";
export const TENANT_BRAND_UPDATED_EVENT = "amami-line-crm:tenant-brand-updated";

export const accentPresets = {
  ocean: { accent: "#176b87", accentStrong: "#0d4f68", label: "オーシャン" },
  forest: { accent: "#28745b", accentStrong: "#185540", label: "フォレスト" },
  charcoal: { accent: "#48566a", accentStrong: "#2f3a4a", label: "チャコール" },
  sunrise: { accent: "#b8652c", accentStrong: "#85451f", label: "サンライズ" }
} as const;

export type TenantAccentPreset = keyof typeof accentPresets;

export interface TenantBrandProfile {
  companyName: string;
  productName: string;
  accentPreset: TenantAccentPreset;
}

export const defaultTenantBrand: TenantBrandProfile = {
  companyName: "アマミホーム",
  productName: "顧客対応デスク",
  accentPreset: "ocean"
};

export function readTenantBrandProfile(storage: Pick<Storage, "getItem">): TenantBrandProfile {
  const stored = storage.getItem(TENANT_BRAND_STORAGE_KEY);

  if (!stored) {
    return defaultTenantBrand;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<TenantBrandProfile>;
    const accentPreset = isTenantAccentPreset(parsed.accentPreset)
      ? parsed.accentPreset
      : defaultTenantBrand.accentPreset;

    return {
      companyName: normalizeBrandText(parsed.companyName, defaultTenantBrand.companyName),
      productName: normalizeBrandText(parsed.productName, defaultTenantBrand.productName),
      accentPreset
    };
  } catch {
    return defaultTenantBrand;
  }
}

export function saveTenantBrandProfile(
  storage: Pick<Storage, "setItem">,
  profile: TenantBrandProfile
): TenantBrandProfile {
  const normalized = {
    companyName: normalizeBrandText(profile.companyName, defaultTenantBrand.companyName),
    productName: normalizeBrandText(profile.productName, defaultTenantBrand.productName),
    accentPreset: isTenantAccentPreset(profile.accentPreset)
      ? profile.accentPreset
      : defaultTenantBrand.accentPreset
  } satisfies TenantBrandProfile;

  storage.setItem(TENANT_BRAND_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function normalizeBrandText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().slice(0, 40);
  return normalized || fallback;
}

function isTenantAccentPreset(value: unknown): value is TenantAccentPreset {
  return typeof value === "string" && Object.hasOwn(accentPresets, value);
}
