import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loop134Task: "docs/11_codex_tasks/134_owner_approval_values_intake.md",
  intakeForm: "docs/15_runbooks/human_approval_intake_form.md",
  questions: "docs/15_runbooks/client_ops_confirmation_questions.md",
  ownerMatrix: "docs/15_runbooks/owner_approval_status_matrix.md",
  approvalSheet: "docs/15_runbooks/production_domain_approval_sheet.md",
  approvalRecord: "docs/15_runbooks/domain_and_release_approval_record.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  rollbackChecklist: "docs/15_runbooks/dns_nginx_rollback_owner_checklist.md",
  devLoop: "docs/08_dev_loop.md",
  readme: "README.md",
  devLog: "docs/14_dev_logs/2026-06-26.md"
};

describe("Loop 134 owner approval values intake docs", () => {
  it("adds the Loop 134 task doc, intake form, questions, and owner matrix", () => {
    for (const relativePath of [paths.loop134Task, paths.intakeForm, paths.questions, paths.ownerMatrix]) {
      expect(existsSync(resolve(relativePath)), relativePath).toBe(true);
    }
  });

  it("keeps the Loop 134 intake history and records the later Loop 136 final hostname decision", () => {
    const loop134Task = readText(resolve(paths.loop134Task));
    const combined = readCombined([paths.intakeForm, paths.ownerMatrix, paths.approvalSheet, paths.readiness]);

    expect(loop134Task).toContain("client_facing_final_hostname=undecided");
    expect(combined).toContain("review_admin_hostname=admin.taiyolabel.site");
    expect(combined).toContain("approved_review_admin_host=admin.taiyolabel.site");
    expect(combined).toContain("admin.taiyolabel.site");
    expect(combined).toContain("client_facing_final_hostname=admin.taiyolabel.site");
    expect(combined).toContain("Client-facing final hostname: admin.taiyolabel.site");
    expect(combined).toContain("separate_final_hostname=no");
  });

  it("keeps the original intake unknowns while recording Loop 136 approved owner values", () => {
    const combined = readCombined([paths.loop134Task, paths.intakeForm, paths.ownerMatrix, paths.approvalRecord, paths.approvalSheet]);

    for (const expected of [
      "Domain owner",
      "DNS change owner",
      "DNS rollback owner",
      "Nginx enable approver",
      "Certificate approver",
      "ACME method approver",
      "LINE webhook approver",
      "External smoke approver",
      "Maintenance window",
      "Final Go / No-Go owner",
      "Supabase staging approver",
      "Production secret injection approver"
    ]) {
      expect(combined).toContain(expected);
    }

    expect(readText(resolve(paths.loop134Task))).toContain("values remain `unknown / pending`");
    expect(combined).toContain("Domain owner | Project owner / requestor | recorded");
    expect(combined).toContain("DNS change owner | Project owner / requestor | recorded");
    expect(combined).toContain("DNS rollback owner | Project owner / requestor | recorded");
    expect(combined).toContain("Nginx enable approver | Project owner / requestor | recorded");
    expect(combined).toContain("Certificate approver | Project owner / requestor | recorded");
    expect(combined).toContain("ACME method approver | Project owner / requestor | recorded");
    expect(combined).toContain("LINE webhook approver | Project owner / requestor | recorded");
    expect(combined).toContain("Supabase staging approver | Project owner / requestor | recorded");
    expect(combined).toContain("Production secret injection approver | Project owner / requestor | recorded");
    expect(combined).toContain("owner_approval_status=approved_values_recorded");
  });

  it("defines minimal Go conditions for Loop 135 through Loop 138", () => {
    const combined = readCombined([paths.loop134Task, paths.ownerMatrix, paths.readiness]);

    for (const expected of [
      "Loop 135: client-facing approval request package",
      "Client / operations team gets a readable request package",
      "`admin.taiyolabel.site` is explained as a review/admin hostname",
      "No public or external action is performed",
      "Loop 136: ACME method decision after client approval",
      "ACME method approver is known",
      "Certificate approver is known",
      "DNS owner is known",
      "DNS rollback owner is known",
      "Loop 137: real-domain Nginx enable controlled smoke",
      "Nginx enable approver is known",
      "Maintenance window is known",
      "External smoke approver is known",
      "`admin.taiyolabel.site` use is explicitly approved",
      "Loop 138: LINE webhook dry-run with approved HTTPS URL",
      "LINE official account admin is known",
      "HTTPS URL is confirmed",
      "Real push remains disabled during dry-run",
      "Loop 139: Supabase staging secret injection checklist",
      "Service role key non-display policy is approved",
      "Rollback to `in_memory` is approved"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps production readiness No-Go and public/external actions blocked", () => {
    const combined = readCombined([
      paths.loop134Task,
      paths.intakeForm,
      paths.questions,
      paths.ownerMatrix,
      paths.approvalRecord,
      paths.readiness,
      paths.rollbackChecklist,
      paths.devLoop,
      paths.devLog
    ]);

    for (const expected of [
      "production_readiness=production_no_go",
      "production_no_go",
      "DNS変更禁止",
      "certbot禁止",
      "Nginx reload/restart禁止",
      "external HTTP/HTTPS smoke禁止",
      "LINE/OpenAI/Supabase実接続禁止",
      "Supabase staging実接続禁止",
      "`.env` 作成・変更・表示禁止",
      "DNS changes",
      "certbot/HTTPS",
      "Nginx reload/restart",
      "external smoke",
      "LINE/OpenAI/Supabase real connections"
    ]) {
      expect(combined).toContain(expected);
    }

    expect(combined).not.toContain("production_go");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("links the intake work from README, dev loop, and dev log", () => {
    for (const relativePath of [paths.readme, paths.devLoop, paths.devLog]) {
      const text = readText(resolve(relativePath));

      expect(text).toContain("Loop 134");
      expect(text).toContain("owner approval");
      expect(text).toContain("production_no_go");
    }

    expect(readText(resolve(paths.readme))).toContain("human_approval_intake_form.md");
    expect(readText(resolve(paths.devLog))).toContain("client_ops_confirmation_questions=created");
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

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readText(resolve(relativePath))).join("\n");
}
