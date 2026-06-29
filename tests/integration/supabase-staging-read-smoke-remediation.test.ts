import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/153_supabase_staging_connection_read_smoke_remediation.md",
  runbook: "docs/15_runbooks/supabase_staging_connection_read_smoke_remediation.md",
  loop152Runbook: "docs/15_runbooks/supabase_staging_connection_execution.md",
  secretChecklist: "docs/15_runbooks/supabase_staging_secret_injection_checklist.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 153 Supabase staging read-smoke remediation docs", () => {
  it("adds the Loop 153 task doc and remediation runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records redacted DNS/TCP/REST preflight and classification", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "SUPABASE_URL configured; value not recorded",
      "SUPABASE_ANON_KEY configured; value not recorded",
      "SUPABASE_SERVICE_ROLE_KEY configured; value not recorded",
      "SUPABASE_DB_URL configured; value not recorded",
      "supabase_url_dns=failed; host not displayed",
      "supabase_url_tcp_443=error; host not displayed",
      "supabase_rest_root_fetch=failed; error=TypeError",
      "supabase_db_url_dns=failed; host not displayed",
      "general_dns_example_com=success",
      "api_admin_customers_no_header_supabase=401",
      "api_admin_customers_dev_header_supabase=500",
      "classification=A_supabase_url_dns_tcp_rest_connection_issue",
      "fix_applied=no",
      "rollback_to_in_memory=completed",
      "line_invalid_signature_post_loop153=401",
      "supabase_ready=false",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records that no write smoke or external production changes were performed", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("write_smoke=not_performed");
    expect(combined).toContain("OpenAI real API was not performed");
    expect(combined).toContain("LINE real push/reply was not performed");
    expect(combined).toContain("migration apply");
    expect(combined).toContain("RLS change");
  });

  it("does not record secret values, concrete Supabase endpoints, webhook paths, or production go state", () => {
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
