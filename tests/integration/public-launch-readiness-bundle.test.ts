import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loop129Task: "docs/11_codex_tasks/129_acme_selected_method_dry_run_plan.md",
  loop129Runbook: "docs/15_runbooks/acme_selected_method_dry_run_plan.md",
  loop130Task: "docs/11_codex_tasks/130_real_domain_nginx_enable_approval_gate.md",
  loop130Runbook: "docs/15_runbooks/real_domain_nginx_enable_approval_gate.md",
  loop131Task: "docs/11_codex_tasks/131_line_webhook_production_url_dry_run_checklist.md",
  loop131Runbook: "docs/15_runbooks/line_webhook_production_url_dry_run_checklist.md",
  loop132Task: "docs/11_codex_tasks/132_owner_approval_record_update.md",
  ownerMatrix: "docs/15_runbooks/owner_approval_status_matrix.md",
  loop133Task: "docs/11_codex_tasks/133_supabase_staging_connection_preflight_plan.md",
  loop133Runbook: "docs/15_runbooks/supabase_staging_connection_preflight_plan.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  devLog: "docs/14_dev_logs/2026-06-26.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  approvalRecord: "docs/15_runbooks/domain_and_release_approval_record.md",
  approvalSheet: "docs/15_runbooks/production_domain_approval_sheet.md",
  rollbackChecklist: "docs/15_runbooks/dns_nginx_rollback_owner_checklist.md"
};

describe("Loop 129-133 public launch readiness bundle docs", () => {
  it("adds task docs and runbooks for all public launch readiness sub-loops", () => {
    for (const relativePath of [
      paths.loop129Task,
      paths.loop129Runbook,
      paths.loop130Task,
      paths.loop130Runbook,
      paths.loop131Task,
      paths.loop131Runbook,
      paths.loop132Task,
      paths.ownerMatrix,
      paths.loop133Task,
      paths.loop133Runbook
    ]) {
      expect(existsSync(resolve(relativePath)), relativePath).toBe(true);
    }
  });

  it("keeps ACME method undecided and both challenge methods in No-Go planning state", () => {
    const combined = readCombined([paths.loop129Task, paths.loop129Runbook, paths.readiness, paths.devLog]);

    expect(combined).toContain("acme_method=undecided");
    expect(combined).toContain("recommended_method=undecided");
    expect(combined).toContain("http_01_status=no_go");
    expect(combined).toContain("dns_01_status=no_go");
    expect(combined).toContain("DNS owner unknown");
    expect(combined).toContain("DNS rollback owner unknown");
    expect(combined).toContain("Nginx enable approver unknown");
    expect(combined).toContain("Certificate approver unknown");
    expect(combined).toContain("Maintenance window unknown");
  });

  it("keeps real-domain Nginx enablement gated and No-Go", () => {
    const combined = readCombined([paths.loop130Task, paths.loop130Runbook, paths.approvalRecord, paths.readiness]);

    expect(combined).toContain("server_name admin.taiyolabel.site;");
    expect(combined).toContain("real_domain_enable_status=no_go");
    expect(combined).toContain("invalid_host_candidate_smoke=success");
    expect(combined).toContain("client_facing_final_hostname=undecided");
    expect(combined).toContain("client-facing final hostname is undecided");
    expect(combined).toContain("Permanent `sites-enabled` enablement");
    expect(combined).toContain("Nginx reload for real-domain");
  });

  it("documents LINE webhook candidate URL as dry-run only", () => {
    const combined = readCombined([paths.loop131Task, paths.loop131Runbook, paths.readiness, paths.devLog]);

    expect(combined).toContain("method=POST");
    expect(combined).toContain("route=/api/line/webhook/:webhookSecret");
    expect(combined).toContain("signature_verification=verifyLineSignature");
    expect(combined).toContain("signature_body=raw request body");
    expect(combined).toContain(
      "candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>"
    );
    expect(combined).toContain("candidate_url_status=not_approved_for_registration");
    expect(combined).toContain("line_webhook_production_url_status=no_go");
    expect(combined).toContain("LINE Developers Console changes");
    expect(combined).toContain("Webhook URL registration");
    expect(combined).toContain("line_api_call=not_done");
  });

  it("updates owner approval records while keeping unknown/pending values", () => {
    const combined = readCombined([
      paths.loop132Task,
      paths.ownerMatrix,
      paths.approvalRecord,
      paths.approvalSheet,
      paths.rollbackChecklist
    ]);

    for (const owner of [
      "Domain owner",
      "DNS change owner",
      "DNS rollback owner",
      "Nginx enable approver",
      "Certificate approver",
      "ACME method approver",
      "LINE webhook approver",
      "External smoke approver",
      "Maintenance window approver",
      "Final Go / No-Go owner",
      "Supabase staging approver",
      "Production secret injection approver"
    ]) {
      expect(combined).toContain(owner);
    }

    expect(combined).toContain("owner_approval_status=pending");
    expect(combined).toContain("host_purpose=review/admin hostname");
    expect(combined).toContain("client_facing_final_hostname=undecided");
    expect(combined).toContain("unknown | pending");
  });

  it("keeps Supabase staging connection as a preflight plan without real connection", () => {
    const combined = readCombined([paths.loop133Task, paths.loop133Runbook, paths.readiness, paths.devLog]);

    expect(combined).toContain("supabase_runtime=disconnected");
    expect(combined).toContain("repository=in_memory");
    expect(combined).toContain("supabase_real_connection=not_allowed");
    expect(combined).toContain("service_role_key_injected=no");
    expect(combined).toContain("db_url_injected=no");
    expect(combined).toContain("SUPABASE_URL");
    expect(combined).toContain("SUPABASE_ANON_KEY");
    expect(combined).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(combined).toContain("SUPABASE_DB_URL");
    expect(combined).toContain("supabase_staging_status=no_go");
    expect(combined).toContain("Supabase connection");
    expect(combined).toContain("psql connection");
    expect(combined).toContain("migration apply");
  });

  it("keeps forbidden operations and production readiness No-Go across the bundle", () => {
    const combined = readCombined([
      paths.loop129Runbook,
      paths.loop130Runbook,
      paths.loop131Runbook,
      paths.ownerMatrix,
      paths.loop133Runbook,
      paths.readiness,
      paths.readme,
      paths.devLoop,
      paths.devLog
    ]);

    for (const expected of [
      "DNS changes",
      "DNS provider API calls",
      "certbot",
      "HTTPS",
      "Nginx reload/restart",
      "external smoke",
      "LINE webhook registration",
      "LINE/OpenAI/Supabase real connections",
      "`.env` display or mutation",
      "production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }

    expect(combined).not.toContain("production_go");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("does not record obvious secret values, database URLs, or private keys", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp("LINE_CHANNEL_ACCESS" + "_TOKEN=.+"),
      new RegExp("LINE_CHANNEL" + "_SECRET=.+"),
      new RegExp("OPENAI" + "_API_KEY=.+"),
      new RegExp("SUPABASE_SERVICE" + "_ROLE_KEY=.+"),
      new RegExp("SUPABASE" + "_DB_URL=.+"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("privkey" + "\\.pem"),
      new RegExp("dns_[A-Za-z0-9_-]*_api_token[\\s]*=[\\s]*[^_*]", "i")
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
