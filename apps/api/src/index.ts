import { serve } from "@hono/node-server";
import { Hono } from "hono";

import {
  createMockAiProvider,
  type AiConversationTurn,
  type AiProvider,
  type AiRagAnswerSource
} from "@amami-line-crm/ai";
import { loadAppConfig } from "@amami-line-crm/config";
import {
  checkUnrepliedAlerts,
  getCustomerDetail,
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  listCustomerListItems,
  listCustomerTimeline,
  logLineWebhookEvents,
  MockStaffNotifier,
  notifyOpenAlerts,
  recordAiSummaryMessage,
  recordStaffTextReply,
  type Alert,
  type AlertRepository,
  type Customer,
  type CustomerRepository,
  type Message,
  type MessageRepository,
  type StaffNotifier
} from "@amami-line-crm/domain";
import {
  MockLineClient,
  parseLineWebhookPayload,
  verifyLineSignature,
  type LineClient
} from "@amami-line-crm/line";
import {
  AMAMI_HOME_TENANT_ID,
  createAmamiHomeKnowledgePages,
  InMemoryKnowledgePageRepository,
  searchTenantKnowledge,
  type KnowledgePage,
  type KnowledgePageRepository
} from "@amami-line-crm/rag";

import {
  mapAdminTenantGuardErrorToHttp,
  resolveAdminTenantContext
} from "./admin/tenant-context";
import { mapAdminAuthErrorToHttp } from "./admin/auth-error-response";
import {
  resolveAuthenticatedAdminRuntimeContext,
  type AuthenticatedAdminRuntimeDependencies,
  type AuthenticatedAdminRuntimeInput
} from "./admin/authenticated-runtime";
import {
  adminRouteActions,
  evaluateAdminRouteRoleGuardCompatibility
} from "./admin/role-guarded-handler";

export interface ApiAppDependencies {
  alertRepository?: AlertRepository;
  customerMessageRepositories?: CustomerMessageRepositoryRuntimeBundle;
  customerRepository?: CustomerRepository;
  messageRepository?: MessageRepository;
  lineClient?: LineClient;
  staffNotifier?: StaffNotifier;
  aiProvider?: AiProvider;
  knowledgePageRepository?: KnowledgePageRepository;
  adminAuthRuntime?: AuthenticatedAdminRuntimeDependencies;
  authenticatedSelectedTenantId?: string | null;
  now?: () => string;
  env?: NodeJS.ProcessEnv;
}

export type CustomerMessageRepositoryRuntimeMode = "in_memory" | "supabase";

export interface CustomerMessageRepositoryRuntimeBundle {
  runtime_mode?: CustomerMessageRepositoryRuntimeMode;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  alertRepository?: AlertRepository;
  knowledgePageRepository?: KnowledgePageRepository;
}

const defaultAlertRepository = new InMemoryAlertRepository();
const defaultCustomerRepository = new InMemoryCustomerRepository();
const defaultMessageRepository = new InMemoryMessageRepository();
const defaultLineClient = new MockLineClient();
const defaultStaffNotifier = new MockStaffNotifier();
const defaultAiProvider = createMockAiProvider();
const defaultKnowledgePageRepository = new InMemoryKnowledgePageRepository([]);

