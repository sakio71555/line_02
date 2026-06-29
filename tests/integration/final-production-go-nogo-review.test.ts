import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/175_final_production_" + "go_nogo_review.md",
  runbook: "docs/15_runbooks/final_production_" + "go_nogo_review.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-28.md"
};

describe("Loop 175 final production Go/No-Go review", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records the readiness matrix areas", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.readiness]);

    for (const expected of [
      "HTTPS",
      "LINE receive",
      "LINE Official Account",
      "Supabase",
      "Supabase receive persistence",
      "OpenAI provider controlled smoke",
      "LINE reply/push",
      "Security/safety",
      "Final operator Go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records No-Go because final operator production Go is not approved", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO",
      "final_operator_go=false",
      "go_ready_but_operator_go_pending=true",
      "production_readiness=production_no_go",
      "remaining_no_go_reasons=final operator production Go not recorded",
      "runtime_activation_changes=not_performed"
    ]) {
      expect(combined).toContain(expected);
    }

    expect(combined).not.toContain("final_operator_go=true");
  });

  it("records final runtime state without activation", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.readiness, paths.handoff]);

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=false",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in absent",
      "Nginx/DNS/certbot changes=none",
      "Nginx reload/restart=not_performed"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records rollback and first-hour monitoring checklists", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.handoff]);

    expect(combined).toContain("Rollback Checklist");
    expect(combined).toContain("First-Hour Monitoring Checklist");
    expect(combined).toContain("invalid-signature");
    expect(combined).toContain("no-header Admin API");
  });

  it("records final safety evidence", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "api_direct_health_loop175_final_review=200",
      "https_api_health_loop175_final_review=200",
      "https_admin_root_loop175_final_review=200",
      "https_admin_customers_loop175_final_review=200",
      "https_admin_api_no_header_customers_loop175_final_review=401",
      "https_line_invalid_signature_loop175_final_review=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secret-shaped values in Loop 175 docs", () => {
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
    new RegExp("postgresql" + "://", "i"),
    new RegExp("postgres" + "://", "i"),
    new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
    new RegExp("priv" + "key\\.pem")
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
