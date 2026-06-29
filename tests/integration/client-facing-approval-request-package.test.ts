import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loop135Task: "docs/11_codex_tasks/135_client_facing_approval_request_package.md",
  packageDoc: "docs/15_runbooks/client_facing_approval_request_package.md",
  ownerMatrix: "docs/15_runbooks/owner_approval_status_matrix.md",
  approvalRecord: "docs/15_runbooks/domain_and_release_approval_record.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-26.md"
};

describe("Loop 135 client-facing approval request package docs", () => {
  it("adds the Loop 135 task doc and client-facing package", () => {
    expect(existsSync(resolve(paths.loop135Task))).toBe(true);
    expect(existsSync(resolve(paths.packageDoc))).toBe(true);
  });

  it("keeps the Loop 135 request history and records the later Loop 136 final hostname decision", () => {
    const combined = readCombined([paths.loop135Task, paths.packageDoc, paths.ownerMatrix, paths.readiness]);

    expect(combined).toContain("review_admin_hostname=admin.taiyolabel.site");
    expect(combined).toContain("review_admin_hostname_purpose=internal review and admin operation confirmation");
    expect(combined).toContain("What To Review On `admin.taiyolabel.site`");
    expect(combined).toContain("client_facing_final_hostname=undecided");
    expect(combined).toContain("client_facing_final_hostname=admin.taiyolabel.site");
    expect(combined).toContain("separate_final_hostname=no");
    expect(combined).toContain("It is still not an approved production launch URL until later gates pass");
  });

  it("summarizes required approvals for DNS, HTTPS, Nginx, LINE, and Supabase", () => {
    const packageDoc = readText(resolve(paths.packageDoc));

    for (const expected of [
      "### 1. Domain / DNS",
      "Who owns the domain / DNS account?",
      "Who can rollback DNS changes if something goes wrong?",
      "### 2. HTTPS / Certificate",
      "Should ACME use HTTP-01 or DNS-01?",
      "### 3. Nginx / Public Enable",
      "Who approves real-domain Nginx enablement?",
      "### 4. LINE",
      "Who approves webhook URL registration?",
      "### 5. Supabase",
      "Who approves staging connection tests?"
    ]) {
      expect(packageDoc).toContain(expected);
    }
  });

  it("provides a reply form that keeps real push and public launch gated", () => {
    const packageDoc = readText(resolve(paths.packageDoc));

    for (const expected of [
      "## Reply Form",
      "Is admin.taiyolabel.site acceptable as a temporary review/admin URL?",
      "Final hostname:",
      "DNS change approver:",
      "ACME method:",
      "Nginx enable approver:",
      "LINE webhook approver:",
      "First dry-run keeps real push disabled:",
      "Supabase staging project owner:",
      "Final Go / No-Go owner:",
      "[ ] No-Go for now"
    ]) {
      expect(packageDoc).toContain(expected);
    }
  });

  it("keeps production readiness No-Go and blocks public/external actions", () => {
    const combined = readCombined([
      paths.loop135Task,
      paths.packageDoc,
      paths.approvalRecord,
      paths.readiness,
      paths.readme,
      paths.devLoop,
      paths.devLog
    ]);

    for (const expected of [
      "production_readiness=production_no_go",
      "production_no_go",
      "No DNS change will be made until these are approved",
      "No certbot command",
      "No active Nginx config change",
      "No LINE Developers setting change",
      "No Supabase connection",
      "DNS changes",
      "certbot/HTTPS",
      "Nginx reload/restart",
      "external smoke",
      "LINE/OpenAI/Supabase real connections"
    ]) {
      expect(combined).toContain(expected);
    }

    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("links the package from existing docs and dev log", () => {
    for (const relativePath of [paths.readme, paths.devLoop, paths.devLog, paths.approvalRecord, paths.readiness]) {
      const text = readText(resolve(relativePath));

      expect(text).toContain("Loop 135");
      expect(text).toContain("client-facing approval request package");
    }

    expect(readText(resolve(paths.readme))).toContain("client_facing_approval_request_package.md");
    expect(readText(resolve(paths.devLog))).toContain("client_facing_approval_request_package=created");
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