export function createApiApp(dependencies: ApiAppDependencies = {}): Hono {
  const api = new Hono();
  const alertRepository =
    dependencies.alertRepository ??
    dependencies.customerMessageRepositories?.alertRepository ??
    defaultAlertRepository;
  const customerRepository =
    dependencies.customerRepository ??
    dependencies.customerMessageRepositories?.customerRepository ??
    defaultCustomerRepository;
  const messageRepository =
    dependencies.messageRepository ??
    dependencies.customerMessageRepositories?.messageRepository ??
    defaultMessageRepository;
  const lineClient = dependencies.lineClient ?? defaultLineClient;
  const staffNotifier = dependencies.staffNotifier ?? defaultStaffNotifier;
  const aiProvider = dependencies.aiProvider ?? defaultAiProvider;
  const knowledgePageRepository =
    dependencies.knowledgePageRepository ??
    dependencies.customerMessageRepositories?.knowledgePageRepository ??
    defaultKnowledgePageRepository;
  const adminAuthRuntime = dependencies.adminAuthRuntime;
  const authenticatedSelectedTenantId = dependencies.authenticatedSelectedTenantId;
  const now = dependencies.now;
  const env = dependencies.env ?? process.env;

  api.get("/health", (c) => {
    const config = loadAppConfig(env);
    return c.json({
      ok: true,
      tenant_id: config.tenant.id,
      tenant_slug: config.tenant.slug,
      external_connections: "disabled"
    });
  });

  api.post("/api/dev/seed-demo-data", async (c) => {
    if (isProductionRuntime(env)) {
      return c.json({ ok: false, error: "dev_seed_disabled" }, 404);
    }

    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const seeded = await seedDemoData({
      tenant_id: tenant.tenantId,
      customerRepository,
      messageRepository,
      knowledgePageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_ids: seeded.customers.map((customer) => customer.id),
      customers: seeded.customers.map((customer) => ({
        id: customer.id,
        tenant_id: customer.tenant_id,
        line_user_id: customer.line_user_id,
        display_name: customer.display_name,
        response_mode: customer.response_mode,
        last_customer_message_at: customer.last_customer_message_at,
        last_staff_reply_at: customer.last_staff_reply_at
      })),
      message_count: seeded.messages.length,
      knowledge_page_count: seeded.knowledge_pages_seeded
    });
  });

  api.get("/api/admin/customers", async (c) => {
    const authorizationHeader = c.req.header("authorization");

    if (hasAuthorizationHeader(authorizationHeader)) {
      if (!adminAuthRuntime) {
        const response = mapAdminAuthErrorToHttp({ code: "authenticated_staff_required" });
        return c.json(response.body, response.status);
      }

      const runtime = await resolveAuthenticatedAdminRuntimeContext(
        createListCustomersAuthenticatedRuntimeInput(
          authorizationHeader,
          authenticatedSelectedTenantId
        ),
        adminAuthRuntime
      );

      if (!runtime.ok) {
        const response = mapAdminAuthErrorToHttp(runtime.error);
        return c.json(response.body, response.status);
      }

      const customers = await listCustomerListItems({
        tenant_id: runtime.tenantId,
        customerRepository,
        messageRepository
      });

      return c.json({
        ok: true,
        tenant_id: runtime.tenantId,
        customers
      });
    }

    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.listCustomers
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const customers = await listCustomerListItems({
      tenant_id: tenant.tenantId,
      customerRepository,
      messageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customers
    });
  });

  api.get("/api/admin/customers/:customerId", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.getCustomerDetail
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const customer = await getCustomerDetail({
      tenant_id: tenant.tenantId,
      customer_id: c.req.param("customerId"),
      customerRepository
    });

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer
    });
  });

  api.get("/api/admin/customers/:customerId/timeline", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.getCustomerTimeline
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const customerId = c.req.param("customerId");
    const customer = await getCustomerDetail({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      customerRepository
    });

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const messages = await listCustomerTimeline({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      messageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      messages
    });
  });

  api.post("/api/admin/customers/:customerId/ai-summary", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.createAiSummary
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const customerId = c.req.param("customerId");
    const customer = await customerRepository.findByIdForTenant(tenant.tenantId, customerId);

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const timelineMessages = await listCustomerTimeline({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      messageRepository
    });
    const conversation = toAiConversationTurns(timelineMessages);

    if (conversation.length === 0) {
      return c.json({ ok: false, error: "cannot_summarize_empty_timeline" }, 409);
    }

    try {
      const summary = await aiProvider.summarizeConversation({
        tenant_id: tenant.tenantId,
        customer_id: customer.id,
        conversation
      });
      const message = await recordAiSummaryMessage({
        tenant_id: tenant.tenantId,
        customer,
        body: JSON.stringify(summary),
        messageRepository,
        ...(now ? { now } : {})
      });

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        customer_id: customer.id,
        summary,
        message: toAdminTimelineMessage(message)
      });
    } catch {
      return c.json({ ok: false, error: "ai_summary_failed" }, 502);
    }
  });

  api.post("/api/admin/customers/:customerId/ai-reply-draft", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.createAiReplyDraft
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const customerId = c.req.param("customerId");
    const customer = await customerRepository.findByIdForTenant(tenant.tenantId, customerId);

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const timelineMessages = await listCustomerTimeline({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      messageRepository
    });
    const conversation = toAiConversationTurns(timelineMessages);

    if (conversation.length === 0) {
      return c.json({ ok: false, error: "cannot_draft_reply_empty_timeline" }, 409);
    }

    try {
      const draft = await aiProvider.draftReply({
        tenant_id: tenant.tenantId,
        customer_id: customer.id,
        conversation
      });

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        customer_id: customer.id,
        draft_body: draft.draft_body,
        next_questions: draft.next_questions,
        risk_flags: draft.risk_flags,
        recommended_response_mode: draft.recommended_response_mode,
        should_handoff: draft.should_handoff,
        provider: draft.provider
      });
    } catch {
      return c.json({ ok: false, error: "ai_reply_draft_failed" }, 502);
    }
  });

  api.post("/api/admin/rag/search", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.searchRag
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const searchBody = await readRagSearchBody(c.req.raw);

    if (!searchBody) {
      return c.json({ ok: false, error: "invalid_rag_search_request" }, 400);
    }

    const results = await searchTenantKnowledge({
      tenant_id: tenant.tenantId,
      query: searchBody.query,
      limit: searchBody.limit,
      repository: knowledgePageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      query: searchBody.query,
      limit: searchBody.limit,
      results
    });
  });

  api.post("/api/admin/rag/answer-draft", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.createRagAnswerDraft
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const searchBody = await readRagSearchBody(c.req.raw);

    if (!searchBody) {
      return c.json({ ok: false, error: "invalid_rag_answer_draft_request" }, 400);
    }

    const results = await searchTenantKnowledge({
      tenant_id: tenant.tenantId,
      query: searchBody.query,
      limit: searchBody.limit,
      repository: knowledgePageRepository
    });
    const sources = toAiRagAnswerSources(results);

    if (sources.length === 0) {
      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        query: searchBody.query,
        can_answer: false,
        answer_body: "公式情報では確認できません。担当者が確認します。",
        sources: [],
        risk_flags: ["no_source"],
        handoff_required: true,
        recommended_response_mode: "human_required"
      });
    }

    try {
      const draft = await aiProvider.draftRagAnswer({
        tenant_id: tenant.tenantId,
        query: searchBody.query,
        sources
      });

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        query: searchBody.query,
        can_answer: draft.can_answer,
        answer_body: draft.answer_body,
        sources: draft.sources,
        risk_flags: draft.risk_flags,
        handoff_required: draft.handoff_required,
        recommended_response_mode: draft.recommended_response_mode,
        provider: draft.provider
      });
    } catch {
      return c.json({ ok: false, error: "rag_answer_draft_failed" }, 502);
    }
  });

  api.post("/api/admin/customers/:customerId/reply", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.sendStaffReply
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const customer = await customerRepository.findByIdForTenant(
      tenant.tenantId,
      c.req.param("customerId")
    );

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const replyBody = await readStaffReplyBody(c.req.raw);

    if (!replyBody) {
      return c.json({ ok: false, error: "invalid_reply_body" }, 400);
    }

    if (!customer.line_user_id) {
      return c.json({ ok: false, error: "cannot_reply_without_line_user_id" }, 409);
    }

    try {
      await lineClient.pushMessage(customer.line_user_id, [{ type: "text", text: replyBody }]);
    } catch {
      return c.json({ ok: false, error: "line_send_failed" }, 502);
    }

    const result = await recordStaffTextReply({
      tenant_id: tenant.tenantId,
      customer,
      body: replyBody,
      staff_user_id: readOptionalHeader(c.req.header("x-staff-id")),
      customerRepository,
      messageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_id: customer.id,
      message: {
        id: result.message.id,
        tenant_id: result.message.tenant_id,
        customer_id: result.message.customer_id,
        role: result.message.role,
        message_type: result.message.message_type,
        body: result.message.body,
        line_message_id: result.message.line_message_id,
        source_url: result.message.media_storage_path,
        created_at: result.message.created_at
      },
      customer: {
        id: result.customer.id,
        tenant_id: result.customer.tenant_id,
        response_mode: result.customer.response_mode,
        last_staff_reply_at: result.customer.last_staff_reply_at
      }
    });
  });

  api.get("/api/admin/alerts", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.listAlerts
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const status = c.req.query("status");
    const alerts = await alertRepository.listByTenant(tenant.tenantId);
    const filteredAlerts = status
      ? alerts.filter((alert) => alert.status === status)
      : alerts;

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      alerts: filteredAlerts.map(toAdminAlert)
    });
  });

  api.post("/api/admin/alerts/check-unreplied", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.checkUnrepliedAlerts
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const result = await checkUnrepliedAlerts({
      tenant_id: tenant.tenantId,
      customerRepository,
      alertRepository,
      ...(now ? { now } : {})
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      checked_customers: result.checked_customers,
      alerts_created: result.alerts_created,
      alerts: result.alerts.map((alert) => ({
        ...alert,
        type: alert.alert_type
      }))
    });
  });

  api.post("/api/admin/alerts/notify-open", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
      context: tenant.context,
      action: adminRouteActions.notifyOpenAlerts
    });

    if (!roleGuard.ok) {
      return c.json(roleGuard.body, roleGuard.status);
    }

    const result = await notifyOpenAlerts({
      tenant_id: tenant.tenantId,
      alertRepository,
      staffNotifier,
      ...(now ? { now } : {})
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      notified: result.notified,
      failed: result.failed,
      skipped: result.skipped,
      notified_alerts: result.notified_alerts,
      failed_alerts: result.failed_alerts
    });
  });

  api.post("/api/line/webhook/:webhookSecret", async (c) => {
    const webhookSecret = c.req.param("webhookSecret");
    const tenant = resolveWebhookTenant(webhookSecret, env);

    if (!tenant) {
      return c.json({ ok: false, error: "unknown_webhook_path" }, 404);
    }

    if (!tenant.channelSecret) {
      return c.json({ ok: false, error: "line_channel_secret_not_configured" }, 500);
    }

    const rawBody = await c.req.text();
    const signature = c.req.header("x-line-signature") ?? "";
    const signatureValid = verifyLineSignature({
      channelSecret: tenant.channelSecret,
      body: rawBody,
      signature
    });

    if (!signatureValid) {
      return c.json({ ok: false, error: "invalid_line_signature" }, 401);
    }

    try {
      const payload = parseLineWebhookPayload(rawBody);
      const logging = await logLineWebhookEvents({
        tenant_id: tenant.tenantId,
        events: payload.events,
        customerRepository,
        messageRepository
      });

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        tenant_slug: tenant.tenantSlug,
        destination: payload.destination,
        event_count: payload.events.length,
        events: payload.events,
        logging
      });
    } catch {
      return c.json({ ok: false, error: "malformed_line_webhook_body" }, 400);
    }
  });

  return api;
}

