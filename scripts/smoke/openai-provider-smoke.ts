import { pathToFileURL } from "node:url";

import {
  FetchOpenAiResponsesTransport,
  OpenAiProvider,
  OpenAiProviderError,
  type OpenAiProviderErrorClassification,
  type OpenAiResponsesFetch
} from "@amami-line-crm/ai";

const APPROVAL_ENV_NAME = "OPENAI_REAL_API_SMOKE_APPROVED";
const DEFAULT_TIMEOUT_MS = 15_000;
const SMOKE_TENANT_ID = "tenant_amamihome";
const SMOKE_CUSTOMER_ID = "openai_internal_smoke";

export type OpenAiProviderSmokeStatus = "success" | "failed" | "not_performed";

export interface OpenAiProviderSmokeResult {
  status: OpenAiProviderSmokeStatus;
  provider: "openai" | "not_openai";
  modelConfigured: boolean;
  requestSent: boolean;
  responseReceived: boolean;
  responseBodyRecorded: false;
  promptBodyRecorded: false;
  apiKeyRecorded: false;
  reason?: string;
  errorClass?: string;
  errorStatus?: string;
  errorCode?: string;
  errorType?: string;
  errorClassification?: OpenAiProviderErrorClassification | "success";
}

export interface OpenAiProviderSmokeInput {
  env?: NodeJS.ProcessEnv;
  openAiFetch?: OpenAiResponsesFetch;
  timeoutMs?: number;
}

export interface OpenAiProviderSmokeCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runOpenAiProviderSmoke(
  input: OpenAiProviderSmokeInput = {}
): Promise<OpenAiProviderSmokeResult> {
  const env = input.env ?? process.env;
  const provider = env.AI_PROVIDER?.trim().toLowerCase();
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_MODEL?.trim();
  const approval = env[APPROVAL_ENV_NAME]?.trim();

  if (provider !== "openai") {
    return notPerformed("ai_provider_not_openai", "not_openai", Boolean(model));
  }

  if (!apiKey) {
    return notPerformed("openai_api_key_missing", "openai", Boolean(model));
  }

  if (!model) {
    return notPerformed("openai_model_missing", "openai", false);
  }

  if (approval !== "YES") {
    return notPerformed("openai_real_api_smoke_not_approved", "openai", true);
  }

  let requestSent = false;

  try {
    const providerBoundary = new OpenAiProvider({
      apiKey,
      model,
      transport: new FetchOpenAiResponsesTransport({
        fetch: input.openAiFetch ?? createTimeoutFetch(input.timeoutMs ?? DEFAULT_TIMEOUT_MS)
      })
    });

    requestSent = true;

    await providerBoundary.draftReply({
      tenant_id: SMOKE_TENANT_ID,
      customer_id: SMOKE_CUSTOMER_ID,
      conversation: [
        {
          role: "system",
          content:
            "Non-personal internal OpenAI smoke test. Return a concise staff draft only.",
          created_at: "2026-06-28T00:00:00.000Z"
        }
      ]
    });

    return {
      status: "success",
      provider: "openai",
      modelConfigured: true,
      requestSent: true,
      responseReceived: true,
      responseBodyRecorded: false,
      promptBodyRecorded: false,
      apiKeyRecorded: false
    };
  } catch (error) {
    const diagnostics = classifyOpenAiSmokeError(error);

    return {
      status: "failed",
      provider: "openai",
      modelConfigured: true,
      requestSent,
      responseReceived: false,
      responseBodyRecorded: false,
      promptBodyRecorded: false,
      apiKeyRecorded: false,
      errorClass: diagnostics.errorClass,
      errorStatus: diagnostics.errorStatus,
      errorCode: diagnostics.errorCode,
      errorType: diagnostics.errorType,
      errorClassification: diagnostics.errorClassification
    };
  }
}

