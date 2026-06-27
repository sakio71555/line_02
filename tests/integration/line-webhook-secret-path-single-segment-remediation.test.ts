import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/145_line_webhook_secret_path_single_segment_remediation.md",
  remediationRunbook: "docs/15_runbooks/line_webhook_secret_path_single_segment_remediation.md",
  routeRunbook: "docs/15_runbooks/line_webhook_404_route_diagnosis.md",
  runtimeRunbook: "docs/15_runbooks/line_runtime_secret_injection_and_webhook_verification.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 145A LINE webhook secret path single-segment remediation docs", () => {
  it("adds the Loop 145A task doc and remediation runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.remediationRunbook))).toBe(true);
  });

  it("records the previous root cause and single-segment remediation without recording the value", () => {
    const combined = readCombined([paths.taskDoc, paths.remediationRunbook, paths.routeRunbook, paths.devLog]);

    expect(combined).toContain("root_cause=LINE_WEBHOOK_SECRET_PATH_contains_slash_and_does_not_match_single_segment_route");
    expect(combined).toContain("format_check=passed");
    expect(combined).toContain("LINE_WEBHOOK_SECRET_PATH: single-segment; value not displayed");
    expect(combined).toContain("LINE_WEBHOOK_SECRET_PATH configured; value not recorded");
    expect(combined).toContain("LINE_REAL_PUSH_ENABLED=false");
  });

  it("records health checks, route matrix, and successful LINE Developers verification", () => {
    const combined = readCombined([paths.taskDoc, paths.remediationRunbook, paths.readiness, paths.devLog]);

    for (const expected of [
      "api_restart=success",
      "api_service=active",
      "direct_health_http_code=200",
      "https_api_health_http_code=200",
      "direct_api_prefixed_invalid_signature=401",
      "direct_non_api_prefixed_invalid_signature=404",
      "https_api_prefixed_invalid_signature=401",
      "https_known_wrong_path_valid_signature=404",
      "line_developers_console_url_updated_by_operator=yes",
      "line_developers_verification_result=success"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps real delivery and production go blocked", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("line_real_push_reply=not_performed");
    expect(combined).toContain("line_messaging_api_send=not_performed");
    expect(combined).toContain("LINE real receive event smoke has not been performed");
    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("Loop 146: LINE real receive event smoke");
  });

  it("does not record obvious secret assignments, concrete webhook URLs, or production go state", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
      new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
      new RegExp(envAssignment("OPENAI_API_KEY")),
      new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
      new RegExp(envAssignment("SUPABASE_DB_URL")),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("priv" + "key\\.pem"),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("production" + "_go")
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
