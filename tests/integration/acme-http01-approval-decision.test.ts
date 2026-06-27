import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loop136Task: "docs/11_codex_tasks/136_acme_http01_method_decision_after_approval.md",
  acmeRunbook: "docs/15_runbooks/acme_selected_method_dry_run_plan.md",
  ownerMatrix: "docs/15_runbooks/owner_approval_status_matrix.md",
  approvalSheet: "docs/15_runbooks/production_domain_approval_sheet.md",
  clientPackage: "docs/15_runbooks/client_facing_approval_request_package.md",
  lineRunbook: "docs/15_runbooks/line_webhook_production_url_dry_run_checklist.md",
  supabaseRunbook: "docs/15_runbooks/supabase_staging_connection_preflight_plan.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-26.md"
};

describe("Loop 136 HTTP-01 approval decision docs", () => {
  it("adds the Loop 136 task doc", () => {
    expect(existsSync(resolve(paths.loop136Task))).toBe(true);
  });

  it("records HTTP-01 as the selected ACME method with DNS-01 fallback", () => {
    const combined = readCombined([paths.loop136Task, paths.acmeRunbook, paths.approvalSheet, paths.readiness]);

    expect(combined).toContain("acme_method=HTTP-01");
    expect(combined).toContain("selected_method=HTTP-01");
    expect(combined).toContain("fallback_method=DNS-01 if HTTP-01 fails");
    expect(combined).toContain("Fallback ACME method: DNS-01 if HTTP-01 fails");
    expect(combined).toContain("certificate_target=admin.taiyolabel.site");
    expect(combined).toContain("Certificate target hostname=admin.taiyolabel.site");
    expect(combined).toContain("wildcard_certificate=not_required");
    expect(combined).toContain("Wildcard certificate=not required");
  });

  it("records the approved hostname and owner values", () => {
    const combined = readCombined([
      paths.loop136Task,
      paths.ownerMatrix,
      paths.approvalSheet,
      paths.clientPackage,
      paths.lineRunbook,
      paths.supabaseRunbook
    ]);

    for (const expected of [
      "review_admin_hostname=admin.taiyolabel.site",
      "client_facing_final_hostname=admin.taiyolabel.site",
      "separate_final_hostname=no",
      "dns_owner=Project owner / requestor",
      "dns_change_owner=Project owner / requestor",
      "dns_rollback_owner=Project owner / requestor",
      "nginx_enable_approver=Project owner / requestor",
      "certificate_approver=Project owner / requestor",
      "acme_method_approver=Project owner / requestor",
      "line_webhook_approver=Project owner / requestor",
      "external_smoke_approver=Project owner / requestor",
      "maintenance_window=now / approved by Project owner",
      "final_go_no_go_owner=Project owner / requestor",
      "supabase_staging_approver=Project owner / requestor",
      "production_secret_injection_approver=Project owner / requestor"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps production No-Go and records that execution did not happen", () => {
    const combined = readCombined([
      paths.loop136Task,
      paths.acmeRunbook,
      paths.ownerMatrix,
      paths.approvalSheet,
      paths.clientPackage,
      paths.lineRunbook,
      paths.supabaseRunbook,
      paths.readiness,
      paths.readme,
      paths.devLoop,
      paths.devLog
    ]);

    for (const expected of [
      "production_readiness=production_no_go",
      "production_no_go",
      "certbot has not executed",
      "HTTPS is not enabled",
      "External smoke has not executed",
      "LINE webhook is not registered",
      "Supabase real connection has not executed",
      "Production secret injection has not executed",
      "OpenAI real API has not executed",
      "Nginx reload/restartなし",
      "DNS変更なし"
    ]) {
      expect(combined).toContain(expected);
    }

    expect(combined).not.toContain("production_go");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("does not record obvious secrets, database URLs, bearer tokens, or private keys", () => {
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
      new RegExp("privkey" + "\\.pem")
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
