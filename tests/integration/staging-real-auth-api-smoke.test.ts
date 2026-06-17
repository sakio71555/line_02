import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import { SupabaseAuthSessionVerifier } from "../../apps/api/src/admin/supabase-auth-session-verifier";
import {
  loadStagingDatabaseConfig,
  parseEnvFile,
  resolveProjectPath,
  runPsql
} from "../../scripts/dev-loop/lib/staging-psql.mjs";
import {
  createSupabaseAuthServerClient,
  createSupabaseCustomerMessageRepositories,
  createSupabaseServiceRoleServerClient,
  readSupabaseAuthConfigFromEnv,
  readSupabaseConfigFromEnv,
  SupabaseStaffAuthLookupRepository,
  type SupabaseEnv
} from "@amami-line-crm/db";

const runStagingSmoke = process.env.RUN_STAGING_REAL_AUTH_SMOKE === "1";
const describeStagingSmoke = runStagingSmoke ? describe : describe.skip;

describe("staging real Auth API smoke safety", () => {
  it("keeps the real Auth smoke explicit and avoids secret output patterns", () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const script = readFileSync(
      resolve(repoRoot, "scripts/dev-loop/smoke-staging-real-auth-api.mjs"),
      "utf8"
    );
    const testSource = readFileSync(fileURLToPath(import.meta.url), "utf8");

    expect(script).toContain("RUN_STAGING_REAL_AUTH_SMOKE");
    expect(script).toContain("verify-staging-env.mjs");
    expect(script).toContain("verify-staging-schema.mjs");
    expect(script).toContain("verify-staging-postgrest-grants.mjs");
    expect(script).toContain("verify-staging-rls-policies.mjs");
    expect(script).toContain("verify-rls-migration-static.mjs");
    expect(script).not.toContain("supabase db push");
    expect(script).not.toContain("supabase db reset");
    expect(script).not.toContain("supabase migration repair");
    expect(script).not.toContain("LINE_REAL_PUSH_ENABLED=true");
    expect(script).not.toContain("AI_PROVIDER=openai");
    expect(testSource).toContain("SupabaseAuthSessionVerifier");
    expect(testSource).toContain("auth.admin.createUser");
    expect(testSource).toContain("auth.admin.deleteUser");
    expect(testSource).toContain('LINE_REAL_PUSH_ENABLED: "false"');
    expect(testSource).toContain('AI_PROVIDER: "mock"');
    expect(testSource).not.toMatch(/console\.log\(\s*accessToken/u);
    expect(testSource).not.toMatch(/console\.log\(\s*password/u);
  });
});

describeStagingSmoke("staging real Auth API smoke", () => {
  it("connects real Auth user ids to Admin API auth runtime and RLS tenant boundaries", async () => {
    const env = loadSmokeEnv();
    const databaseConfig = loadSmokeDatabaseConfig();
    const supabaseConfig = readSupabaseConfigFromEnv(env);
    const authConfig = readSupabaseAuthConfigFromEnv(env);
    const serviceClient = createSupabaseServiceRoleServerClient(supabaseConfig);
    const authClient = createSupabaseAuthServerClient(authConfig);
    const runId = createSmokeRunId();
    const ids = createSmokeIds(runId);
    const createdUsers: SmokeAuthUser[] = [];

    try {
      await cleanupStaleDummyAuthUsers(serviceClient);
      runSafePsql(
        databaseConfig,
        cleanupStaleSmokeSql(),
        "real Auth smoke stale DB cleanup failed"
      );

      const userA = await createDummyAuthUser(serviceClient, authClient, runId, "a");
      createdUsers.push(userA);
      const multiUser = await createDummyAuthUser(serviceClient, authClient, runId, "multi");
      createdUsers.push(multiUser);

      runSafePsql(databaseConfig, seedSql({ ids, userA, multiUser }), "real Auth smoke seed failed");
      console.log("[ok] auth dummy users prepared");
      console.log("[ok] staff_users.auth_user_id dummy mapping seeded");

      const verifier = new SupabaseAuthSessionVerifier(authClient);
      const verified = await verifier.verifyBearerToken(userA.accessToken);

      expect(verified).toEqual({
        ok: true,
        authUser: {
          authUserId: userA.id,
          email: userA.email
        }
      });
      console.log("[ok] real verifier resolved auth identity");

      const staffLookup = new SupabaseStaffAuthLookupRepository(serviceClient);
      const staff = await staffLookup.findStaffByAuthUserId(userA.id);
      const memberships = staff ? await staffLookup.listMembershipsByStaffUserId(staff.id) : [];

      expect(staff).toMatchObject({
        id: ids.staffA,
        auth_user_id: userA.id,
        status: "active",
        is_active: true
      });
      expect(memberships).toEqual([
        expect.objectContaining({
          id: ids.membershipA,
          tenant_id: ids.tenantA,
          status: "active"
        })
      ]);
      console.log("[ok] staff lookup resolved active membership");

      const app = createApiApp({
        customerMessageRepositories: createSupabaseCustomerMessageRepositories({
          client: serviceClient
        }),
        adminAuthRuntime: {
          sessionVerifier: verifier,
          staffAuthLookup: staffLookup
        },
        env: createApiEnv(env)
      });

      const tenantAList = await fetchJson(app, "/api/admin/customers", {
        token: userA.accessToken,
        selectedTenantId: ids.tenantA
      });
      expect(tenantAList.status).toBe(200);
      expect(tenantAList.body.tenant_id).toBe(ids.tenantA);
      expect(tenantAList.body.customers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ids.customerA,
            tenant_id: ids.tenantA
          })
        ])
      );
      expect(tenantAList.body.customers?.some((customer) => customer.id === ids.customerB)).toBe(
        false
      );
      console.log("[ok] selected tenant A accepted");

      const tenantADetail = await fetchJson(app, `/api/admin/customers/${ids.customerA}`, {
        token: userA.accessToken,
        selectedTenantId: ids.tenantA
      });
      expect(tenantADetail.status).toBe(200);
      expect(tenantADetail.body.customer).toMatchObject({
        id: ids.customerA,
        tenant_id: ids.tenantA
      });

      const tenantBDetailFromA = await fetchJson(app, `/api/admin/customers/${ids.customerB}`, {
        token: userA.accessToken,
        selectedTenantId: ids.tenantA
      });
      expect(tenantBDetailFromA.status).toBe(404);
      console.log("[ok] tenant B customer hidden from tenant A context");

      const rag = await fetchJson(app, "/api/admin/rag/search", {
        method: "POST",
        token: userA.accessToken,
        selectedTenantId: ids.tenantA,
        body: { query: "オンライン相談", limit: 5 }
      });
      expect(rag.status).toBe(200);
      expect(rag.body.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ids.knowledgeAAllowed,
            tenant_id: ids.tenantA
          })
        ])
      );
      expect(rag.body.results?.some((result) => result.id === ids.knowledgeAHidden)).toBe(false);
      expect(rag.body.results?.some((result) => result.id === ids.knowledgeBAllowed)).toBe(false);
      console.log("[ok] RAG source tenant and allowed_for_ai filters verified");

      const alerts = await fetchJson(app, "/api/admin/alerts", {
        token: userA.accessToken,
        selectedTenantId: ids.tenantA
      });
      expect(alerts.status).toBe(200);
      expect(alerts.body.alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: ids.alertA,
            tenant_id: ids.tenantA
          })
        ])
      );
      expect(alerts.body.alerts?.some((alert) => alert.id === ids.alertB)).toBe(false);

      const draft = await fetchJson(app, `/api/admin/customers/${ids.customerA}/ai-reply-draft`, {
        method: "POST",
        token: userA.accessToken,
        selectedTenantId: ids.tenantA
      });
      expect(draft.status).toBe(200);
      expect(draft.body.draft_body).toEqual(expect.any(String));
      console.log("[ok] mock AI draft route verified without OpenAI");

      await expectAuthError(app, "/api/admin/customers", {
        label: "missing selectedTenantId with multiple memberships",
        token: multiUser.accessToken,
        expectedStatus: 409,
        expectedError: "tenant_selection_required"
      });
      await expectAuthError(app, "/api/admin/customers", {
        label: "wrong selectedTenantId",
        token: userA.accessToken,
        selectedTenantId: ids.tenantB,
        expectedStatus: 403,
        expectedError: "tenant_membership_denied"
      });
      await expectAuthError(app, "/api/admin/customers", {
        label: "invalid selectedTenantId",
        token: userA.accessToken,
        selectedTenantId: "tenant invalid",
        expectedStatus: 400,
        expectedError: "invalid_selected_tenant_id"
      });
      await expectAuthError(app, "/api/admin/customers", {
        label: "selectedTenantId without Authorization",
        selectedTenantId: ids.tenantA,
        expectedStatus: 401,
        expectedError: "missing_tenant_id"
      });
      await expectAuthError(app, "/api/admin/customers", {
        label: "invalid bearer token",
        token: "invalid-staging-real-auth-smoke-token",
        selectedTenantId: ids.tenantA,
        expectedStatus: 401,
        expectedError: "session_expired"
      });
      console.log("[ok] selectedTenantId error paths verified");

      expect(runAuthenticatedCount(databaseConfig, userA.id, authUidSql(userA.id))).toBe(1);
      expect(runAuthenticatedCount(databaseConfig, userA.id, rowCountSql("customers", ids.customerA))).toBe(
        1
      );
      expect(runAuthenticatedCount(databaseConfig, userA.id, rowCountSql("customers", ids.customerB))).toBe(
        0
      );
      expect(
        runAuthenticatedCount(databaseConfig, userA.id, rowCountSql("knowledge_pages", ids.knowledgeAAllowed))
      ).toBe(1);
      expect(
        runAuthenticatedCount(databaseConfig, userA.id, rowCountSql("knowledge_pages", ids.knowledgeAHidden))
      ).toBe(0);
      expect(
        runAuthenticatedCount(databaseConfig, userA.id, rowCountSql("knowledge_pages", ids.knowledgeBAllowed))
      ).toBe(0);
      console.log("[ok] RLS tenant A/B boundary verified with real Auth user id");
    } catch (error) {
      throw new Error(toSafeSmokeErrorMessage(error));
    } finally {
      runSafePsql(databaseConfig, cleanupSql(ids), "real Auth smoke DB cleanup failed");

      for (const user of createdUsers) {
        await deleteDummyAuthUser(serviceClient, user.id);
      }

      console.log("[ok] smoke dummy cleanup completed");
    }
  }, 60_000);
});

