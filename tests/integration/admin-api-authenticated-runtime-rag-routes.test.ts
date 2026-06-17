import { describe, expect, it } from "vitest";

import {
  MockAiProvider,
  type AiRagAnswerDraftInput
} from "@amami-line-crm/ai";
import {
  type AuthUserIdentity,
  type StaffAuthLookup,
  type StaffRole,
  type StaffTenantMembership,
  type StaffUser
} from "@amami-line-crm/domain";
import {
  InMemoryKnowledgePageRepository,
  type KnowledgePage
} from "@amami-line-crm/rag";
import { createApiApp } from "../../apps/api/src/index";
import type {
  AuthSessionVerifier,
  AuthSessionVerifierResult
} from "../../apps/api/src/admin/auth-session";

const now = "2026-06-17T02:00:00.000Z";

describe("authenticated_staff runtime RAG routes", () => {
  it("searches RAG knowledge through a single membership and no selectedTenantId", async () => {
    const { app, knowledgePageRepository } = createAuthenticatedRagApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      ragSearchRequest({
        authorization: "Bearer fake-valid-owner"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      query: "オンライン相談",
      limit: 5
    });
    expect(body.results).toEqual([
      expect.objectContaining({
        id: "knowledge_amami_online",
        tenant_id: "tenant_amamihome",
        title: "オンライン相談"
      })
    ]);
    expect(JSON.stringify(body.results)).not.toContain("knowledge_other");
    expect(JSON.stringify(body.results)).not.toContain("knowledge_amami_hidden");
    expect(knowledgePageRepository.listByTenantCalls).toEqual(["tenant_amamihome"]);
  });

  it("requires selectedTenantId for a multi-tenant RAG search request", async () => {
    const { app, knowledgePageRepository } = createAuthenticatedRagApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      ragSearchRequest({
        authorization: "Bearer fake-valid-multi"
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_selection_required"
    });
    expect(knowledgePageRepository.listByTenantCalls).toEqual([]);
  });

  it("uses matching x-selected-tenant-id to scope RAG search results", async () => {
    const { app, knowledgePageRepository } = createAuthenticatedRagApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      ragSearchRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_other"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_other"
    });
    expect(body.results).toEqual([
      expect.objectContaining({
        id: "knowledge_other_online",
        tenant_id: "tenant_other",
        title: "他社オンライン相談"
      })
    ]);
    expect(JSON.stringify(body.results)).not.toContain("knowledge_amami");
    expect(JSON.stringify(body.results)).not.toContain("knowledge_other_hidden");
    expect(knowledgePageRepository.listByTenantCalls).toEqual(["tenant_other"]);
  });

  it("rejects wrong selectedTenantId before RAG search repository access", async () => {
    const { app, knowledgePageRepository } = createAuthenticatedRagApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      ragSearchRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_outside"
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tenant_membership_denied"
    });
    expect(knowledgePageRepository.listByTenantCalls).toEqual([]);
  });

  it("rejects invalid selectedTenantId before session and RAG search repository access", async () => {
    const { app, knowledgePageRepository, sessionVerifier } = createAuthenticatedRagApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      ragSearchRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant invalid"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_selected_tenant_id"
    });
    expect(sessionVerifier.tokens).toEqual([]);
    expect(knowledgePageRepository.listByTenantCalls).toEqual([]);
  });

  it("creates a RAG answer draft from verified tenant sources only", async () => {
    const { app, knowledgePageRepository, aiProvider } = createAuthenticatedRagApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      ragAnswerDraftRequest({
        authorization: "Bearer fake-valid-multi",
        "x-selected-tenant-id": "tenant_other"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_other",
      query: "オンライン相談",
      can_answer: true,
      provider: "mock"
    });
    expect(body.sources).toEqual([
      expect.objectContaining({
        id: "knowledge_other_online",
        title: "他社オンライン相談"
      })
    ]);
    expect(knowledgePageRepository.listByTenantCalls).toEqual(["tenant_other"]);
    expect(aiProvider.ragAnswerCalls).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_other",
        query: "オンライン相談",
        sources: [
          expect.objectContaining({
            id: "knowledge_other_online",
            title: "他社オンライン相談"
          })
        ]
      })
    ]);
    expect(JSON.stringify(aiProvider.ragAnswerCalls[0])).not.toContain("knowledge_amami");
    expect(JSON.stringify(aiProvider.ragAnswerCalls[0])).not.toContain("knowledge_other_hidden");
  });

  it("excludes allowed_for_ai=false knowledge from authenticated RAG answer sources", async () => {
    const { app, aiProvider } = createAuthenticatedRagApp({
      includeAuthRuntime: true
    });

    const response = await app.fetch(
      ragAnswerDraftRequest(
        {
          authorization: "Bearer fake-valid-owner"
        },
        { query: "非公開 メンテナンス" }
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      can_answer: false,
      sources: []
    });
    expect(aiProvider.ragAnswerCalls).toEqual([]);
  });

  it("keeps dev_header path and ignores x-selected-tenant-id on RAG routes", async () => {
    const { app, knowledgePageRepository, aiProvider, sessionVerifier } =
      createAuthenticatedRagApp();
    const headers = {
      "x-tenant-id": "tenant_amamihome",
      "x-selected-tenant-id": "tenant invalid"
    };

    const searchResponse = await app.fetch(ragSearchRequest(headers));
    const answerResponse = await app.fetch(ragAnswerDraftRequest(headers));

    expect(searchResponse.status).toBe(200);
    expect(answerResponse.status).toBe(200);
    expect(sessionVerifier.tokens).toEqual([]);
    expect(knowledgePageRepository.listByTenantCalls).toEqual([
      "tenant_amamihome",
      "tenant_amamihome"
    ]);
    expect(aiProvider.ragAnswerCalls).toEqual([
      expect.objectContaining({
        tenant_id: "tenant_amamihome",
        sources: [
          expect.objectContaining({
            id: "knowledge_amami_online"
          })
        ]
      })
    ]);
  });

  it("keeps default in_memory app behavior for RAG routes", async () => {
    const app = createApiApp({
      knowledgePageRepository: new InMemoryKnowledgePageRepository([]),
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_CHANNEL_SECRET: "test-secret"
      }
    });
    const headers = { "x-tenant-id": "tenant_amamihome" };

    const searchResponse = await app.fetch(ragSearchRequest(headers));
    const answerResponse = await app.fetch(ragAnswerDraftRequest(headers));
    const searchBody = await searchResponse.json();
    const answerBody = await answerResponse.json();

    expect(searchResponse.status).toBe(200);
    expect(answerResponse.status).toBe(200);
    expect(searchBody).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome",
      results: []
    });
    expect(answerBody).toEqual({
      ok: true,
      tenant_id: "tenant_amamihome",
      query: "オンライン相談",
      can_answer: false,
      answer_body: "公式情報では確認できません。担当者が確認します。",
      sources: [],
      risk_flags: ["no_source"],
      handoff_required: true,
      recommended_response_mode: "human_required"
    });
  });
});