export function formatOpenAiProviderSmokeResult(result: OpenAiProviderSmokeResult): string {
  const lines = [
    `openai_smoke=${result.status}`,
    `provider=${result.provider}`,
    result.modelConfigured ? "model=configured; value not displayed" : "model=not_configured",
    `request_sent=${result.requestSent ? "true" : "false"}`,
    `response_received=${result.responseReceived ? "true" : "false"}`,
    "response_body_recorded=false",
    "prompt_body_recorded=false",
    "prompt_recorded=false",
    "api_key_recorded=false"
  ];

  if (result.reason) {
    lines.push(`reason=${result.reason}`);
  }

  if (result.errorClass) {
    lines.push(`error_class=${result.errorClass}`);
  }

  if (result.errorStatus) {
    lines.push(`error_status=${result.errorStatus}`);
  }

  if (result.errorCode) {
    lines.push(`error_code=${result.errorCode}`);
  }

  if (result.errorType) {
    lines.push(`error_type=${result.errorType}`);
  }

  if (result.errorClassification) {
    lines.push(`error_classification=${result.errorClassification}`);
  }

  return `${lines.join("\n")}\n`;
}

export function classifyOpenAiSmokeError(error: unknown): {
  errorClass: string;
  errorStatus: string;
  errorCode: string;
  errorType: string;
  errorClassification: OpenAiProviderErrorClassification;
} {
  if (error instanceof OpenAiProviderError) {
    return {
      errorClass: "OpenAiProviderError",
      errorStatus: error.status === null ? "unavailable" : String(error.status),
      errorCode: error.providerCode ?? "unavailable",
      errorType: error.providerType ?? "unavailable",
      errorClassification: error.classification
    };
  }

  if (error instanceof Error && error.name.trim()) {
    return {
      errorClass: sanitizeErrorClass(error),
      errorStatus: "unavailable",
      errorCode: "unavailable",
      errorType: "unavailable",
      errorClassification:
        error.name === "AbortError" || error.name === "TimeoutError"
          ? "E_network_or_timeout"
          : "I_unknown_sanitized"
    };
  }

  return {
    errorClass: "UnknownError",
    errorStatus: "unavailable",
    errorCode: "unavailable",
    errorType: "unavailable",
    errorClassification: "I_unknown_sanitized"
  };
}

export async function runOpenAiProviderSmokeCli(
  input: OpenAiProviderSmokeInput = {}
): Promise<OpenAiProviderSmokeCliResult> {
  const result = await runOpenAiProviderSmoke(input);

  return {
    exitCode: result.status === "success" ? 0 : 1,
    stdout: formatOpenAiProviderSmokeResult(result),
    stderr: ""
  };
}

function notPerformed(
  reason: string,
  provider: OpenAiProviderSmokeResult["provider"],
  modelConfigured: boolean
): OpenAiProviderSmokeResult {
  return {
    status: "not_performed",
    provider,
    modelConfigured,
    requestSent: false,
    responseReceived: false,
    responseBodyRecorded: false,
    promptBodyRecorded: false,
    apiKeyRecorded: false,
    reason
  };
}

function createTimeoutFetch(timeoutMs: number): OpenAiResponsesFetch {
  const fetchImplementation = globalThis.fetch.bind(globalThis);

  return async (input, init) => {
    const controller = new globalThis.AbortController();
    const timeout = globalThis.setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      return await fetchImplementation(input, {
        ...init,
        signal: controller.signal
      });
    } finally {
      globalThis.clearTimeout(timeout);
    }
  };
}

function sanitizeErrorClass(error: unknown): string {
  if (error instanceof OpenAiProviderError) {
    return "OpenAiProviderError";
  }

  if (error instanceof Error && error.name.trim()) {
    return error.name.trim();
  }

  return "UnknownError";
}

async function main(): Promise<void> {
  const result = await runOpenAiProviderSmokeCli();
  process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(() => {
    process.stdout.write(
      formatOpenAiProviderSmokeResult({
        status: "failed",
        provider: "openai",
        modelConfigured: false,
        requestSent: false,
        responseReceived: false,
        responseBodyRecorded: false,
        promptBodyRecorded: false,
        apiKeyRecorded: false,
        errorClass: "UnhandledSmokeError",
        errorStatus: "unavailable",
        errorCode: "unavailable",
        errorType: "unavailable",
        errorClassification: "I_unknown_sanitized"
      })
    );
    process.exitCode = 1;
  });
}