interface SmokeAuthUser {
  id: string;
  email: string;
  accessToken: string;
}

interface SmokeIds {
  runId: string;
  tenantA: string;
  tenantB: string;
  staffA: string;
  staffMulti: string;
  membershipA: string;
  membershipMultiA: string;
  membershipMultiB: string;
  customerA: string;
  customerB: string;
  messageA: string;
  messageB: string;
  alertA: string;
  alertB: string;
  knowledgeAAllowed: string;
  knowledgeAHidden: string;
  knowledgeBAllowed: string;
}

interface SmokeKnowledgeResult {
  id: string;
  tenant_id: string;
}

interface SmokeCustomer {
  id: string;
  tenant_id: string;
}

interface SmokeAlert {
  id: string;
  tenant_id: string;
}

interface SmokeBody {
  ok?: boolean;
  error?: string;
  tenant_id?: string;
  customers?: SmokeCustomer[];
  customer?: SmokeCustomer;
  results?: SmokeKnowledgeResult[];
  alerts?: SmokeAlert[];
  draft_body?: string;
}

interface StagingDatabaseContext {
  psqlPath: string;
  connectionEnv: Record<string, string>;
  redactions: string[];
}

function loadSmokeEnv(): SupabaseEnv {
  const envFile = process.env.STAGING_ENV_FILE ?? ".env.staging";
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const envPath = resolveProjectPath(repoRoot, envFile);

  loadStagingDatabaseConfig({ repoRoot, envFile });

  return Object.fromEntries(parseEnvFile(readFileSync(envPath, "utf8")).entries());
}

