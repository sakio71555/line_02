import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/176_operator_final_go_approval_and_runtime_activation_planning.md",
  runbook: "docs/15_runbooks/operator_final_go_approval_and_runtime_activation_planning.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  finalReview: "docs/15_runbooks/final_production_" + "go_nogo_review.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-28.md"
};

describe("Loop 176 operator final Go approval and runtime activation planning", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("keeps final approval and activation tokens as NO", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO",
      "ALLOW_RUNTIME_ACTIVATION_CHANGES=NO",
      "ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO",
      "ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO",
      "ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO",
      "final_operator_go=false",
      "go_ready_but_operator_go_pending=true",
      "production_readiness=production_no_go",
      "runtime_activation_changes=not_performed"
    ]) {
      expect(combined).toContain(expected);
    }

    expect(combined).not.toContain("final_operator_go=true");
    expect(combined).not.toContain("production_readiness=production_" + "go");
  });

  it("records the current safe runtime state and read-only evidence", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=false",
      "AI_PROVIDER=mock",
      "OpenAI drop-in absent",
      "Nginx/DNS/certbot changes=none",
      "Nginx reload/restart=not_performed",
      "api_direct_health_loop176_planning=200",
      "https_api_health_loop176_planning=200",
      "https_admin_root_loop176_planning=200",
      "https_admin_customers_loop176_planning=200",
      "https_admin_api_no_header_customers_loop176_planning=401",
      "https_line_invalid_signature_loop176_planning=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents activation options, rollback, and first-hour monitoring", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.handoff]);

    for (const expected of [
      "Option A: Safe Mode",
      "Option B: LINE Real Push Final Activation",
      "Option C: OpenAI Runtime Final Activation",
      "Option D: Combined Activation",
      "Rollback",
      "First-Hour Monitoring",
      "Loop 177: explicit production activation with operator approval"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets, concrete endpoints, identifiers, exact bodies, or promotion state", () => {
    const combined = readCombined(Object.values(paths));

    for (const pattern of forbiddenPatterns()) {
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

function forbiddenPatterns(): RegExp[] {
  return [
    new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
    new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
    new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
    new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
    new RegExp('userId["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp('replyToken["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp(envAssignment("OPENAI_API_KEY")),
    new RegExp(envAssignment("OPENAI_MODEL")),
    new RegExp("sk-" + "[A-Za-z0-9]"),
    new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
    new RegExp("SUPABASE_URL=https?" + "://[^<\\s]+"),
    new RegExp(envAssignment("SUPABASE_ANON_KEY")),
    new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
    new RegExp(envAssignment("SUPABASE_DB_URL")),
    new RegExp("https://" + "[a-z0-9-]+\\.supabase\\.co", "i"),
    new RegExp("postgresql" + "://", "i"),
    new RegExp("postgres" + "://", "i"),
    new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
    new RegExp("priv" + "key\\.pem"),
    new RegExp("line-test-sent-no-auto-reply"),
    new RegExp("production_readiness=production_" + "go")
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