interface AuthenticatedRagAppInput {
  includeAuthRuntime?: boolean;
}

function createAuthenticatedRagApp(input: AuthenticatedRagAppInput = {}) {
  const knowledgePageRepository = new SpyKnowledgePageRepository(createKnowledgePages());
  const aiProvider = new RecordingMockAiProvider();
  const sessionVerifier = new FakeAuthSessionVerifier({
    "fake-valid-owner": { authUserId: "auth_owner", email: "owner@example.test" },
    "fake-valid-staff": { authUserId: "auth_staff", email: "staff@example.test" },
    "fake-valid-multi": { authUserId: "auth_multi", email: "multi@example.test" }
  });
  const staffAuthLookup = createFakeStaffAuthLookup();

  const app = createApiApp({
    knowledgePageRepository,
    aiProvider,
    now: () => now,
    ...(input.includeAuthRuntime
      ? {
          adminAuthRuntime: {
            sessionVerifier,
            staffAuthLookup
          }
        }
      : {}),
    env: {
      TENANT_ID: "tenant_amamihome",
      TENANT_SLUG: "amamihome",
      LINE_CHANNEL_SECRET: "test-secret"
    }
  });

  return {
    app,
    knowledgePageRepository,
    aiProvider,
    sessionVerifier
  };
}

