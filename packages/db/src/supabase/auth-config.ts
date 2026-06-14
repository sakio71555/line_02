export const supabaseAuthEnvNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY"] as const;

export type SupabaseAuthEnvName = (typeof supabaseAuthEnvNames)[number];

export type SupabaseAuthEnv = Record<string, string | undefined>;

export interface SupabaseAuthConfig {
  url: string;
  anonKey: string;
}

export type SupabaseAuthConfigErrorCode =
  | "missing_supabase_url"
  | "missing_supabase_anon_key"
  | "invalid_supabase_url";

export class SupabaseAuthConfigError extends Error {
  constructor(
    message: string,
    readonly codes: SupabaseAuthConfigErrorCode[] = [],
    readonly missing: SupabaseAuthEnvName[] = [],
    readonly invalid: SupabaseAuthEnvName[] = []
  ) {
    super(message);
    this.name = "SupabaseAuthConfigError";
  }
}

export function readSupabaseAuthConfigFromEnv(
  env: SupabaseAuthEnv = process.env
): SupabaseAuthConfig {
  return validateSupabaseAuthConfig({
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY
  });
}

export function validateSupabaseAuthConfig(input: {
  url: string | null | undefined;
  anonKey: string | null | undefined;
}): SupabaseAuthConfig {
  const url = readNonEmptyValue(input.url);
  const anonKey = readNonEmptyValue(input.anonKey);
  const missing: SupabaseAuthEnvName[] = [];
  const codes: SupabaseAuthConfigErrorCode[] = [];

  if (!url) {
    missing.push("SUPABASE_URL");
    codes.push("missing_supabase_url");
  }

  if (!anonKey) {
    missing.push("SUPABASE_ANON_KEY");
    codes.push("missing_supabase_anon_key");
  }

  if (url === null || anonKey === null) {
    throw new SupabaseAuthConfigError(
      `Missing required Supabase Auth env: ${missing.join(", ")}`,
      codes,
      missing
    );
  }

  const invalid: SupabaseAuthEnvName[] = [];

  if (!isValidUrl(url)) {
    invalid.push("SUPABASE_URL");
  }

  if (invalid.length > 0) {
    throw new SupabaseAuthConfigError(
      `Invalid Supabase Auth env URL: ${invalid.join(", ")}`,
      ["invalid_supabase_url"],
      [],
      invalid
    );
  }

  return {
    url,
    anonKey
  };
}

function readNonEmptyValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
