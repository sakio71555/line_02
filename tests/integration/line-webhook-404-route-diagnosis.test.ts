import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/144_line_webhook_404_route_diagnosis.md",
  routeRunbook: "docs/15_runbooks/line_webhook_404_route_diagnosis.md",
  envRunbook: "docs/15_runbooks/line_runtime_environmentfile_failure_diagnosis.md",
  runtimeRunbook: "docs/15_runbooks/line_runtime_secret_injection_and_webhook_verification.md",
  manualGate: "docs/15_runbooks/line_webhook_registration_manual_gate.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 144 LINE webhook 404 route diagnosis docs", () => {
  it("adds the route diagnosis task doc and runbooks", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.routeRunbook))).toBe(true);
    expect(existsSync(resolve(paths.envRunbook))).toBe(true);
  });

  it("records the active webhook env name and expected route behavior", () => {
    const combined = readCombined([paths.taskDoc, paths.routeRunbook, paths.devLoop]);

    expect(combined).toContain("route_path=/api/line/webhook/:webhookSecret");
    expect(combined).toContain("method=POST");
    expect(combined).toContain("active_env_name=LINE_WEBHOOK_SECRET_PATH");
    expect(combined).toContain("inactive_env_name=LINE_WEBHOOK_SECRET");
    expect(combined).toContain("invalid_signature_status=401");
    expect(combined).toContain("unknown_webhook_path_status=404");
  });

  it("records that the API process has LINE env keys without recording values", () => {
    const combined = readCombined([paths.taskDoc, paths.routeRunbook, paths.envRunbook, paths.devLog]);

    for (const expected of [
      "process_env_line_keys=present",
      "LINE_CHANNEL_SECRET configured; value not recorded",
      "LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded",
      "LINE_WEBHOOK_SECRET_PATH configured; value not recorded",
      "LINE_REAL_PUSH_ENABLED=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the route matrix and diagnosis classification", () => {
    const combined = readCombined([
      paths.taskDoc,
      paths.routeRunbook,
      paths.runtimeRunbook,
      paths.manualGate,
      paths.readiness,
      paths.devLog
    ]);

    for (const expected of [
      "direct_api_prefixed_invalid_signature=404",
      "direct_non_api_prefixed_invalid_signature=404",
      "https_api_prefixed_invalid_signature=404",
      "direct_api_prefixed_404_body=text/plain_404_not_found",
      "process_webhook_path_single_segment_safe=false",
      "process_webhook_path_contains_slash=true",
      "classification=B_API_route_path_mismatch",
      "root_cause=LINE_WEBHOOK_SECRET_PATH_contains_slash_and_does_not_match_single_segment_route"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps verification and real delivery blocked", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("line_developers_verification_result=not_performed");
    expect(combined).toContain("line_real_push_reply=not_performed");
    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("Loop 145A: LINE webhook secret path single-segment remediation");
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