export const app = createApiApp();

function hasAuthorizationHeader(authorizationHeader: string | undefined): authorizationHeader is string {
  return Boolean(authorizationHeader?.trim());
}

function createListCustomersAuthenticatedRuntimeInput(
  authorizationHeader: string,
  selectedTenantId: string | null | undefined
): AuthenticatedAdminRuntimeInput {
  const input: AuthenticatedAdminRuntimeInput = {
    authorizationHeader,
    action: adminRouteActions.listCustomers
  };

  if (selectedTenantId !== undefined) {
    input.selectedTenantId = selectedTenantId;
  }

  return input;
}

interface ResolvedWebhookTenant {
  tenantId: string;
  tenantSlug: string;
  channelSecret: string | undefined;
}

interface DemoSeedResult {
  customers: Customer[];
  messages: Message[];
  knowledge_pages_seeded: number;
}

interface SeedableKnowledgePageRepository extends KnowledgePageRepository {
  upsertMany(pages: KnowledgePage[]): void;
}

async function seedDemoData(input: {
  tenant_id: string;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  knowledgePageRepository: KnowledgePageRepository;
}): Promise<DemoSeedResult> {
  const customers = createDemoCustomers(input.tenant_id);
  const messages = createDemoMessages(input.tenant_id);
  let knowledgePages: KnowledgePage[] = [];

  for (const customer of customers) {
    await input.customerRepository.save(customer);
  }

  for (const message of messages) {
    await input.messageRepository.insert(message);
  }

  if (
    input.tenant_id === AMAMI_HOME_TENANT_ID &&
    isSeedableKnowledgePageRepository(input.knowledgePageRepository)
  ) {
    knowledgePages = createAmamiHomeKnowledgePages();
    input.knowledgePageRepository.upsertMany(knowledgePages);
  }

  return {
    customers,
    messages,
    knowledge_pages_seeded: knowledgePages.length
  };
}

