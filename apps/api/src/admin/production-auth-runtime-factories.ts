import type { StaffAuthLookup, StaffTenantMembership, StaffUser } from "@amami-line-crm/domain";

import type {
  SupabaseAuthClientLike,
  SupabaseAuthGetUserResultLike,
  SupabaseAuthUserLike
} from "./supabase-auth-session-verifier";

export const productionAuthRuntimeEnvNames = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export type ProductionAuthRuntimeEnvName = (typeof productionAuthRuntimeEnvNames)[number];

export type ProductionAuthRuntimeConfigErrorCode =
  | "missing_supabase_auth_runtime_env"
  | "invalid_supabase_auth_runtime_env"
  | "missing_fetch";

export interface ProductionAuthRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}

export type ProductionAuthRuntimeFetch = (
  input: string | URL,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<ProductionAuthRuntimeFetchResponse>;

export interface ProductionAuthRuntimeFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface ProductionAdminAuthRuntimeDependencyBundle {
  supabaseAuthClient: SupabaseAuthClientLike;
  staffAuthLookup: StaffAuthLookup;
}

export interface ProductionAdminAuthRuntimeFactoryInput {
  env: NodeJS.ProcessEnv;
  fetch?: ProductionAuthRuntimeFetch | undefined;
}

export type ProductionAdminAuthRuntimeFactory = (
  input: ProductionAdminAuthRuntimeFactoryInput
) => ProductionAdminAuthRuntimeDependencyBundle;

export class ProductionAuthRuntimeConfigError extends Error {
  constructor(
    readonly code: ProductionAuthRuntimeConfigErrorCode,
    readonly missing: ProductionAuthRuntimeEnvName[] = [],
    readonly invalid: ProductionAuthRuntimeEnvName[] = []
  ) {
    super("Production Auth runtime is not configured safely.");
    this.name = "ProductionAuthRuntimeConfigError";
  }
}

export class ProductionAuthRuntimeRequestError extends Error {
  constructor(readonly operation: string) {
    super("Production Auth runtime request failed.");
    this.name = "ProductionAuthRuntimeRequestError";
  }
}

export function createDefaultProductionAdminAuthRuntimeDependencies(
  input: ProductionAdminAuthRuntimeFactoryInput
): ProductionAdminAuthRuntimeDependencyBundle {
  const config = readProductionAuthRuntimeConfigFromEnv(input.env);
  const fetchImplementation = resolveProductionAuthRuntimeFetch(input.fetch);

  return {
    supabaseAuthClient: new FetchSupabaseAuthClient(config, fetchImplementation),
    staffAuthLookup: new FetchStaffAuthLookupRepository(config, fetchImplementation)
  };
}

export function readProductionAuthRuntimeConfigFromEnv(
  env: NodeJS.ProcessEnv
): ProductionAuthRuntimeConfig {
  const missing = productionAuthRuntimeEnvNames.filter((name) => !readNonEmptyEnv(env, name));

  if (missing.length > 0) {
    throw new ProductionAuthRuntimeConfigError("missing_supabase_auth_runtime_env", missing);
  }

  const config: ProductionAuthRuntimeConfig = {
    supabaseUrl: readRequiredEnv(env, "SUPABASE_URL"),
    supabaseAnonKey: readRequiredEnv(env, "SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: readRequiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY")
  };

  if (!isValidUrl(config.supabaseUrl)) {
    throw new ProductionAuthRuntimeConfigError("invalid_supabase_auth_runtime_env", [], [
      "SUPABASE_URL"
    ]);
  }

  return config;
}

export class FetchSupabaseAuthClient implements SupabaseAuthClientLike {
  readonly auth: SupabaseAuthClientLike["auth"];

  constructor(
    private readonly config: ProductionAuthRuntimeConfig,
    private readonly fetchImplementation: ProductionAuthRuntimeFetch
  ) {
    this.auth = {
      getUser: async (accessToken: string): Promise<SupabaseAuthGetUserResultLike> => {
        const response = await this.fetchImplementation(
          createSupabaseEndpointUrl(this.config.supabaseUrl, "/auth/v1/user"),
          {
            method: "GET",
            headers: {
              apikey: this.config.supabaseAnonKey,
              authorization: `Bearer ${accessToken}`,
              accept: "application/json"
            }
          }
        );

        if (!response.ok) {
          return {
            data: { user: null },
            error: { message: "Supabase Auth request failed" }
          };
        }

        const payload = await response.json();

        return {
          data: {
            user: toSupabaseAuthUserLike(payload)
          },
          error: null
        };
      }
    };
  }
}

export class FetchStaffAuthLookupRepository implements StaffAuthLookup {
  constructor(
    private readonly config: ProductionAuthRuntimeConfig,
    private readonly fetchImplementation: ProductionAuthRuntimeFetch
  ) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    const normalizedAuthUserId = authUserId.trim();

    if (!normalizedAuthUserId) {
      return null;
    }

    const rows = await this.fetchRows<SupabaseStaffUserRow>("staff_users", {
      select: "*",
      auth_user_id: `eq.${normalizedAuthUserId}`,
      limit: "1"
    });
    const row = rows.find((candidate) => candidate.auth_user_id === normalizedAuthUserId);

    return row ? toStaffUser(row) : null;
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    const normalizedStaffUserId = staffUserId.trim();

    if (!normalizedStaffUserId) {
      return [];
    }

    const rows = await this.fetchRows<SupabaseStaffTenantMembershipRow>(
      "staff_tenant_memberships",
      {
        select: "*",
        staff_user_id: `eq.${normalizedStaffUserId}`,
        order: "created_at.asc"
      }
    );

    return rows
      .filter((row) => row.staff_user_id === normalizedStaffUserId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toStaffTenantMembership);
  }

  async activateInvitedMembershipsForStaffUserId(staffUserId: string): Promise<void> {
    const normalizedStaffUserId = staffUserId.trim();
    if (!normalizedStaffUserId) {
      return;
    }

    const response = await this.fetchImplementation(
      createSupabaseEndpointUrl(
        this.config.supabaseUrl,
        "/rest/v1/rpc/activate_staff_invited_memberships"
      ),
      {
        method: "POST",
        headers: {
          apikey: this.config.supabaseServiceRoleKey,
          authorization: `Bearer ${this.config.supabaseServiceRoleKey}`,
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({ target_staff_user_id: normalizedStaffUserId })
      }
    );

    if (!response.ok) {
      throw new ProductionAuthRuntimeRequestError("activate_staff_invited_memberships");
    }
  }

  private async fetchRows<T>(table: string, query: Record<string, string>): Promise<T[]> {
    const url = new URL(createSupabaseEndpointUrl(this.config.supabaseUrl, `/rest/v1/${table}`));

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetchImplementation(url, {
      method: "GET",
      headers: {
        apikey: this.config.supabaseServiceRoleKey,
        authorization: `Bearer ${this.config.supabaseServiceRoleKey}`,
        accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new ProductionAuthRuntimeRequestError(table);
    }

    const payload = await response.json();

    if (!Array.isArray(payload)) {
      throw new ProductionAuthRuntimeRequestError(table);
    }

    return payload as T[];
  }
}

interface SupabaseStaffUserRow {
  id: string;
  tenant_id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  role: StaffUser["role"];
  status: StaffUser["status"];
  line_user_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  disabled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseStaffTenantMembershipRow {
  id: string;
  tenant_id: string;
  staff_user_id: string;
  role: StaffTenantMembership["role"];
  status: StaffTenantMembership["status"];
  invited_at: string | null;
  accepted_at: string | null;
  disabled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

function resolveProductionAuthRuntimeFetch(
  fetchImplementation: ProductionAuthRuntimeFetch | undefined
): ProductionAuthRuntimeFetch {
  if (fetchImplementation) {
    return fetchImplementation;
  }

  if (typeof globalThis.fetch !== "function") {
    throw new ProductionAuthRuntimeConfigError("missing_fetch");
  }

  return globalThis.fetch.bind(globalThis) as ProductionAuthRuntimeFetch;
}

function readRequiredEnv(
  env: NodeJS.ProcessEnv,
  name: ProductionAuthRuntimeEnvName
): string {
  return readNonEmptyEnv(env, name) ?? "";
}

function readNonEmptyEnv(
  env: NodeJS.ProcessEnv,
  name: ProductionAuthRuntimeEnvName
): string | null {
  const value = env[name]?.trim();

  return value && value.length > 0 ? value : null;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function createSupabaseEndpointUrl(baseUrl: string, path: string): string {
  return new URL(path, normalizeBaseUrl(baseUrl)).toString();
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function toSupabaseAuthUserLike(payload: unknown): SupabaseAuthUserLike | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id = typeof payload.id === "string" ? payload.id : null;
  const email = typeof payload.email === "string" ? payload.email : null;

  if (!id) {
    return null;
  }

  return {
    id,
    email
  };
}

function toStaffUser(row: SupabaseStaffUserRow): StaffUser {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    auth_user_id: row.auth_user_id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    status: row.status,
    line_user_id: row.line_user_id,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    disabled_at: row.disabled_at,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function toStaffTenantMembership(
  row: SupabaseStaffTenantMembershipRow
): StaffTenantMembership {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    staff_user_id: row.staff_user_id,
    role: row.role,
    status: row.status,
    invited_at: row.invited_at,
    accepted_at: row.accepted_at,
    disabled_at: row.disabled_at,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