function loadSmokeDatabaseConfig(): StagingDatabaseContext {
  const envFile = process.env.STAGING_ENV_FILE ?? ".env.staging";
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const config = loadStagingDatabaseConfig({ repoRoot, envFile });

  return {
    psqlPath: process.env.STAGING_PSQL_PATH ?? "/usr/local/opt/libpq/bin/psql",
    connectionEnv: config.env,
    redactions: config.redactions
  };
}

function createApiEnv(env: SupabaseEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    APP_ENV: "staging",
    REPOSITORY_RUNTIME: "supabase",
    LINE_MESSAGING_ENABLED: "false",
    LINE_REAL_PUSH_ENABLED: "false",
    AI_PROVIDER: "mock"
  };
}

function createSmokeRunId(): string {
  return new Date().toISOString().replace(/\D/gu, "").slice(0, 14);
}

function createSmokeIds(runId: string): SmokeIds {
  return {
    runId,
    tenantA: `tenant_real_auth_a_${runId}`,
    tenantB: `tenant_real_auth_b_${runId}`,
    staffA: `staff_real_auth_a_${runId}`,
    staffMulti: `staff_real_auth_multi_${runId}`,
    membershipA: `membership_real_auth_a_${runId}`,
    membershipMultiA: `membership_real_auth_multi_a_${runId}`,
    membershipMultiB: `membership_real_auth_multi_b_${runId}`,
    customerA: `customer_real_auth_a_${runId}`,
    customerB: `customer_real_auth_b_${runId}`,
    messageA: `message_real_auth_a_${runId}`,
    messageB: `message_real_auth_b_${runId}`,
    alertA: `alert_real_auth_a_${runId}`,
    alertB: `alert_real_auth_b_${runId}`,
    knowledgeAAllowed: `knowledge_real_auth_a_allowed_${runId}`,
    knowledgeAHidden: `knowledge_real_auth_a_hidden_${runId}`,
    knowledgeBAllowed: `knowledge_real_auth_b_allowed_${runId}`
  };
}