function isSeedableKnowledgePageRepository(
  repository: KnowledgePageRepository
): repository is SeedableKnowledgePageRepository {
  const maybeSeedable = repository as { upsertMany?: unknown };

  return typeof maybeSeedable.upsertMany === "function";
}

function createDemoCustomers(tenantId: string): Customer[] {
  return [
    {
      id: "customer_demo_yamada_taro",
      tenant_id: tenantId,
      line_user_id: "U_DEMO_YAMADA_TARO",
      display_name: "山田 太郎",
      picture_url: null,
      phone: null,
      email: null,
      postal_code: null,
      address: null,
      interest_tags: ["平屋", "SoToNo MA", "モデルホーム見学"],
      response_mode: "human_required",
      status: "active",
      last_message_at: "2026-06-13T10:18:00.000Z",
      last_customer_message_at: "2026-06-13T10:18:00.000Z",
      last_staff_reply_at: null,
      created_at: "2026-06-13T10:00:00.000Z",
      updated_at: "2026-06-13T10:18:00.000Z"
    },
    {
      id: "customer_demo_sato_hanako",
      tenant_id: tenantId,
      line_user_id: "U_DEMO_SATO_HANAKO",
      display_name: "佐藤 花子",
      picture_url: null,
      phone: null,
      email: null,
      postal_code: null,
      address: null,
      interest_tags: ["オンライン相談", "資料請求"],
      response_mode: "human_active",
      status: "active",
      last_message_at: "2026-06-13T10:35:00.000Z",
      last_customer_message_at: "2026-06-13T10:14:00.000Z",
      last_staff_reply_at: "2026-06-13T10:35:00.000Z",
      created_at: "2026-06-13T10:05:00.000Z",
      updated_at: "2026-06-13T10:35:00.000Z"
    }
  ];
}

