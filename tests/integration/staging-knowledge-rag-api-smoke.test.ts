import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  loadStagingDatabaseConfig,
  parseEnvFile,
  resolveProjectPath
} from "../../scripts/dev-loop/lib/staging-psql.mjs";
import { MockAiProvider, type AiRagAnswerDraftInput } from "@amami-line-crm/ai";
import {
  createSupabaseCustomerMessageRepositoriesFromEnv,
  type SupabaseEnv
} from "@amami-line-crm/db";

const runStagingSmoke = process.env.RUN_STAGING_KNOWLEDGE_RAG_SMOKE === "1";
const describeStagingSmoke = runStagingSmoke ? describe : describe.skip;
const tenantId = "tenant_amamihome";

class RecordingMockAiProvider extends MockAiProvider {
  readonly ragAnswerCalls: AiRagAnswerDraftInput[] = [];

  override async draftRagAnswer(input: AiRagAnswerDraftInput) {
    this.ragAnswerCalls.push(input);
    return super.draftRagAnswer(input);
  }
}

describe("staging knowledge/RAG API smoke safety", () => {
  it("keeps staging knowledge/RAG smoke explicit and avoids secret or external API patterns", () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const script = readFileSync(
      resolve(repoRoot, "scripts/dev-loop/smoke-staging-knowledge-rag-api.mjs"),
      "utf8"
    );
    const testSource = readFileSync(fileURLToPath(import.meta.url), "utf8");

    expect(script).toContain("RUN_STAGING_KNOWLEDGE_RAG_SMOKE");
    expect(script).toContain("verify-staging-env.mjs");
    expect(script).toContain("verify-staging-schema.mjs");
    expect(script).toContain("verify-staging-postgrest-grants.mjs");
    expect(script).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(script).not.toContain("SUPABASE_DB_URL");
    expect(script).not.toContain("supabase db push");
    expect(script).not.toContain("OPENAI_API_KEY");
    expect(script).not.toContain("AI_PROVIDER=openai");
    expect(script).not.toContain("LINE_REAL_PUSH_ENABLED=true");
    expect(testSource).toContain('REPOSITORY_RUNTIME: "supabase"');
    expect(testSource).toContain('LINE_REAL_PUSH_ENABLED: "false"');
    expect(testSource).toContain('AI_PROVIDER: "mock"');
  });
});