async function createDummyAuthUser(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleServerClient>,
  authClient: ReturnType<typeof createSupabaseAuthServerClient>,
  runId: string,
  label: "a" | "multi"
): Promise<SmokeAuthUser> {
  const email = `auth-smoke-${label}-${runId}-${randomUUID()}@example.com`;
  const password = `Dmy1!${randomUUID().replace(/-/gu, "").slice(0, 18)}`;
  const createResult = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      purpose: "staging-real-auth-smoke",
      label,
      run_id: runId
    }
  });

  if (createResult.error || !createResult.data.user?.id) {
    throw new Error(
      `auth dummy user preparation failed (${toSafeSupabaseErrorCode(createResult.error)})`
    );
  }

  const signInResult = await authClient.auth.signInWithPassword({ email, password });
  const accessToken = signInResult.data.session?.access_token;

  if (signInResult.error || !accessToken) {
    await deleteDummyAuthUser(serviceClient, createResult.data.user.id);
    throw new Error(
      `auth dummy bearer token acquisition failed (${toSafeSupabaseErrorCode(signInResult.error)})`
    );
  }

  return {
    id: createResult.data.user.id,
    email,
    accessToken
  };
}

async function deleteDummyAuthUser(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleServerClient>,
  authUserId: string
): Promise<void> {
  const result = await serviceClient.auth.admin.deleteUser(authUserId);

  if (result.error) {
    throw new Error(`auth dummy user cleanup failed (${toSafeSupabaseErrorCode(result.error)})`);
  }
}

async function cleanupStaleDummyAuthUsers(
  serviceClient: ReturnType<typeof createSupabaseServiceRoleServerClient>
): Promise<void> {
  for (let page = 1; page <= 10; page += 1) {
    const result = await serviceClient.auth.admin.listUsers({ page, perPage: 100 });

    if (result.error) {
      throw new Error(`auth dummy user cleanup failed (${toSafeSupabaseErrorCode(result.error)})`);
    }

    const users = result.data.users ?? [];

    for (const user of users) {
      if (user.user_metadata?.purpose === "staging-real-auth-smoke") {
        await deleteDummyAuthUser(serviceClient, user.id);
      }
    }

    if (users.length < 100) {
      return;
    }
  }
}

function runSafePsql(context: StagingDatabaseContext, sql: string, failureMessage: string): void {
  const result = runPsql({
    ...context,
    args: ["--no-psqlrc", "-v", "ON_ERROR_STOP=1", "-q", "-c", sql]
  });

  if (result.status !== 0 || result.error) {
    throw new Error(failureMessage);
  }
}

function runAuthenticatedCount(
  context: StagingDatabaseContext,
  authUserId: string,
  sql: string
): number {
  const result = runPsql({
    ...context,
    args: [
      "--no-psqlrc",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-t",
      "-A",
      "-c",
      authenticatedScalarSql(authUserId, sql)
    ]
  });

  if (result.status !== 0 || result.error) {
    throw new Error("authenticated RLS real Auth smoke query failed");
  }

  const value = Number.parseInt(extractResultMarker(result.stdout), 10);

  if (!Number.isFinite(value)) {
    throw new Error("authenticated RLS real Auth smoke returned an unreadable count");
  }

  return value;
}