function createDemoMessages(tenantId: string): Message[] {
  return [
    {
      id: "message_demo_yamada_1",
      tenant_id: tenantId,
      customer_id: "customer_demo_yamada_taro",
      consultation_id: null,
      line_message_id: "demo-line-message-yamada-1",
      role: "customer",
      message_type: "text",
      body: "平屋の施工事例とSoToNo MAについて相談したいです。",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: false,
      sent_to_line_at: null,
      created_at: "2026-06-13T10:08:00.000Z"
    },
    {
      id: "message_demo_yamada_2",
      tenant_id: tenantId,
      customer_id: "customer_demo_yamada_taro",
      consultation_id: null,
      line_message_id: "demo-line-message-yamada-2",
      role: "customer",
      message_type: "text",
      body: "モデルホーム見学の日程も知りたいです。",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: false,
      sent_to_line_at: null,
      created_at: "2026-06-13T10:18:00.000Z"
    },
    {
      id: "message_demo_sato_1",
      tenant_id: tenantId,
      customer_id: "customer_demo_sato_hanako",
      consultation_id: null,
      line_message_id: "demo-line-message-sato-1",
      role: "customer",
      message_type: "text",
      body: "オンライン相談と資料請求をお願いしたいです。",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: false,
      sent_to_line_at: null,
      created_at: "2026-06-13T10:14:00.000Z"
    },
    {
      id: "message_demo_sato_2",
      tenant_id: tenantId,
      customer_id: "customer_demo_sato_hanako",
      consultation_id: null,
      line_message_id: null,
      role: "staff",
      message_type: "text",
      body: "オンライン相談の日程候補と資料請求の送付先を確認します。",
      media_storage_path: null,
      staff_user_id: "staff_demo_admin",
      ai_generated: false,
      sent_to_line_at: "2026-06-13T10:35:00.000Z",
      created_at: "2026-06-13T10:35:00.000Z"
    }
  ];
}

function isProductionRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.APP_ENV === "production" || env.NODE_ENV === "production";
}

async function readStaffReplyBody(request: Request): Promise<string | null> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.body !== "string") {
    return null;
  }

  const body = parsed.body.trim();

  return body.length > 0 ? body : null;
}

async function readRagSearchBody(
  request: Request
): Promise<{ query: string; limit: number } | null> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.query !== "string") {
    return null;
  }

  const query = parsed.query.trim();

  if (!query) {
    return null;
  }

  const limit = parsed.limit ?? 5;

  if (!Number.isInteger(limit) || typeof limit !== "number" || limit < 1 || limit > 10) {
    return null;
  }

  return {
    query,
    limit
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalHeader(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function toAiConversationTurns(
  messages: Array<{
    role: AiConversationTurn["role"];
    message_type: string;
    body: string | null;
    created_at: string;
  }>
): AiConversationTurn[] {
  return messages
    .filter((message) => message.message_type !== "summary" && message.body?.trim())
    .map((message) => ({
      role: message.role,
      content: message.body?.trim() ?? "",
      created_at: message.created_at
    }));
}

function toAdminTimelineMessage(message: Message): {
  id: string;
  tenant_id: string;
  customer_id: string;
  role: string;
  message_type: string;
  body: string | null;
  line_message_id: string | null;
  source_url: string | null;
  created_at: string;
} {
  return {
    id: message.id,
    tenant_id: message.tenant_id,
    customer_id: message.customer_id,
    role: message.role,
    message_type: message.message_type,
    body: message.body,
    line_message_id: message.line_message_id,
    source_url: message.media_storage_path,
    created_at: message.created_at
  };
}

function toAiRagAnswerSources(
  results: Array<{
    id: string;
    title: string;
    url: string;
    category: string;
    source_type: string;
    excerpt: string;
    score: number;
  }>
): AiRagAnswerSource[] {
  return results.map((result) => ({
    id: result.id,
    title: result.title,
    url: result.url,
    category: result.category,
    source_type: result.source_type,
    excerpt: result.excerpt,
    score: result.score
  }));
}

function toAdminAlert(alert: Alert): {
  id: string;
  tenant_id: string;
  customer_id: string;
  type: string;
  severity: string;
  status: string;
  message: string;
  notified_at: string | null;
  resolved_at: string | null;
  created_at: string;
} {
  return {
    id: alert.id,
    tenant_id: alert.tenant_id,
    customer_id: alert.customer_id,
    type: alert.alert_type,
    severity: alert.severity,
    status: alert.status,
    message: alert.message,
    notified_at: alert.notified_at,
    resolved_at: alert.resolved_at,
    created_at: alert.created_at
  };
}

function resolveAdminTenant(tenantId: string | undefined, env: NodeJS.ProcessEnv) {
  const result = resolveAdminTenantContext({
    tenantIdHeader: tenantId,
    env
  });

  if (result.status === "ok") {
    return result;
  }

  return {
    ...result,
    httpResponse: mapAdminTenantGuardErrorToHttp(result.error)
  };
}

function resolveWebhookTenant(
  webhookSecret: string,
  env: NodeJS.ProcessEnv
): ResolvedWebhookTenant | null {
  const config = loadAppConfig(env);

  if (webhookSecret !== config.line.webhookSecretPath) {
    return null;
  }

  return {
    tenantId: config.tenant.id,
    tenantSlug: config.tenant.slug,
    channelSecret: env.LINE_CHANNEL_SECRET
  };
}

if (process.env.NODE_ENV !== "test") {
  serve(
    {
      fetch: app.fetch,
      port: 4000
    },
    (info) => {
      console.log(`API server listening on http://localhost:${info.port}`);
    }
  );
}
