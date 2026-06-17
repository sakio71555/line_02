import type { StaffAuthLookup } from "@amami-line-crm/domain";

import type { AuthenticatedAdminRuntimeDependencies } from "./authenticated-runtime";
import {
  createSupabaseAuthSessionVerifier,
  type SupabaseAuthClientLike
} from "./supabase-auth-session-verifier";
import {
  createDefaultProductionAdminAuthRuntimeDependencies,
  ProductionAuthRuntimeConfigError,
  type ProductionAdminAuthRuntimeFactory,
  type ProductionAuthRuntimeFetch
} from "./production-auth-runtime-factories";

export type {
  ProductionAdminAuthRuntimeFactory,
  ProductionAuthRuntimeFetch
} from "./production-auth-runtime-factories";

export const ADMIN_AUTH_SESSION_VERIFIER_ENV_NAME = "AUTH_SESSION_VERIFIER";
export const SUPABASE_AUTH_SESSION_VERIFIER_MODE = "supabase";
export const FAKE_AUTH_SESSION_VERIFIER_MODE = "fake";

export type ProductionAdminAuthRuntimeSafeFailureCode =
  | "auth_runtime_not_configured"
  | "fake_auth_session_verifier_not_allowed";

export interface ProductionAdminAuthRuntimeGateInput {
  env: NodeJS.ProcessEnv;
  supabaseAuthClient?: SupabaseAuthClientLike | undefined;
  staffAuthLookup?: StaffAuthLookup | undefined;
  productionAuthRuntimeFactory?: ProductionAdminAuthRuntimeFactory | undefined;
  fetch?: ProductionAuthRuntimeFetch | undefined;
}

export type ProductionAdminAuthRuntimeResolution =
  | {
      ok: true;
      runtime: AuthenticatedAdminRuntimeDependencies;
      mode: typeof SUPABASE_AUTH_SESSION_VERIFIER_MODE;
      dependencySource: "injected" | "factory";
    }
  | {
      ok: false;
      error: {
        code: ProductionAdminAuthRuntimeSafeFailureCode;
        missing?: string[];
        invalid?: string[];
      };
    };

type ProductionAdminAuthRuntimeSafeFailure = Extract<
  ProductionAdminAuthRuntimeResolution,
  { ok: false }
>;

export function createProductionAdminAuthRuntimeDependencies(
  input: ProductionAdminAuthRuntimeGateInput
): AuthenticatedAdminRuntimeDependencies | undefined {
  const resolution = resolveProductionAdminAuthRuntimeDependencies(input);

  return resolution.ok ? resolution.runtime : undefined;
}

export function resolveProductionAdminAuthRuntimeDependencies(
  input: ProductionAdminAuthRuntimeGateInput
): ProductionAdminAuthRuntimeResolution {
  const mode = input.env[ADMIN_AUTH_SESSION_VERIFIER_ENV_NAME]?.trim().toLowerCase();

  if (mode === FAKE_AUTH_SESSION_VERIFIER_MODE) {
    return safeFailure("fake_auth_session_verifier_not_allowed");
  }

  if (mode !== SUPABASE_AUTH_SESSION_VERIFIER_MODE) {
    return safeFailure("auth_runtime_not_configured");
  }

  if (input.supabaseAuthClient || input.staffAuthLookup) {
    if (!input.supabaseAuthClient || !input.staffAuthLookup) {
      return safeFailure("auth_runtime_not_configured");
    }

    return runtimeSuccess({
      supabaseAuthClient: input.supabaseAuthClient,
      staffAuthLookup: input.staffAuthLookup,
      dependencySource: "injected"
    });
  }

  try {
    const factory =
      input.productionAuthRuntimeFactory ?? createDefaultProductionAdminAuthRuntimeDependencies;
    const dependencies = factory({
      env: input.env,
      fetch: input.fetch
    });

    return runtimeSuccess({
      ...dependencies,
      dependencySource: "factory"
    });
  } catch (error) {
    if (error instanceof ProductionAuthRuntimeConfigError) {
      return safeFailure("auth_runtime_not_configured", {
        missing: error.missing,
        invalid: error.invalid
      });
    }

    return safeFailure("auth_runtime_not_configured");
  }
}

function runtimeSuccess(input: {
  supabaseAuthClient: SupabaseAuthClientLike;
  staffAuthLookup: StaffAuthLookup;
  dependencySource: "injected" | "factory";
}): ProductionAdminAuthRuntimeResolution {
  return {
    ok: true,
    mode: SUPABASE_AUTH_SESSION_VERIFIER_MODE,
    dependencySource: input.dependencySource,
    runtime: {
      sessionVerifier: createSupabaseAuthSessionVerifier(input.supabaseAuthClient),
      staffAuthLookup: input.staffAuthLookup
    }
  };
}

function safeFailure(
  code: ProductionAdminAuthRuntimeSafeFailureCode,
  details: { missing?: readonly string[]; invalid?: readonly string[] } = {}
): ProductionAdminAuthRuntimeResolution {
  const error: ProductionAdminAuthRuntimeSafeFailure["error"] = { code };

  if (details.missing && details.missing.length > 0) {
    error.missing = [...details.missing];
  }

  if (details.invalid && details.invalid.length > 0) {
    error.invalid = [...details.invalid];
  }

  return {
    ok: false,
    error
  };
}
