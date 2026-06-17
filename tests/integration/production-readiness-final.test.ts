import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/103_production_readiness_final_gate.md"
);
const loop104TaskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/104_production_auth_runtime_auto_wiring.md"
);
const finalRunbookPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const openAiRunbookPath = join(repoRoot, "docs/15_runbooks/openai_real_api_gate.md");
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-18.md");

describe("Loop 103 production readiness final gate docs", () => {
  it("adds the production readiness final task and runbooks", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(loop104TaskDocPath)).toBe(true);
    expect(existsSync(finalRunbookPath)).toBe(true);
    expect(existsSync(openAiRunbookPath)).toBe(true);
  });

  it("records the final judgment as production_no_go when blockers remain", () => {
    const runbook = readText(finalRunbookPath);

    expect(runbook).toContain("## Final Judgment");
    expect(runbook).toContain("production_no_go");
    expect(runbook).not.toContain("ready_for_controlled_production_enablement");
    expect(runbook).not.toContain("production runtimeのSupabase Auth client / StaffAuthLookup自動構成が未完了");
    expect(runbook).toContain("Admin UIの実login/session/token取得が未完了");
    expect(runbook).toContain("OpenAI real API gate");
    expect(runbook).toContain("LINE Real Push Gate");
  });

  it("documents the OpenAI real API gate and fake transport boundary", () => {
    const combined = `${readText(taskDocPath)}\n${readText(openAiRunbookPath)}`;

    expect(combined).toContain("AI_PROVIDER=openai");
    expect(combined).toContain("OPENAI_API_KEY");
    expect(combined).toContain("OPENAI_MODEL");
    expect(combined).toContain("tenant_ai_settings");
    expect(combined).toContain("RAG source");
    expect(combined).toContain("draft-only");
    expect(combined).toContain("auto-send");
    expect(combined).toContain("fake transport");
  });

  it("documents production runtime auth config audit and LINE final audit", () => {
    const combined = `${readText(taskDocPath)}\n${readText(finalRunbookPath)}`;

    expect(combined).toContain("AUTH_SESSION_VERIFIER=supabase");
    expect(combined).toContain("SupabaseAuthSessionVerifier");
    expect(combined).toContain("StaffAuthLookup");
    expect(combined).toContain("fake verifier");
    expect(combined).toContain("LINE_MESSAGING_ENABLED=true");
    expect(combined).toContain("LINE_REAL_PUSH_ENABLED=true");
    expect(combined).toContain("idempotency");
  });

  it("links Loop 103 from existing docs and dev log", () => {
    for (const text of [
      readText(readmePath),
      readText(databaseDocPath),
      readText(devLoopPath),
      readText(devLogPath)
    ]) {
      expect(text).toContain("Loop 103");
      expect(text).toContain("Loop 104");
    }

    expect(readText(readmePath)).toContain(
      "docs/15_runbooks/production_readiness_final.md"
    );
  });

  it("does not record obvious secret values or real connection strings", () => {
    const combined = [
      readText(taskDocPath),
      readText(loop104TaskDocPath),
      readText(finalRunbookPath),
      readText(openAiRunbookPath),
      readText(devLogPath)
    ].join("\n");

    expect(combined).not.toMatch(/sk-[A-Za-z0-9_-]{10,}/u);
    expect(combined).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/u);
    expect(combined).not.toMatch(/postgres(?:ql)?:\/\//iu);
    expect(combined).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/iu);
    expect(combined).not.toContain(envAssignment("SUPABASE_SERVICE_ROLE_KEY"));
    expect(combined).not.toContain(envAssignment("SUPABASE_DB_URL"));
    expect(combined).not.toContain(envAssignment("OPENAI_API_KEY"));
    expect(combined).not.toContain(envAssignment("LINE_CHANNEL_ACCESS_TOKEN"));
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function envAssignment(name: string): string {
  return `${name}=`;
}
