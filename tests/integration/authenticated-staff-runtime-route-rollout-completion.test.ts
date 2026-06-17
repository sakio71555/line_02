import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/092_authenticated_staff_rag_routes_and_rollout_audit.md"
);
const auditDocPath = join(
  repoRoot,
  "docs/15_runbooks/authenticated_staff_route_rollout_completion_audit.md"
);
const rolloutRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/authenticated_staff_runtime_route_rollout.md"
);
const productionHardeningPath = join(
  repoRoot,
  "docs/15_runbooks/production_hardening_split_plan.md"
);
const rlsReadinessPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const apiIndexPath = join(repoRoot, "apps/api/src/index.ts");

const completedAdminRoutes = [
  "GET /api/admin/customers",
  "GET /api/admin/customers/:customerId",
  "GET /api/admin/customers/:customerId/timeline",
  "POST /api/admin/customers/:customerId/reply",
  "POST /api/admin/customers/:customerId/ai-summary",
  "POST /api/admin/customers/:customerId/ai-reply-draft",
  "GET /api/admin/alerts",
  "POST /api/admin/alerts/check-unreplied",
  "POST /api/admin/alerts/notify-open",
  "POST /api/admin/rag/search",
  "POST /api/admin/rag/answer-draft"
] as const;

const excludedRoutes = [
  "POST /api/dev/seed-demo-data",
  "POST /api/line/webhook/:webhookSecret",
  "GET /health"
] as const;

describe("Loop 092 authenticated staff route rollout completion audit", () => {
  it("adds the Loop 092 task doc and completion audit runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(auditDocPath)).toBe(true);
  });

  it("links README and rollout docs to the Loop 092 task doc and audit", () => {
    for (const filePath of [
      readmePath,
      devLoopPath,
      rolloutRunbookPath,
      productionHardeningPath,
      rlsReadinessPath
    ]) {
      const text = readText(filePath);
      expect(text, filePath).toContain(
        "092_authenticated_staff_rag_routes_and_rollout_audit.md"
      );
      expect(text, filePath).toContain(
        "authenticated_staff_route_rollout_completion_audit.md"
      );
    }
  });

  it("documents completed authenticated_staff coverage for every main Admin route", () => {
    const taskDoc = readText(taskDocPath);
    const auditDoc = readText(auditDocPath);

    for (const route of completedAdminRoutes) {
      expect(auditDoc).toContain(route);
    }

    expect(taskDoc).toContain("POST /api/admin/rag/search");
    expect(taskDoc).toContain("POST /api/admin/rag/answer-draft");
    expect(taskDoc).toContain("rollout audit docs");

    for (const text of [taskDoc, auditDoc]) {
      expect(text).toContain("customer read");
      expect(text).toContain("customer write");
      expect(text).toContain("alerts routes");
      expect(text).toContain("RAG routes");
    }

    expect(auditDoc).toContain("rollout status");
  });

  it("documents routes excluded from authenticated_staff Admin rollout", () => {
    const taskDoc = readText(taskDocPath);
    const auditDoc = readText(auditDocPath);

    for (const route of excludedRoutes) {
      expect(taskDoc).toContain(route);
      expect(auditDoc).toContain(route);
    }

    expect(auditDoc).toContain("authenticated_staff Admin route rollout対象外");
    expect(auditDoc).toContain("LINE webhook secret + signature");
  });

  it("documents selectedTenantId, verified tenant, and RAG source rules", () => {
    const taskDoc = readText(taskDocPath);
    const auditDoc = readText(auditDocPath);

    for (const text of [taskDoc, auditDoc]) {
      expect(text).toContain("selectedTenantId");
      expect(text).toContain("active membership");
      expect(text).toContain("AdminTenantContext.tenantId");
      expect(text).toContain("raw `x-selected-tenant-id`");
      expect(text).toContain("allowed_for_ai=true");
      expect(text).toContain("allowed_for_ai=false");
      expect(text).toContain("他tenant");
      expect(text).toContain("MockAiProvider");
      expect(text).toContain("OpenAI APIは呼ばない");
    }
  });

  it("keeps dev_header compatibility and production No-Go explicit", () => {
    const taskDoc = readText(taskDocPath);
    const auditDoc = readText(auditDocPath);
    const hardeningDoc = readText(productionHardeningPath);

    for (const text of [taskDoc, auditDoc, hardeningDoc]) {
      expect(text).toContain("dev_header");
      expect(text).toContain("default runtime");
      expect(text).toContain("in_memory");
      expect(text).toContain("Supabase Auth/JWT");
      expect(text).toContain("RLS SQL");
      expect(text).toContain("No-Go");
    }
  });

  it("connects the RAG routes to the tenant scoped admin route helper", () => {
    const apiIndex = readText(apiIndexPath);

    for (const route of ["/api/admin/rag/search", "/api/admin/rag/answer-draft"]) {
      const routeStart = apiIndex.indexOf(route);
      expect(routeStart, route).toBeGreaterThan(-1);
      const routeSlice = apiIndex.slice(routeStart, routeStart + 2200);

      expect(routeSlice).toContain("resolveTenantScopedAdminRouteTenant");
      expect(routeSlice).toContain("authorizationHeader");
      expect(routeSlice).toContain("selectedTenantIdHeader");
      expect(routeSlice).toContain("adminAuthRuntime");
      expect(routeSlice).toContain("adminRouteActions");
    }
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
