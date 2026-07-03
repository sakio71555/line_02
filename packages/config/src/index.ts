import {
  INITIAL_OFFICIAL_DOMAIN,
  INITIAL_TENANT_ID,
  INITIAL_TENANT_SLUG
} from "@amami-line-crm/shared";

export interface AppConfig {
  env: "development" | "test" | "staging" | "production";
  runtime: {
    dataBackend: AppDataBackend;
    aiProvider: AppAiProvider;
  };
  tenant: {
    id: string;
    slug: string;
    officialDomain: string;
  };
  ai: {
    model: string;
    apiKeyConfigured: boolean;
  };
  line: {
    channelId: string;
    channelSecretConfigured: boolean;
    accessTokenConfigured: boolean;
    webhookSecretPath: string;
    realPushEnabled: boolean;
    messagingEnabled: boolean;
  };
  staffLine: {
    channelId: string;
    channelSecretConfigured: boolean;
    accessTokenConfigured: boolean;
    webhookSecretPath: string;
  };
  urls: {
    appBaseUrl: string;
    apiBaseUrl: string;
    liffBaseUrl: string;
  };
}

export type AppDataBackend = "in_memory" | "supabase";
export type AppAiProvider = "mock" | "openai";

export class AppConfigError extends Error {
  constructor(
    readonly code: "invalid_runtime_config",
    readonly invalidEnvNames: string[]
  ) {
    super(`invalid_runtime_config: ${invalidEnvNames.join(", ")}`);
    this.name = "AppConfigError";
  }
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    env: parseAppEnv(env.APP_ENV),
    runtime: {
      dataBackend: parseDataBackend(env.REPOSITORY_RUNTIME),
      aiProvider: parseAiProvider(env.AI_PROVIDER)
    },
    tenant: {
      id: env.TENANT_ID ?? INITIAL_TENANT_ID,
      slug: env.TENANT_SLUG ?? INITIAL_TENANT_SLUG,
      officialDomain: INITIAL_OFFICIAL_DOMAIN
    },
    ai: {
      model: env.OPENAI_MODEL ?? "mock-model",
      apiKeyConfigured: Boolean(env.OPENAI_API_KEY)
    },
    line: {
      channelId: env.LINE_CHANNEL_ID ?? "",
      channelSecretConfigured: Boolean(env.LINE_CHANNEL_SECRET),
      accessTokenConfigured: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN),
      webhookSecretPath: env.LINE_WEBHOOK_SECRET_PATH ?? "wh_dev_amamihome",
      realPushEnabled: parseBooleanFlag(env.LINE_REAL_PUSH_ENABLED),
      messagingEnabled: parseBooleanFlag(env.LINE_MESSAGING_ENABLED)
    },
    staffLine: {
      channelId: env.STAFF_LINE_CHANNEL_ID ?? "",
      channelSecretConfigured: Boolean(env.STAFF_LINE_CHANNEL_SECRET),
      accessTokenConfigured: Boolean(env.STAFF_LINE_CHANNEL_ACCESS_TOKEN),
      webhookSecretPath: env.STAFF_LINE_WEBHOOK_SECRET_PATH ?? "staff_wh_dev_amamihome"
    },
    urls: {
      appBaseUrl: env.APP_BASE_URL ?? "http://localhost:3000",
      apiBaseUrl: env.API_BASE_URL ?? "http://localhost:4000",
      liffBaseUrl: env.LIFF_BASE_URL ?? "http://localhost:3001"
    }
  };
}

function parseAppEnv(value: string | undefined): AppConfig["env"] {
  if (value === "production" || value === "staging" || value === "test") {
    return value;
  }

  return "development";
}

function parseDataBackend(value: string | undefined): AppDataBackend {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    return "in_memory";
  }

  if (normalized === "in_memory" || normalized === "supabase") {
    return normalized;
  }

  throw new AppConfigError("invalid_runtime_config", ["REPOSITORY_RUNTIME"]);
}

function parseAiProvider(value: string | undefined): AppAiProvider {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    return "mock";
  }

  if (normalized === "mock" || normalized === "openai") {
    return normalized;
  }

  throw new AppConfigError("invalid_runtime_config", ["AI_PROVIDER"]);
}

function parseBooleanFlag(value: string | undefined): boolean {
  return normalizeEnvValue(value) === "true";
}

function normalizeEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();

  return normalized ? normalized : null;
}
