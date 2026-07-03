import {
  FetchOpenAiResponsesTransport,
  OpenAiProvider,
  createMockAiProvider,
  type AiProvider,
  type OpenAiResponsesFetch
} from "@amami-line-crm/ai";
import type { AppConfig } from "@amami-line-crm/config";
import {
  SupabaseRuntimeNotConfiguredError,
  createCustomerMessageRepositoriesForRuntime,
  type CustomerMessageAlertKnowledgeRepositoryBundle,
  type SupabaseEnv,
  type SupabaseRepositoryClient
} from "@amami-line-crm/db";
import {
  FetchLineMessagingTransport,
  MockLineClient,
  RealLineClient,
  type LineClient,
  type LineMessagingFetch
} from "@amami-line-crm/line";

import type { LineClientMode } from "./admin/line-real-push-gate";

export type RuntimeWiringComponent = "supabase" | "openai" | "line";
export type RuntimeWiringConfigErrorCode =
  | "supabase_runtime_not_configured"
  | "openai_runtime_not_configured"
  | "line_runtime_not_configured";

export class RuntimeWiringConfigError extends Error {
  constructor(
    readonly code: RuntimeWiringConfigErrorCode,
    readonly component: RuntimeWiringComponent,
    readonly missingEnvNames: string[]
  ) {
    super(`${code}: missing env ${missingEnvNames.join(", ")}`);
    this.name = "RuntimeWiringConfigError";
  }
}

export interface RuntimeRepositoryFactoryInput {
  config: AppConfig;
  env?: SupabaseEnv;
  supabaseClient?: SupabaseRepositoryClient;
}

export interface RuntimeAiProviderFactoryInput {
  config: AppConfig;
  env?: NodeJS.ProcessEnv;
  openAiFetch?: OpenAiResponsesFetch;
}

export interface RuntimeLineClientFactoryInput {
  config: AppConfig;
  env?: NodeJS.ProcessEnv;
  lineFetch?: LineMessagingFetch;
}

export interface RuntimeLineClientBundle {
  lineClient: LineClient;
  lineClientMode: LineClientMode;
}

export function createRuntimeRepositories(
  input: RuntimeRepositoryFactoryInput
): CustomerMessageAlertKnowledgeRepositoryBundle {
  try {
    return createCustomerMessageRepositoriesForRuntime({
      mode: input.config.runtime.dataBackend,
      ...(input.env ? { env: input.env } : {}),
      ...(input.supabaseClient ? { supabaseClient: input.supabaseClient } : {})
    });
  } catch (error) {
    if (error instanceof SupabaseRuntimeNotConfiguredError) {
      throw new RuntimeWiringConfigError(
        "supabase_runtime_not_configured",
        "supabase",
        [...error.missing, ...error.invalid]
      );
    }

    throw error;
  }
}

export function createRuntimeAiProvider(input: RuntimeAiProviderFactoryInput): AiProvider {
  if (input.config.runtime.aiProvider === "mock") {
    return createMockAiProvider();
  }

  const env = input.env ?? process.env;
  const missing = readMissingEnv(env, ["OPENAI_API_KEY", "OPENAI_MODEL"]);

  if (missing.length > 0) {
    throw new RuntimeWiringConfigError("openai_runtime_not_configured", "openai", missing);
  }

  return new OpenAiProvider({
    apiKey: readRequiredEnv(env, "OPENAI_API_KEY"),
    model: readRequiredEnv(env, "OPENAI_MODEL"),
    transport: new FetchOpenAiResponsesTransport({
      ...(input.openAiFetch ? { fetch: input.openAiFetch } : {})
    })
  });
}

export function createRuntimeLineClient(
  input: RuntimeLineClientFactoryInput
): RuntimeLineClientBundle {
  const env = input.env ?? process.env;
  const accessTokenConfigured =
    input.config.line.accessTokenConfigured ||
    Boolean(readNonEmptyEnv(env, "LINE_CHANNEL_ACCESS_TOKEN"));

  if (
    !input.config.line.messagingEnabled &&
    !input.config.line.realPushEnabled &&
    !accessTokenConfigured
  ) {
    return {
      lineClient: new MockLineClient(),
      lineClientMode: "mock"
    };
  }

  const missing = readMissingEnv(env, ["LINE_CHANNEL_ACCESS_TOKEN"]);

  if (missing.length > 0) {
    throw new RuntimeWiringConfigError("line_runtime_not_configured", "line", missing);
  }

  return {
    lineClient: new RealLineClient({
      channelAccessToken: readRequiredEnv(env, "LINE_CHANNEL_ACCESS_TOKEN"),
      transport: new FetchLineMessagingTransport({
        ...(input.lineFetch ? { fetch: input.lineFetch } : {})
      })
    }),
    lineClientMode: "real"
  };
}

function readMissingEnv(env: NodeJS.ProcessEnv, names: string[]): string[] {
  return names.filter((name) => !readNonEmptyEnv(env, name));
}

function readRequiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  return readNonEmptyEnv(env, name) ?? "";
}

function readNonEmptyEnv(env: NodeJS.ProcessEnv, name: string): string | null {
  const value = env[name]?.trim();

  return value ? value : null;
}
