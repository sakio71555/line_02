import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/118_approved_domain_read_only_dns_confirmation.md"
);
const inventoryPath = join(repoRoot, "docs/15_runbooks/approved_domain_dns_inventory.md");
const approvalSheetPath = join(repoRoot, "docs/15_runbooks/production_domain_approval_sheet.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");

describe("Loop 118 approved domain DNS inventory", () => {
  it("adds the task doc and DNS inventory runbook", () => {
    for (const filePath of [taskDocPath, inventoryPath]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });

  it("records approved host values and read-only DNS findings", () => {
    const combined = [readText(taskDocPath), readText(inventoryPath), readText(approvalSheetPath)].join("\n");

    expect(combined).toContain("admin.taiyolabel.site");
    expect(combined).toContain("taiyolabel.site");
    expect(combined).toContain("160.251.174.201");
    expect(combined).toContain("a_record_match=yes");
    expect(combined).toContain("cname_conflict=no");
    expect(combined).toContain("aaaa_present=no");
    expect(combined).toContain("txt_records_fetched=no");
    expect(combined).toContain("inferred_dns_provider=dnsv.jp / GMO DNS");
    expect(combined).toContain("DNS owner: unknown");
    expect(combined).toContain("DNS rollback owner: unknown");
    expect(combined).toContain("ACME method: undecided");
  });

  it("keeps production enablement and external integrations out of scope", () => {
    const combined = [readText(taskDocPath), readText(inventoryPath), readText(readinessPath)].join("\n");

    expect(combined).toContain("production_no_go");
    expect(combined).toContain("DNS change");
    expect(combined).toContain("Nginx reload/restart");
    expect(combined).toContain("Certbot");
    expect(combined).toContain("External HTTP/HTTPS smoke");
    expect(combined).toContain("LINE/OpenAI/Supabase real connection");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("does not introduce obvious secrets in the inventory docs", () => {
    const combined = [readText(taskDocPath), readText(inventoryPath), readText(approvalSheetPath)].join("\n");
    const forbiddenPatterns = [
      new RegExp("LINE_CHANNEL_ACCESS" + "_TOKEN=.+"),
      new RegExp("LINE_CHANNEL" + "_SECRET=.+"),
      new RegExp("OPENAI" + "_API_KEY=.+"),
      new RegExp("SUPABASE_SERVICE" + "_ROLE_KEY=.+"),
      new RegExp("SUPABASE" + "_DB_URL=.+"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY")
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
    expect(combined).not.toContain("Authorization:" + " Bearer ");
    expect(combined).not.toContain("postgresql" + "://");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
