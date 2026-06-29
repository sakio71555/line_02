import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/154_supabase_staging_endpoint_reentry_connection_preflight.md",
  runbook: "docs/15_runbooks/supabase_staging_endpoint_reentry_connection_preflight.md",
  loop153Runbook: "docs/15_runbooks/supabase_staging_connection_read_smoke_remediation.md",
  loop152Runbook: "docs/15_runbooks/supabase_staging_connection_execution.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 154 Supabase staging endpoint re-entry preflight docs", () => {
  it("adds the Loop 154 task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records endpoint re-entry and redacted DNS/TCP result without connecting runtime", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "operator_secret_entry=completed_outside_codex",
      "supabase_runtime_env_values_recorded=no",
      "supabase_runtime_env_format_check=passed",
      "supabase_rest_host_dns=failed; host not displayed; error=ENOTFOUND",
      "supabase_rest_tcp=error; host not displayed",
      "supabase_db_host_dns=failed; host not displayed; error=ENOTFOUND",
      "supabase_db_tcp=error; host not displayed",
      "general_dns_example_com=success",
      "general_dns_github_com=success",
      "supabase_rest_root_status=skipped_due_rest_dns_tcp_failure",
      "psql_metadata_status=skipped_due_db_dns_tcp_failure",
      "repository_runtime_switch_attempted=no",
      "customers_read_smoke_status=skipped_due_rest_dns_tcp_failure",
      "final_runtime=in_memory",
      "line_invalid_signature_post_loop154=401",
      "classification=C_endpoint_still_dns_tcp_failed",
      "supabase_ready=false",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records that unsafe production actions and write smoke were not performed", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("write_smoke=not_performed");
    expect(combined).toContain("Supabase production data access was not performed");
    expect(combined).toContain("migration apply");
    expect(combined).toContain("RLS change");
    expect(combined).toContain("OpenAI real API was not performed");
    expect(combined).toContain("LINE real push/reply was not performed");
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