function authenticatedScalarSql(authUserId: string, sql: string): string {
  return `
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '${escapeSqlLiteral(authUserId)}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select '__real_auth_result__=' || (${sql});
rollback;
`;
}

function extractResultMarker(stdout: string): string {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.startsWith("__real_auth_result__="))
    ?.replace("__real_auth_result__=", "") ?? "";
}

async function fetchJson(
  app: { fetch: (request: Request) => Promise<Response> },
  path: string,
  input: {
    method?: "GET" | "POST";
    token?: string;
    selectedTenantId?: string;
    body?: unknown;
  }
): Promise<{ status: number; body: SmokeBody }> {
  const headers = new Headers();

  if (input.token) {
    headers.set("authorization", `Bearer ${input.token}`);
  }

  if (input.selectedTenantId) {
    headers.set("x-selected-tenant-id", input.selectedTenantId);
  }

  if (input.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await app.fetch(
    new Request(`http://localhost${path}`, {
      method: input.method ?? "GET",
      headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body)
    })
  );

  return {
    status: response.status,
    body: (await response.json()) as SmokeBody
  };
}

async function expectAuthError(
  app: { fetch: (request: Request) => Promise<Response> },
  path: string,
  input: {
    label: string;
    token?: string;
    selectedTenantId?: string;
    expectedStatus: number;
    expectedError: string;
  }
): Promise<void> {
  const response = await fetchJson(app, path, input);

  if (response.status !== input.expectedStatus || response.body.error !== input.expectedError) {
    throw new Error(`auth error expectation failed: ${input.label}`);
  }
}

function authUidSql(authUserId: string): string {
  return `select count(*) from (select auth.uid()::text as uid) auth_context
    where uid = '${escapeSqlLiteral(authUserId)}'`;
}

function rowCountSql(tableName: string, rowId: string): string {
  return `select count(*) from public.${tableName} where id = '${escapeSqlLiteral(rowId)}'`;
}

