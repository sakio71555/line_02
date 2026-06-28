import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/185_post_production_backlog_triage.md",
  runbook: "docs/15_runbooks/post_production_backlog_triage.md",
  backlog: "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readme: "README.md"
};

describe("Loop 185 post-production backlog triage", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("covers all eight backlog items", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "1. 運用監視の自動化",
      "2. OpenAI usage / cost monitoring",
      "3. authenticated staff route改善",
      "4. 管理画面の認証UX強化",
      "5. backup automation",
      "6. audit log",
      "7. operator manual",
      "8. multi-tenant onboarding"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the P0/P1/P2 priority matrix and next loops", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.backlog]);

    for (const expected of [
      "Priority Matrix",
      "P0",
      "P1",
      "P2",
      "Loop 186: production monitoring automation dry-run",
      "Loop 187: OpenAI usage and cost monitoring plan",
      "Loop 188: authenticated staff reply route production auth remediation plan",
      "Loop 189: admin auth UX hardening plan",
      "Loop 190: production backup automation plan",
      "Loop 191: audit log design plan",
      "Loop 192: operator manual first draft",
      "Loop 193: multi-tenant onboarding plan"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records production state and safety boundaries without changing runtime", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "production_readiness=production_go",
      "activation_mode=line_and_openai_runtime",
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present",
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "OpenAI real API smoke=not performed",
      "supabase_schema_rls_changes=none",
      "nginx_dns_certbot_changes=none"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records read-only safety evidence", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "api_direct_health_loop185_backlog_triage=200",
      "https_api_health_loop185_backlog_triage=200",
      "https_admin_root_loop185_backlog_triage=200",
      "https_admin_customers_loop185_backlog_triage=200",
      "https_admin_api_no_header_customers_loop185_backlog_triage=401",
      "https_line_invalid_signature_loop185_backlog_triage=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("links Loop 185 from existing docs and dev log", () => {
    const combined = readCombined([paths.backlog, paths.devLog, paths.readme]);

    expect(combined).toContain("Loop 185");
    expect(combined).toContain("post-production backlog triage");
    expect(combined).toContain("Loop 186: production monitoring automation dry-run");
  });

  it("does not record secrets, webhook paths, identifiers, bodies, or provider values", () => {
    const combined = readCombined(Object.values(paths));

    for (const pattern of forbiddenPatterns()) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(repoRoot, relativePath);
}

function read(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map(read).join("\n");
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
    new RegExp("line-test" + "-sent-no-auto-reply")
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
