import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  RuntimeWiringConfigError,
  createRuntimeAiProvider,
  createRuntimeLineClient,
  createRuntimeRepositories
} from "../../apps/api/src/runtime-wiring";
import { AppConfigError, loadAppConfig } from "@amami-line-crm/config";
import {
  SupabaseAlertRepository,
  SupabaseCustomerRepository,
  SupabaseKnowledgePageRepository,
  SupabaseMessageRepository,
  type SupabaseEnv
} from "@amami-line-crm/db";
import { MockLineClient, RealLineClient } from "@amami-line-crm/line";

import { installTestOnlyWebSocketShim } from "../helpers/test-only-websocket";

const repoRoot = process.cwd();

installTestOnlyWebSocketShim();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Loop 151 production runtime wiring remediation", () => {
  it("keeps env-free startup on safe defaults", async () => {
    const app = createApiApp({ env: {} });
    const response = await app.fetch(new Request("http://localhost/health"));
    const body = (await response.json()) as {
      runtime: {
        data_backend: string;
        ai_provider: string;
        line_real_push_enabled: boolean;
      };
      external_connections: string;
    };

    expect(response.status).toBe(200);
    expect(body.runtime).toEqual({
      data_backend: "in_memory",
      ai_provider: "mock",
      line_real_push_enabled: false
    });
    expect(body.external_connections).toBe("disabled");
  });

  it("validates runtime env names without accepting legacy LINE_WEBHOOK_SECRET", () => {
    const config = loadAppConfig({
      LINE_WEBHOOK_SECRET: "legacy-name-is-ignored",
      LINE_WEBHOOK_SECRET_PATH: "configured-path-not-recorded"
    });

    expect(config.runtime.dataBackend).toBe("in_memory");
    expect(config.runtime.aiProvider).toBe("mock");
    expect(config.line.webhookSecretPath).toBe("configured-path-not-recorded");
  });

  it("rejects invalid runtime modes without leaking values", () => {
    expect(() => loadAppConfig({ REPOSITORY_RUNTIME: "unsafe-db" })).toThrow(AppConfigError);
    expect(() => loadAppConfig({ AI_PROVIDER: "unsafe-ai" })).toThrow(AppConfigError);

    try {
      loadAppConfig({ REPOSITORY_RUNTIME: "unsafe-db" });
    } catch (error) {
      expect(String(error)).toContain("REPOSITORY_RUNTIME");
      expect(String(error)).not.toContain("unsafe-db");
    }
  });

  it("fails fast when Supabase runtime is selected without required env", () => {
    const config = loadAppConfig({ REPOSITORY_RUNTIME: "supabase" });

    expect(() => createRuntimeRepositories({ config, env: {} })).toThrow(RuntimeWiringConfigError);

    try {
      createRuntimeRepositories({ config, env: {} });
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeWiringConfigError);
      expect((error as RuntimeWiringConfigError).code).toBe(
        "supabase_runtime_not_configured"
      );
      expect((error as RuntimeWiringConfigError).missingEnvNames).toEqual([
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_DB_URL"
      ]);
    }
  });

  it("selects Supabase repositories with fake env without opening a network connection", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const config = loadAppConfig({ REPOSITORY_RUNTIME: "supabase" });

    const bundle = createRuntimeRepositories({ config, env: fakeSupabaseEnv() });

    expect(bundle.runtime_mode).toBe("supabase");
    expect(bundle.customerRepository).toBeInstanceOf(SupabaseCustomerRepository);
    expect(bundle.messageRepository).toBeInstanceOf(SupabaseMessageRepository);
    expect(bundle.alertRepository).toBeInstanceOf(SupabaseAlertRepository);
    expect(bundle.knowledgePageRepository).toBeInstanceOf(SupabaseKnowledgePageRepository);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails fast when OpenAI runtime is selected without required env", () => {
    const config = loadAppConfig({ AI_PROVIDER: "openai" });

    expect(() => createRuntimeAiProvider({ config, env: {} })).toThrow(RuntimeWiringConfigError);

    try {
      createRuntimeAiProvider({ config, env: {} });
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeWiringConfigError);
      expect((error as RuntimeWiringConfigError).code).toBe("openai_runtime_not_configured");
      expect((error as RuntimeWiringConfigError).missingEnvNames).toEqual([
        "OPENAI_API_KEY",
        "OPENAI_MODEL"
      ]);
    }
  });

  it("selects OpenAI provider with fake env without calling the API at startup", () => {
    const openAiFetch = vi.fn();
    const config = loadAppConfig({ AI_PROVIDER: "openai" });

    const provider = createRuntimeAiProvider({
      config,
      env: {
        OPENAI_API_KEY: "fake-openai-key",
        OPENAI_MODEL: "gpt-test-model"
      },
      openAiFetch
    });

    expect(provider).toHaveProperty("getRuntimeInfo");
    expect(openAiFetch).not.toHaveBeenCalled();
  });

  it("keeps LINE push on mock client when disabled even if a token is configured", () => {
    const config = loadAppConfig({
      LINE_CHANNEL_ACCESS_TOKEN: "fake-line-token",
      LINE_REAL_PUSH_ENABLED: "false"
    });

    const bundle = createRuntimeLineClient({
      config,
      env: {
        LINE_CHANNEL_ACCESS_TOKEN: "fake-line-token",
        LINE_REAL_PUSH_ENABLED: "false"
      }
    });

    expect(bundle.lineClientMode).toBe("mock");
    expect(bundle.lineClient).toBeInstanceOf(MockLineClient);
  });

  it("fails fast when LINE real push is enabled without access token", () => {
    const config = loadAppConfig({ LINE_REAL_PUSH_ENABLED: "true" });

    expect(() => createRuntimeLineClient({ config, env: {} })).toThrow(RuntimeWiringConfigError);

    try {
      createRuntimeLineClient({ config, env: {} });
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeWiringConfigError);
      expect((error as RuntimeWiringConfigError).code).toBe("line_runtime_not_configured");
      expect((error as RuntimeWiringConfigError).missingEnvNames).toEqual([
        "LINE_CHANNEL_ACCESS_TOKEN"
      ]);
    }
  });

  it("selects real LINE client with fake token without sending at startup", () => {
    const lineFetch = vi.fn();
    const config = loadAppConfig({ LINE_REAL_PUSH_ENABLED: "true" });

    const bundle = createRuntimeLineClient({
      config,
      env: {
        LINE_CHANNEL_ACCESS_TOKEN: "fake-line-token",
        LINE_REAL_PUSH_ENABLED: "true"
      },
      lineFetch
    });

    expect(bundle.lineClientMode).toBe("real");
    expect(bundle.lineClient).toBeInstanceOf(RealLineClient);
    expect(lineFetch).not.toHaveBeenCalled();
  });

  it("records Loop 151 docs without secrets or production go state", () => {
    const paths = [
      "docs/11_codex_tasks/151_production_runtime_wiring_remediation.md",
      "docs/15_runbooks/production_runtime_wiring_remediation.md",
      "docs/15_runbooks/production_readiness_final.md",
      "docs/14_dev_logs/2026-06-27.md",
      "README.md",
      "docs/08_dev_loop.md"
    ];

    for (const path of paths) {
      expect(existsSync(join(repoRoot, path))).toBe(true);
    }

    const combined = paths.map((path) => readFileSync(join(repoRoot, path), "utf8")).join("\n");

    for (const expected of [
      "runtime_wiring_ready=true",
      "REPOSITORY_RUNTIME",
      "AI_PROVIDER",
      "LINE_REAL_PUSH_ENABLED",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }

    const forbiddenPatterns = [
      new RegExp("LINE_CHANNEL_ACCESS_TOKEN" + "=.+"),
      new RegExp("LINE_CHANNEL_SECRET" + "=.+"),
      new RegExp("LINE_WEBHOOK_SECRET_PATH" + "=.+"),
      new RegExp("OPENAI_API_KEY" + "=.+"),
      new RegExp("SUPABASE_SERVICE_ROLE_KEY" + "=.+"),
      new RegExp("SUPABASE_DB_URL" + "=.+"),
      new RegExp("SUPABASE_URL" + "=https?://[^<]"),
      new RegExp("SUPABASE_ANON_KEY" + "=.+"),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("production" + "_go")
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function fakeSupabaseEnv(): SupabaseEnv {
  return {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "fake-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
    SUPABASE_DB_URL: "https://db.example.invalid"
  };
}
