import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/119_domain_owner_and_rollback_owner_approval_record.md"
);
const approvalRecordPath = join(repoRoot, "docs/15_runbooks/domain_and_release_approval_record.md");
const rollbackChecklistPath = join(repoRoot, "docs/15_runbooks/dns_nginx_rollback_owner_checklist.md");
const approvalSheetPath = join(repoRoot, "docs/15_runbooks/production_domain_approval_sheet.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");

describe("Loop 119 domain and release approval record", () => {
  it("adds the Loop 119 task doc and approval runbooks", () => {
    for (const filePath of [taskDocPath, approvalRecordPath, rollbackChecklistPath]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });

  it("records the approved review hostname without treating it as the client final hostname", () => {
    const combined = [readText(taskDocPath), readText(approvalRecordPath), readText(approvalSheetPath)].join("\n");

    expect(combined).toContain("admin.taiyolabel.site");
    expect(combined).toContain("taiyolabel.site");
    expect(combined).toContain("160.251.174.201");
    expect(combined).toContain("Host purpose: review/admin hostname");
    expect(combined).toContain("Client-facing final hostname: undecided");
  });

  it("keeps required human owners and approvers unknown or pending", () => {
    const combined = [readText(taskDocPath), readText(approvalRecordPath), readText(rollbackChecklistPath), readText(approvalSheetPath)].join(
      "\n"
    );

    expect(combined).toContain("Domain owner | unknown | pending");
    expect(combined).toContain("DNS change owner | unknown | pending");
    expect(combined).toContain("DNS rollback owner | unknown | pending");
    expect(combined).toContain("Nginx enable approver | unknown | pending");
    expect(combined).toContain("Certificate approver | unknown | pending");
    expect(combined).toContain("LINE webhook approver | unknown | pending");
    expect(combined).toContain("External smoke approver | unknown | pending");
    expect(combined).toContain("Maintenance window approver | unknown | pending");
    expect(combined).toContain("Final Go / No-Go owner | unknown | pending");
  });

  it("keeps production No-Go and forbidden operations explicit", () => {
    const combined = [readText(taskDocPath), readText(approvalRecordPath), readText(rollbackChecklistPath), readText(readinessPath)].join(
      "\n"
    );

    expect(combined).toContain("production_no_go");
    expect(combined).toContain("rollback triggers");
    expect(combined).toContain("DNS変更禁止");
    expect(combined).toContain("Nginx reload/restart禁止");
    expect(combined).toContain("certbot禁止");
    expect(combined).toContain("LINE/OpenAI/Supabase実接続禁止");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("does not introduce obvious secrets or private keys", () => {
    const combined = [readText(taskDocPath), readText(approvalRecordPath), readText(rollbackChecklistPath), readText(approvalSheetPath)].join(
      "\n"
    );
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
