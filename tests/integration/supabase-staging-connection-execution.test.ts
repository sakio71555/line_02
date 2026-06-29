import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/152_supabase_staging_connection_execution.md",
  runbook: "docs/15_runbooks/supabase_staging_connection_execution.md",
  secretChecklist: "docs/15_runbooks/supabase_staging_secret_injection_checklist.md",
  runtimeRunbook: "docs/15_runbooks/production_runtime_wiring_remediation.md",
  fastLane: "docs/15_runbooks/production_integration_fast_lane.md",
  finalReview: "docs/15_runbooks/final_production_go_nogo_review.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 152 Supabase staging connection execution docs", () => {
  it("adds the Loop 152 task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records the Supabase runtime attempt, rollback, and no-go outcome", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "operator_secret_entry=completed_outside_codex",
      "initial_failure_cause=Node.js 20 WebSocket transport missing",
      "vps_staging_validation_after_fix=success",
      "api_direct_health_with_supabase=200",
      "https_api_health_with_supabase=200",
      "runtime_data_backend_with_supabase=supabase",
      "api_direct_admin_customers_with_supabase=500",
      "supabase_rest_read_preflight=failed_dns_or_connection",
      "supabase_rest_read_preflight_details_recorded=no",
      "write_smoke=not_performed",
      "rollback_helper=/root/bin/amami-line-disable-supabase-runtime.sh",
      "rollback_to_in_memory=completed",
      "runtime_data_backend_after_rollback=in_memory",
      "line_invalid_signature_after_supabase=401",
      "supabase_ready=false",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the Node.js 20 client-boundary fix without changing repository behavior", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    expect(combined).toContain("dependency_added=ws");
    expect(combined).toContain("dev_dependency_added=@types/ws");
    expect(combined).toContain("supabase_client_transport=server_side_ws");
    expect(combined).toContain("client_boundary_only=true");
    expect(combined).toContain("repository_behavior_changed=no");
  });

  it("does not record secret values, Supabase endpoints, webhook paths, or production go state", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
      new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
      new RegExp(envAssignment("OPENAI_API_KEY")),
      new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
      new RegExp(envAssignment("SUPABASE_DB_URL")),
      new RegExp("SUPABASE_URL" + "=https?://[^<]"),
      new RegExp(envAssignment("SUPABASE_ANON_KEY")),
      new RegExp("https://" + "[a-z0-9-]+\\.supabase\\.co", "i"),
      new RegExp("postgres(?:ql)?" + "://", "i"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("priv" + "key\\.pem"),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("U[a-f0-9]{32}", "i"),
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(repoRoot, relativePath);
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readFileSync(resolve(relativePath), "utf8")).join("\n");
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
