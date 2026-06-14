export const supabaseEnvNames = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL"
] as const;

export type SupabaseEnvName = (typeof supabaseEnvNames)[number];

export type SupabaseEnv = Record<string, string | undefined>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  dbUrl: string;
}

export class SupabaseConfigError extends Error {
  constructor(
    message: string,
    readonly missing: SupabaseEnvName[] = [],
    readonly invalid: SupabaseEnvName[] = []
  ) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

export function readSupabaseConfigFromEnv(env: SupabaseEnv = process.env): SupabaseConfig {
  const missing = supabaseEnvNames.filter((name) => !readNonEmptyEnv(env, name));

  if (missing.length > 0) {
    throw new SupabaseConfigError(`Missing required Supabase env: ${missing.join(", ")}`, missing);
  }

  const config: SupabaseConfig = {
    url: readRequiredEnv(env, "SUPABASE_URL"),
    anonKey: readRequiredEnv(env, "SUPABASE_ANON_KEY"),
    serviceRoleKey: readRequiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY"),
    dbUrl: readRequiredEnv(env, "SUPABASE_DB_URL")
  };

  const invalid = validateSupabaseUrls(config);

  if (invalid.length > 0) {
    throw new SupabaseConfigError(`Invalid Supabase env URL: ${invalid.join(", ")}`, [], invalid);
  }

  return config;
}

function readRequiredEnv(env: SupabaseEnv, name: SupabaseEnvName): string {
  return readNonEmptyEnv(env, name) ?? "";
}

function readNonEmptyEnv(env: SupabaseEnv, name: SupabaseEnvName): string | null {
  const value = env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function validateSupabaseUrls(config: SupabaseConfig): SupabaseEnvName[] {
  const invalid: SupabaseEnvName[] = [];

  if (!isValidUrl(config.url)) {
    invalid.push("SUPABASE_URL");
  }

  if (!isValidUrl(config.dbUrl)) {
    invalid.push("SUPABASE_DB_URL");
  }

  return invalid;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
