import type { StaffAuthLookup } from "@amami-line-crm/domain";

import type { AuthenticatedAdminRuntimeDependencies } from "./authenticated-runtime";
import {
  createSupabaseAuthSessionVerifier,
  type SupabaseAuthClientLike
} from "./supabase-auth-session-verifier";

export const ADMIN_AUTH_SESSION_VERIFIER_ENV_NAME = "AUTH_SESSION_VERIFIER";
export const SUPABASE_AUTH_SESSION_VERIFIER_MODE = "supabase";

export interface ProductionAdminAuthRuntimeGateInput {
  env: NodeJS.ProcessEnv;
  supabaseAuthClient?: SupabaseAuthClientLike | undefined;
  staffAuthLookup?: StaffAuthLookup | undefined;
}

export function createProductionAdminAuthRuntimeDependencies(
  input: ProductionAdminAuthRuntimeGateInput
): AuthenticatedAdminRuntimeDependencies | undefined {
  const mode = input.env[ADMIN_AUTH_SESSION_VERIFIER_ENV_NAME]?.trim().toLowerCase();

  if (mode !== SUPABASE_AUTH_SESSION_VERIFIER_MODE) {
    return undefined;
  }

  if (!input.supabaseAuthClient || !input.staffAuthLookup) {
    return undefined;
  }

  return {
    sessionVerifier: createSupabaseAuthSessionVerifier(input.supabaseAuthClient),
    staffAuthLookup: input.staffAuthLookup
  };
}
