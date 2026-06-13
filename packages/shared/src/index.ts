export const INITIAL_TENANT_ID = "tenant_amamihome";
export const INITIAL_TENANT_SLUG = "amamihome";
export const INITIAL_OFFICIAL_DOMAIN = "amamihome.net";

export interface TenantScoped {
  tenant_id: string;
}

export interface Timestamped {
  created_at: string;
  updated_at: string;
}

export type ExternalConnectionMode = "disabled" | "mock" | "live";
