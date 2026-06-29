import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/177_explicit_production_activation_with_operator_approval.md",
  runbook: "docs/15_runbooks/explicit_production_activation_with_operator_approval.md",
  planningRunbook: "docs/15_runbooks/operator_final_go_approval_and_runtime_activation_planning.md",
  finalReview: "docs/15_runbooks/final_production_" + "go_nogo_review.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-28.md"
};

describe("Loop 177 explicit production activation with operator approval", () => {
  it("adds the Loop 177 task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records safe operator tokens and review-only activation mode", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO",
      "ALLOW_RUNTIME_ACTIVATION_CHANGES=NO",
      "ACTIVATION_MODE=review_only",
      "ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO",
      "ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO",
      "ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO",
      "ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO",
      "ALLOW_ADDITIONAL_LINE_SEND_SMOKE=NO"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records no activation, no rollback, and No-Go readiness", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "activation_performed=false",
      "activation_result=not_performed",
      "runtime_activation_changes=not_performed",
      "rollback_performed=false",
      "rollback_needed=false",
      "final_operator_go=false",
      "go_ready_but_operator_go_pending=true",
      "remaining_no_go_reasons=final operator production Go not approved",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }

    expect(combined).not.toContain("final_operator_go=true");
  });

  it("records final runtime and safety evidence", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=false",
      "AI_PROVIDER=mock",
      "OpenAI drop-in absent",
      "Nginx/DNS/certbot changes=none",
      "Supabase schema/RLS changes=none",
      "additional_line_send_performed=false",
      "openai_real_api_performed=false",
      "api_direct_health_loop177_final=200",
      "https_api_health_loop177_final=200",
      "https_admin_root_loop177_final=200",
      "https_admin_customers_loop177_final=200",
      "https_admin_api_no_header_customers_loop177_final=401",
      "https_line_invalid_signature_loop177_final=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records rollback checklist and next approval retry loop", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.handoff]);

    expect(combined).toContain("Rollback Checklist");
    expect(combined).toContain("Rollback was not needed");
    expect(combined).toContain("Loop 178: production activation approval retry");
  });

  it("does not record secrets, endpoints, identifiers, bodies, or promotion state", () => {
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
    new RegExp("line-test-sent-no-auto-reply")
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
