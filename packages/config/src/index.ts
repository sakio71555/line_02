import {
  INITIAL_OFFICIAL_DOMAIN,
  INITIAL_TENANT_ID,
  INITIAL_TENANT_SLUG
} from "@amami-line-crm/shared";

export interface AppConfig {
  env: "development" | "test" | "staging" | "production";
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
  };
  urls: {
    appBaseUrl: string;
    apiBaseUrl: string;
    liffBaseUrl: string;
  };
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    env: parseAppEnv(env.APP_ENV),
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
      webhookSecretPath: env.LINE_WEBHOOK_SECRET_PATH ?? "wh_dev_amamihome"
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