function seedSql(input: {
  ids: SmokeIds;
  userA: SmokeAuthUser;
  multiUser: SmokeAuthUser;
}): string {
  const { ids, userA, multiUser } = input;

  return `
insert into public.tenants (id, slug, name, official_domain, status)
values
  (
    '${escapeSqlLiteral(ids.tenantA)}',
    'real-auth-a-${escapeSqlLiteral(ids.runId)}',
    'Real Auth Smoke Tenant A',
    'real-auth-a.invalid',
    'active'
  ),
  (
    '${escapeSqlLiteral(ids.tenantB)}',
    'real-auth-b-${escapeSqlLiteral(ids.runId)}',
    'Real Auth Smoke Tenant B',
    'real-auth-b.invalid',
    'active'
  )
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  official_domain = excluded.official_domain,
  status = excluded.status,
  updated_at = now();

insert into public.staff_users (
  id,
  tenant_id,
  auth_user_id,
  email,
  display_name,
  role,
  status,
  is_active
)
values
  (
    '${escapeSqlLiteral(ids.staffA)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    '${escapeSqlLiteral(userA.id)}',
    '${escapeSqlLiteral(userA.email)}',
    'Real Auth Smoke Staff A',
    'manager',
    'active',
    true
  ),
  (
    '${escapeSqlLiteral(ids.staffMulti)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    '${escapeSqlLiteral(multiUser.id)}',
    '${escapeSqlLiteral(multiUser.email)}',
    'Real Auth Smoke Staff Multi',
    'manager',
    'active',
    true
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  auth_user_id = excluded.auth_user_id,
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  status = excluded.status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.staff_tenant_memberships (
  id,
  tenant_id,
  staff_user_id,
  role,
  status,
  accepted_at
)
values
  (
    '${escapeSqlLiteral(ids.membershipA)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    '${escapeSqlLiteral(ids.staffA)}',
    'manager',
    'active',
    now()
  ),
  (
    '${escapeSqlLiteral(ids.membershipMultiA)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    '${escapeSqlLiteral(ids.staffMulti)}',
    'manager',
    'active',
    now()
  ),
  (
    '${escapeSqlLiteral(ids.membershipMultiB)}',
    '${escapeSqlLiteral(ids.tenantB)}',
    '${escapeSqlLiteral(ids.staffMulti)}',
    'manager',
    'active',
    now()
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  staff_user_id = excluded.staff_user_id,
  role = excluded.role,
  status = excluded.status,
  accepted_at = excluded.accepted_at,
  updated_at = now();

insert into public.customers (
  id,
  tenant_id,
  line_user_id,
  display_name,
  response_mode,
  status,
  last_message_at,
  last_customer_message_at
)
values
  (
    '${escapeSqlLiteral(ids.customerA)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    'dummy_line_user_real_auth_a_${escapeSqlLiteral(ids.runId)}',
    'Real Auth Smoke Customer A',
    'human_required',
    'active',
    now() - interval '20 minutes',
    now() - interval '20 minutes'
  ),
  (
    '${escapeSqlLiteral(ids.customerB)}',
    '${escapeSqlLiteral(ids.tenantB)}',
    'dummy_line_user_real_auth_b_${escapeSqlLiteral(ids.runId)}',
    'Real Auth Smoke Customer B',
    'human_required',
    'active',
    now() - interval '10 minutes',
    now() - interval '10 minutes'
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  line_user_id = excluded.line_user_id,
  display_name = excluded.display_name,
  response_mode = excluded.response_mode,
  status = excluded.status,
  last_message_at = excluded.last_message_at,
  last_customer_message_at = excluded.last_customer_message_at,
  updated_at = now();

insert into public.messages (
  id,
  tenant_id,
  customer_id,
  line_message_id,
  role,
  message_type,
  body,
  created_at
)
values
  (
    '${escapeSqlLiteral(ids.messageA)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    '${escapeSqlLiteral(ids.customerA)}',
    'dummy_line_message_real_auth_a_${escapeSqlLiteral(ids.runId)}',
    'customer',
    'text',
    'real Auth smoke dummy message A',
    now() - interval '20 minutes'
  ),
  (
    '${escapeSqlLiteral(ids.messageB)}',
    '${escapeSqlLiteral(ids.tenantB)}',
    '${escapeSqlLiteral(ids.customerB)}',
    'dummy_line_message_real_auth_b_${escapeSqlLiteral(ids.runId)}',
    'customer',
    'text',
    'real Auth smoke dummy message B',
    now() - interval '10 minutes'
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  customer_id = excluded.customer_id,
  line_message_id = excluded.line_message_id,
  role = excluded.role,
  message_type = excluded.message_type,
  body = excluded.body,
  created_at = excluded.created_at;

insert into public.alerts (
  id,
  tenant_id,
  customer_id,
  alert_type,
  status,
  severity,
  message,
  triggered_at
)
values
  (
    '${escapeSqlLiteral(ids.alertA)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    '${escapeSqlLiteral(ids.customerA)}',
    'unreplied_customer_message',
    'open',
    'medium',
    'real Auth smoke dummy alert A',
    now() - interval '20 minutes'
  ),
  (
    '${escapeSqlLiteral(ids.alertB)}',
    '${escapeSqlLiteral(ids.tenantB)}',
    '${escapeSqlLiteral(ids.customerB)}',
    'unreplied_customer_message',
    'open',
    'medium',
    'real Auth smoke dummy alert B',
    now() - interval '10 minutes'
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  customer_id = excluded.customer_id,
  alert_type = excluded.alert_type,
  status = excluded.status,
  severity = excluded.severity,
  message = excluded.message,
  triggered_at = excluded.triggered_at,
  updated_at = now();

insert into public.knowledge_pages (
  id,
  tenant_id,
  url,
  category,
  source_type,
  title,
  content,
  checksum,
  allowed_for_ai,
  last_crawled_at
)
values
  (
    '${escapeSqlLiteral(ids.knowledgeAAllowed)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    'https://real-auth-a.invalid/online',
    'real Auth smoke',
    'official_site',
    'オンライン相談 Real Auth Smoke A',
    'オンライン相談 real Auth smoke allowed tenant A content',
    'real-auth-a-allowed-${escapeSqlLiteral(ids.runId)}',
    true,
    now()
  ),
  (
    '${escapeSqlLiteral(ids.knowledgeAHidden)}',
    '${escapeSqlLiteral(ids.tenantA)}',
    'https://real-auth-a.invalid/hidden',
    'real Auth smoke',
    'official_site',
    'オンライン相談 Real Auth Smoke Hidden A',
    'オンライン相談 real Auth smoke hidden tenant A content',
    'real-auth-a-hidden-${escapeSqlLiteral(ids.runId)}',
    false,
    now()
  ),
  (
    '${escapeSqlLiteral(ids.knowledgeBAllowed)}',
    '${escapeSqlLiteral(ids.tenantB)}',
    'https://real-auth-b.invalid/online',
    'real Auth smoke',
    'official_site',
    'オンライン相談 Real Auth Smoke B',
    'オンライン相談 real Auth smoke allowed tenant B content',
    'real-auth-b-allowed-${escapeSqlLiteral(ids.runId)}',
    true,
    now()
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  url = excluded.url,
  category = excluded.category,
  source_type = excluded.source_type,
  title = excluded.title,
  content = excluded.content,
  checksum = excluded.checksum,
  allowed_for_ai = excluded.allowed_for_ai,
  last_crawled_at = excluded.last_crawled_at,
  updated_at = now();
`;
}

