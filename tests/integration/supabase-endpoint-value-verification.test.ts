import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/155_supabase_endpoint_value_verification.md",
  runbook: "docs/15_runbooks/supabase_endpoint_value_verification.md",
  loop154Runbook: "docs/15_runbooks/supabase_staging_endpoint_reentry_connection_preflight.md",
  loop153Runbook: "docs/15_runbooks/supabase_staging_connection_read_smoke_remediation.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 155 Supabase endpoint value verification docs", () => {
  it("adds the Loop 155 task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records the non-secret endpoint shape diagnosis and active dashboard state", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "dashboard_status=active",
      "supabase_runtime_env_values_recorded=no",
      "supabase_url_shape=expected",
      "supabase_url_parse=ok",
      "supabase_url_protocol=https",
      "supabase_url_hostname_suffix_kind=supabase.co",
      "supabase_url_has_whitespace=false",
      "supabase_url_contains_postgres=false",
      "supabase_db_url_shape=expected",
      "supabase_db_url_parse=ok",
      "supabase_db_url_protocol=postgresql",
      "supabase_db_url_hostname_suffix_kind=supabase.co",
      "supabase_db_url_has_whitespace=false",
      "supabase_db_url_contains_postgres=true",
      "supabase_anon_key_present=true",
      "supabase_service_role_key_present=true",
      "supabase_service_role_rest_auth_accepted=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records successful redacted connectivity, REST preflight, and Supabase runtime smoke", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "supabase_rest_host_dns=success; host not displayed",
      "supabase_rest_tcp=success; host not displayed",
      "supabase_db_host_dns=success; host not displayed",
      "supabase_db_tcp=success; host not displayed",
      "supabase_rest_root_status=200",
      "supabase_rest_table_customers_status=206",
      "supabase_rest_table_messages_status=206",
      "supabase_rest_table_alerts_status=206",
      "supabase_rest_table_knowledge_pages_status=206",
      "supabase_rest_table_staff_users_status=206",
      "supabase_rest_table_staff_tenant_memberships_status=206",
      "runtime_connection_performed=yes",
      "repository_runtime_final=supabase",
      "api_direct_health_supabase=200",
      "https_api_health_supabase=200",
      "customers_no_header_status=401",
      "customers_dev_header_status=200",
      "customers_body_recorded=no",
      "line_invalid_signature_loop155=401",
      "rollback_performed=no",
      "supabase_ready=true",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records that unsafe production actions and write smoke were not performed", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("write_smoke=not_performed");
    expect(combined).toContain("OpenAI real API was not performed");
    expect(combined).toContain("LINE real push/reply");
    expect(combined).toContain("migration");
    expect(combined).toContain("RLS");
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