describeStagingSmoke("staging knowledge/RAG API smoke", () => {
  it("searches and drafts from Supabase knowledge pages with tenant and allowed_for_ai filters", async () => {
    const env = loadSmokeEnv();
    const aiProvider = new RecordingMockAiProvider();
    const app = createApiApp({
      customerMessageRepositories: createSupabaseCustomerMessageRepositoriesFromEnv(env),
      aiProvider,
      env: createApiEnv(env)
    });

    const search = await fetchJson(app, "/api/admin/rag/search", {
      method: "POST",
      body: { query: "オンライン相談", limit: 5 }
    });

    expect(search.status).toBe(200);
    expect(search.body.results?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(search.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "knowledge_staging_online",
          tenant_id: tenantId,
          url: expect.any(String)
        })
      ])
    );
    expect(search.body.results?.every((result) => result.tenant_id === tenantId)).toBe(true);
    expect(search.body.results?.some((result) => result.id === "knowledge_staging_hidden_online")).toBe(
      false
    );
    expect(search.body.results?.some((result) => result.id === "knowledge_staging_other_online")).toBe(
      false
    );
    expect(search.body.results?.some((result) => "source_url" in result)).toBe(false);

    for (const query of ["施工事例", "メンテナンス", "SoToNo MA"]) {
      const additionalSearch = await fetchJson(app, "/api/admin/rag/search", {
        method: "POST",
        body: { query, limit: 5 }
      });

      expect(additionalSearch.status).toBe(200);
      expect(additionalSearch.body.results?.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(additionalSearch.body.results?.every((result) => result.tenant_id === tenantId)).toBe(
        true
      );
      expect(
        additionalSearch.body.results?.some((result) => result.id === "knowledge_staging_hidden_online")
      ).toBe(false);
      expect(
        additionalSearch.body.results?.some((result) => result.id === "knowledge_staging_other_online")
      ).toBe(false);
    }

    const disallowedSearch = await fetchJson(app, "/api/admin/rag/search", {
      method: "POST",
      body: { query: "allowed_for_ai=false", limit: 5 }
    });
    expect(disallowedSearch.status).toBe(200);
    expect(disallowedSearch.body.results).toEqual([]);

    const wrongTenantSearch = await fetchJson(app, "/api/admin/rag/search", {
      method: "POST",
      body: { query: "wrong", limit: 5 }
    });
    expect(wrongTenantSearch.status).toBe(200);
    expect(wrongTenantSearch.body.results).toEqual([]);

    const answer = await fetchJson(app, "/api/admin/rag/answer-draft", {
      method: "POST",
      body: { query: "オンライン相談", limit: 5 }
    });

    expect(answer.status).toBe(200);
    expect(answer.body.provider).toBe("mock");
    expect(answer.body.can_answer).toBe(true);
    expect(answer.body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "knowledge_staging_online",
          url: expect.any(String)
        })
      ])
    );
    expect(answer.body.sources?.some((source) => "source_url" in source)).toBe(false);
    expect(aiProvider.ragAnswerCalls).toHaveLength(1);
    expect(aiProvider.ragAnswerCalls[0]).toMatchObject({
      tenant_id: tenantId,
      query: "オンライン相談",
      sources: expect.arrayContaining([
        expect.objectContaining({
          id: "knowledge_staging_online",
          url: expect.any(String)
        })
      ])
    });

    const restartedApp = createApiApp({
      customerMessageRepositories: createSupabaseCustomerMessageRepositoriesFromEnv(env),
      aiProvider: new RecordingMockAiProvider(),
      env: createApiEnv(env)
    });
    const persisted = await fetchJson(restartedApp, "/api/admin/rag/search", {
      method: "POST",
      body: { query: "オンライン相談", limit: 5 }
    });

    expect(persisted.status).toBe(200);
    expect(persisted.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "knowledge_staging_online",
          tenant_id: tenantId
        })
      ])
    );
  });
});

interface SmokeKnowledgeResult {
  id: string;
  tenant_id: string;
  url: string;
  source_url?: string;
}

interface SmokeRagSource {
  id: string;
  url: string;
  source_url?: string;
}

interface SmokeBody {
  ok?: boolean;
  tenant_id?: string;
  query?: string;
  results?: SmokeKnowledgeResult[];
  can_answer?: boolean;
  answer_body?: string;
  sources?: SmokeRagSource[];
  provider?: string;
}

function loadSmokeEnv(): SupabaseEnv {
  const envFile = process.env.STAGING_ENV_FILE ?? ".env.staging";
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const envPath = resolveProjectPath(repoRoot, envFile);

  loadStagingDatabaseConfig({ repoRoot, envFile });

  return Object.fromEntries(parseEnvFile(readFileSync(envPath, "utf8")).entries());
}

function createApiEnv(env: SupabaseEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    APP_ENV: "staging",
    REPOSITORY_RUNTIME: "supabase",
    TENANT_ID: tenantId,
    TENANT_SLUG: "amamihome",
    LINE_MESSAGING_ENABLED: "false",
    LINE_REAL_PUSH_ENABLED: "false",
    AI_PROVIDER: "mock"
  };
}

async function fetchJson(
  app: { fetch: (request: Request) => Promise<Response> },
  path: string,
  input: { method: "POST"; body: unknown }
): Promise<{ status: number; body: SmokeBody }> {
  const response = await app.fetch(
    new Request(`http://localhost${path}`, {
      method: input.method,
      headers: {
        "content-type": "application/json",
        "x-tenant-id": tenantId
      },
      body: JSON.stringify(input.body)
    })
  );

  return {
    status: response.status,
    body: (await response.json()) as SmokeBody
  };
}