function cleanupSql(ids: SmokeIds): string {
  return `
delete from public.messages where id in (
  '${escapeSqlLiteral(ids.messageA)}',
  '${escapeSqlLiteral(ids.messageB)}'
);
delete from public.alerts where id in (
  '${escapeSqlLiteral(ids.alertA)}',
  '${escapeSqlLiteral(ids.alertB)}'
);
delete from public.knowledge_pages where id in (
  '${escapeSqlLiteral(ids.knowledgeAAllowed)}',
  '${escapeSqlLiteral(ids.knowledgeAHidden)}',
  '${escapeSqlLiteral(ids.knowledgeBAllowed)}'
);
delete from public.customers where id in (
  '${escapeSqlLiteral(ids.customerA)}',
  '${escapeSqlLiteral(ids.customerB)}'
);
delete from public.staff_tenant_memberships where id in (
  '${escapeSqlLiteral(ids.membershipA)}',
  '${escapeSqlLiteral(ids.membershipMultiA)}',
  '${escapeSqlLiteral(ids.membershipMultiB)}'
);
delete from public.staff_users where id in (
  '${escapeSqlLiteral(ids.staffA)}',
  '${escapeSqlLiteral(ids.staffMulti)}'
);
delete from public.tenants where id in (
  '${escapeSqlLiteral(ids.tenantA)}',
  '${escapeSqlLiteral(ids.tenantB)}'
);
`;
}

function cleanupStaleSmokeSql(): string {
  return `
delete from public.messages where id like 'message_real_auth_%';
delete from public.alerts where id like 'alert_real_auth_%';
delete from public.knowledge_pages where id like 'knowledge_real_auth_%';
delete from public.customers where id like 'customer_real_auth_%';
delete from public.staff_tenant_memberships where id like 'membership_real_auth_%';
delete from public.staff_users where id like 'staff_real_auth_%';
delete from public.tenants where id like 'tenant_real_auth_%';
`;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/gu, "''");
}

function toSafeSmokeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("staging real Auth smoke")) {
    return error.message;
  }

  if (
    error instanceof Error &&
    /^(auth dummy user preparation failed|auth dummy bearer token acquisition failed|auth dummy user cleanup failed|real Auth smoke seed failed|real Auth smoke DB cleanup failed|real Auth smoke stale DB cleanup failed|authenticated RLS real Auth smoke query failed|authenticated RLS real Auth smoke returned an unreadable count|auth error expectation failed:)/u.test(
      error.message
    )
  ) {
    return `staging real Auth smoke ${error.message}`;
  }

  if (error instanceof Error && error.message.includes("expected")) {
    return "staging real Auth smoke assertion failed";
  }

  return "staging real Auth smoke failed safely; no token or secret is printed";
}

function toSafeSupabaseErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "unknown";
  }

  const record = error as Record<string, unknown>;
  const status = typeof record.status === "number" ? `status_${record.status}` : null;
  const code = typeof record.code === "string" ? `code_${record.code}` : null;
  const name = typeof record.name === "string" ? `name_${record.name}` : null;

  return [status, code, name].filter(Boolean).join("_") || "unknown";
}