function ragSearchRequest(
  headers: HeadersInit = {},
  body: unknown = { query: "オンライン相談" }
): Request {
  return new Request("http://localhost/api/admin/rag/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function ragAnswerDraftRequest(
  headers: HeadersInit = {},
  body: unknown = { query: "オンライン相談" }
): Request {
  return new Request("http://localhost/api/admin/rag/answer-draft", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

class SpyKnowledgePageRepository extends InMemoryKnowledgePageRepository {
  readonly listByTenantCalls: string[] = [];

  override async listByTenant(tenantId: string): Promise<KnowledgePage[]> {
    this.listByTenantCalls.push(tenantId);
    return super.listByTenant(tenantId);
  }
}

class RecordingMockAiProvider extends MockAiProvider {
  readonly ragAnswerCalls: AiRagAnswerDraftInput[] = [];

  override async draftRagAnswer(input: AiRagAnswerDraftInput) {
    this.ragAnswerCalls.push(input);
    return super.draftRagAnswer(input);
  }
}

type FakeVerifierResponse = AuthSessionVerifierResult | AuthUserIdentity | null;

class FakeAuthSessionVerifier implements AuthSessionVerifier {
  readonly tokens: string[] = [];

  constructor(private readonly responses: Record<string, FakeVerifierResponse>) {}

  async verifyBearerToken(token: string): Promise<FakeVerifierResponse> {
    this.tokens.push(token);
    if (Object.prototype.hasOwnProperty.call(this.responses, token)) {
      return this.responses[token] ?? null;
    }

    return null;
  }
}

class FakeStaffAuthLookup implements StaffAuthLookup {
  constructor(
    private readonly staffByAuthUserId: Map<string, StaffUser>,
    private readonly membershipsByStaffUserId: Map<string, StaffTenantMembership[]>
  ) {}

  async findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null> {
    const staff = this.staffByAuthUserId.get(authUserId) ?? null;
    return staff?.auth_user_id === authUserId ? staff : null;
  }

  async listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]> {
    return this.membershipsByStaffUserId.get(staffUserId) ?? [];
  }
}

function createFakeStaffAuthLookup(): FakeStaffAuthLookup {
  const owner = createStaff({ id: "staff_owner", auth_user_id: "auth_owner", role: "owner" });
  const staff = createStaff({ id: "staff_staff", auth_user_id: "auth_staff", role: "staff" });
  const multi = createStaff({ id: "staff_multi", auth_user_id: "auth_multi", role: "manager" });

  return new FakeStaffAuthLookup(
    new Map([
      ["auth_owner", owner],
      ["auth_staff", staff],
      ["auth_multi", multi]
    ]),
    new Map([
      ["staff_owner", [createMembership({ staff_user_id: "staff_owner", role: "owner" })]],
      ["staff_staff", [createMembership({ staff_user_id: "staff_staff", role: "staff" })]],
      [
        "staff_multi",
        [
          createMembership({
            id: "membership_multi_amami",
            tenant_id: "tenant_amamihome",
            staff_user_id: "staff_multi",
            role: "manager"
          }),
          createMembership({
            id: "membership_multi_other",
            tenant_id: "tenant_other",
            staff_user_id: "staff_multi",
            role: "owner"
          })
        ]
      ]
    ])
  );
}

function createStaff(overrides: Partial<StaffUser> = {}): StaffUser {
  return {
    id: "staff_1",
    tenant_id: "tenant_amamihome",
    auth_user_id: "auth_user_1",
    email: "staff@example.test",
    display_name: "Fake Staff",
    role: "staff",
    status: "active",
    line_user_id: null,
    is_active: true,
    last_login_at: null,
    disabled_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function createMembership(
  overrides: Partial<StaffTenantMembership> = {}
): StaffTenantMembership {
  return {
    id: "membership_1",
    tenant_id: "tenant_amamihome",
    staff_user_id: "staff_1",
    role: "staff" satisfies StaffRole,
    status: "active",
    invited_at: null,
    accepted_at: now,
    disabled_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function createKnowledgePages(): KnowledgePage[] {
  return [
    {
      id: "knowledge_amami_online",
      tenant_id: "tenant_amamihome",
      title: "オンライン相談",
      url: "https://amamihome.net/online",
      category: "相談",
      source_type: "official_site",
      content: "オンライン相談では、家づくりや資料請求について担当者に確認できます。",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-17T00:00:00.000Z"
    },
    {
      id: "knowledge_amami_hidden",
      tenant_id: "tenant_amamihome",
      title: "非公開 メンテナンス",
      url: "https://amamihome.net/private",
      category: "internal",
      source_type: "manual",
      content: "非公開のメンテナンス内部メモです。",
      allowed_for_ai: false,
      last_crawled_at: "2026-06-17T00:01:00.000Z"
    },
    {
      id: "knowledge_other_online",
      tenant_id: "tenant_other",
      title: "他社オンライン相談",
      url: "https://example.com/online",
      category: "相談",
      source_type: "official_site",
      content: "他社のオンライン相談情報です。",
      allowed_for_ai: true,
      last_crawled_at: "2026-06-17T00:02:00.000Z"
    },
    {
      id: "knowledge_other_hidden",
      tenant_id: "tenant_other",
      title: "他社非公開 オンライン相談",
      url: "https://example.com/private",
      category: "internal",
      source_type: "manual",
      content: "他社の非公開オンライン相談メモです。",
      allowed_for_ai: false,
      last_crawled_at: "2026-06-17T00:03:00.000Z"
    }
  ];
}
