import { pathToFileURL } from "node:url";

import {
  type OpenAiProviderErrorClassification,
  type OpenAiResponsesFetch
} from "@amami-line-crm/ai";

const APPROVAL_ENV_NAME = "OPENAI_REAL_API_SMOKE_APPROVED";
const DEFAULT_TIMEOUT_MS = 15_000;
const RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const RAW_SMOKE_PROMPT_PARTS = ["Return", "exactly:", "OK"];

export type OpenAiRawResponsesSmokeStatus = "success" | "failed" | "not_performed";

export interface OpenAiRawResponsesSmokeResult {
  status: OpenAiRawResponsesSmokeStatus;
  endpoint: "responses";
  modelConfigured: boolean;
  requestSent: boolean;
  responseReceived: boolean;
  responseBodyRecorded: false;
  promptBodyRecorded: false;
  apiKeyRecorded: false;
  httpStatus: string;
  timeout: boolean;
  reason?: string;
  errorClass?: string;
  errorStatus?: string;
  errorCode?: string;
  errorType?: string;
  errorClassification?: OpenAiProviderErrorClassification | "success";
}

export interface OpenAiRawResponsesSmokeInput {
  env?: NodeJS.ProcessEnv;
  openAiFetch?: OpenAiResponsesFetch;
  timeoutMs?: number;
}

export interface OpenAiRawResponsesSmokeCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runOpenAiRawResponsesSmoke(
  input: OpenAiRawResponsesSmokeInput = {}
): Promise<OpenAiRawResponsesSmokeResult> {
  const env = input.env ?? process.env;
  const provider = env.AI_PROVIDER?.trim().toLowerCase();
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_MODEL?.trim();
  const approval = env[APPROVAL_ENV_NAME]?.trim();

  if (provider !== "openai") {
    return notPerformed("ai_provider_not_openai", Boolean(model));
  }

  if (!apiKey) {
    return notPerformed("openai_api_key_missing", Boolean(model), "A_env_missing_or_malformed");
  }

  if (!model) {
    return notPerformed("openai_model_missing", false, "A_env_missing_or_malformed");
  }

  if (approval !== "YES") {
    return notPerformed("openai_real_api_smoke_not_approved", true);
  }

  const fetchImplementation =
    input.openAiFetch ?? createTimeoutFetch(input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImplementation(RESPONSES_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: RAW_SMOKE_PROMPT_PARTS.join(" "),
        max_output_tokens: 16,
        store: false
      })
    });

    const httpStatus = response.status === undefined ? "unavailable" : String(response.status);

    if (!response.ok) {
      const providerError = await readSanitizedOpenAiRawError(response);

      return {
        status: "failed",
        endpoint: "responses",
        modelConfigured: true,
        requestSent: true,
        responseReceived: true,
        responseBodyRecorded: false,
        promptBodyRecorded: false,
        apiKeyRecorded: false,
        httpStatus,
        timeout: false,
        errorClass: "OpenAiRawResponsesError",
        errorStatus: httpStatus,
        errorCode: providerError.providerCode ?? "unavailable",
        errorType: providerError.providerType ?? "unavailable",
        errorClassification: classifyRawOpenAiDiagnosticError({
          status: response.status ?? null,
          providerCode: providerError.providerCode,
          providerType: providerError.providerType
        })
      };
    }

    try {
      await response.json();
    } catch {
      return {
        status: "failed",
        endpoint: "responses",
        modelConfigured: true,
        requestSent: true,
        responseReceived: true,
        responseBodyRecorded: false,
        promptBodyRecorded: false,
        apiKeyRecorded: false,
        httpStatus,
        timeout: false,
        errorClass: "OpenAiRawResponsesParseError",
        errorStatus: httpStatus,
        errorCode: "unavailable",
        errorType: "unavailable",
        errorClassification: "G_response_parse_bug"
      };
    }

    return {
      status: "success",
      endpoint: "responses",
      modelConfigured: true,
      requestSent: true,
      responseReceived: true,
      responseBodyRecorded: false,
      promptBodyRecorded: false,
      apiKeyRecorded: false,
      httpStatus,
      timeout: false,
      errorClassification: "success"
    };
  } catch (error) {
    return {
      status: "failed",
      endpoint: "responses",
      modelConfigured: true,
      requestSent: true,
      responseReceived: false,
      responseBodyRecorded: false,
      promptBodyRecorded: false,
      apiKeyRecorded: false,
      httpStatus: "unavailable",
      timeout: isTimeoutLikeError(error),
      errorClass: sanitizeErrorClass(error),
      errorStatus: "unavailable",
      errorCode: "unavailable",
      errorType: "unavailable",
      errorClassification: "E_network_or_timeout"
    };
  }
}

export function formatOpenAiRawResponsesSmokeResult(
  result: OpenAiRawResponsesSmokeResult
): string {
  const lines = [
    `openai_raw_smoke=${result.status}`,
    `endpoint=${result.endpoint}`,
    result.modelConfigured ? "model=configured; value not displayed" : "model=not_configured",
    `request_sent=${result.requestSent ? "true" : "false"}`,
    `http_status=${result.httpStatus}`,
    `response_received=${result.responseReceived ? "true" : "false"}`,
    `timeout=${result.timeout ? "true" : "false"}`,
    "response_body_recorded=false",
    "prompt_body_recorded=false",
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

export async function runOpenAiRawResponsesSmokeCli(
  input: OpenAiRawResponsesSmokeInput = {}
): Promise<OpenAiRawResponsesSmokeCliResult> {
  const result = await runOpenAiRawResponsesSmoke(input);

  return {
    exitCode: result.status === "success" ? 0 : 1,
    stdout: formatOpenAiRawResponsesSmokeResult(result),
    stderr: ""
  };
}

export function classifyRawOpenAiDiagnosticError(input: {
  status?: number | null;
  providerCode?: string | null;
  providerType?: string | null;
}): OpenAiProviderErrorClassification {
  const status = typeof input.status === "number" ? input.status : null;

  if (status === 400) {
    return "F_request_shape_or_provider_mapping_bug";
  }

  if (status === 401 || status === 403) {
    return "C_auth_or_key_rejected";
  }

  if (status === 404) {
    return "B_model_missing_or_invalid";
  }

  if (status === 429) {
    return "D_quota_or_billing_or_project_access";
  }

  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return "E_network_or_timeout";
  }

  return "I_unknown_sanitized";
}

function notPerformed(
  reason: string,
  modelConfigured: boolean,
  errorClassification?: OpenAiProviderErrorClassification
): OpenAiRawResponsesSmokeResult {
  return {
    status: "not_performed",
    endpoint: "responses",
    modelConfigured,
    requestSent: false,
    responseReceived: false,
    responseBodyRecorded: false,
    promptBodyRecorded: false,
    apiKeyRecorded: false,
    httpStatus: "unavailable",
    timeout: false,
    reason,
    ...(errorClassification ? { errorClassification } : {})
  };
}

async function readSanitizedOpenAiRawError(
  response: Pick<OpenAiResponsesFetchResponseLike, "json">
): Promise<{ providerCode: string | null; providerType: string | null }> {
  try {
    const payload = await response.json();

    if (!isRecord(payload) || !isRecord(payload.error)) {
      return { providerCode: null, providerType: null };
    }

    return {
      providerCode: sanitizeDiagnosticToken(readOptionalString(payload.error.code)),
      providerType: sanitizeDiagnosticToken(readOptionalString(payload.error.type))
    };
  } catch {
    return { providerCode: null, providerType: null };
  }
}

interface OpenAiResponsesFetchResponseLike {
  json(): Promise<unknown>;
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

function sanitizeDiagnosticToken(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const sanitized = normalized.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 80);

  return sanitized || null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimeoutLikeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function sanitizeErrorClass(error: unknown): string {
  if (error instanceof Error && error.name.trim()) {
    return error.name.trim().replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 80);
  }

  return "UnknownError";
}

async function main(): Promise<void> {
  const result = await runOpenAiRawResponsesSmokeCli();
  process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(() => {
    process.stdout.write(
      formatOpenAiRawResponsesSmokeResult({
        status: "failed",
        endpoint: "responses",
        modelConfigured: false,
        requestSent: false,
        responseReceived: false,
        responseBodyRecorded: false,
        promptBodyRecorded: false,
        apiKeyRecorded: false,
        httpStatus: "unavailable",
        timeout: false,
        errorClass: "UnhandledRawSmokeError",
        errorStatus: "unavailable",
        errorCode: "unavailable",
        errorType: "unavailable",
        errorClassification: "I_unknown_sanitized"
      })
    );
    process.exitCode = 1;
  });
}
