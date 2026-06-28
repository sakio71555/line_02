import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const taskDocPath = "docs/11_codex_tasks/187_openai_usage_and_cost_monitoring_plan.md";
const runbookPath = "docs/15_runbooks/openai_usage_and_cost_monitoring_plan.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/08_dev_loop.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/production_monitoring_schedule.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md",
  "docs/15_runbooks/post_production_backlog_triage.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md"
];

function combinedDocs(): string {
  return updatedDocs.map(read).join("\n");
}

function envAssignment(name: string): RegExp {
  return new RegExp(`${name}=.+`, "u");
}

describe("Loop 187 OpenAI usage and cost monitoring plan", () => {
  it("adds the Loop 187 task doc and runbook with the required planning sections", () => {
    const taskDoc = read(taskDocPath);
    const runbook = read(runbookPath);
    const combined = `${taskDoc}\n${runbook}`;

    expect(taskDoc).toContain("# Loop 187: OpenAI Usage and Cost Monitoring Plan");
    expect(runbook).toContain("# OpenAI Usage and Cost Monitoring Plan");
    expect(combined).toContain("## Purpose");
    expect(combined).toContain("## Current State");
    expect(combined).toContain("AI_PROVIDER=openai");
    expect(combined).toContain("OpenAI systemd drop-in=present");
    expect(combined).toContain("OpenAI usage API not called");
    expect(combined).toContain("OpenAI cost API not called");
    expect(combined).toContain("## Monitoring Targets");
    expect(combined).toContain("Manual");
    expect(combined).toContain("## Threshold Proposal");
    expect(combined).toContain("cost_threshold_values=operator_defined");
    expect(combined).toContain("currency=operator_defined");
    expect(combined).toContain("Future API");
    expect(combined).toContain("explicit approval");
    expect(combined).toContain("Rollback");
    expect(combined).toContain("## Incident Workflow");
    expect(combined).toContain("production_readiness=production_go");
    expect(combined).toContain("runtime_changes_performed=false");
  });

  it("records the production monitoring dry-run connection and manual operator process", () => {
    const runbook = read(runbookPath);

    expect(runbook).toContain("Loop 186 dry-run currently checks");
    expect(runbook).toContain("It does not call the OpenAI API");
    expect(runbook).toContain("OpenAI usage API");
    expect(runbook).toContain("OpenAI cost API");
    expect(runbook).toContain("OpenAI dashboard manually");
    expect(runbook).toContain("Aggregate summaries only");
    expect(runbook).toContain("raw_payload_recorded=false");
    expect(runbook).toContain("api_key_recorded=false");
    expect(runbook).toContain("model_value_recorded=false");
  });

  it("updates the backlog, monitoring, handoff, README, dev loop, and dev log docs", () => {
    const combined = combinedDocs();

    expect(combined).toContain("Loop 187: OpenAI usage and cost monitoring plan");
    expect(combined).toContain("OpenAI usage / cost monitoring");
    expect(combined).toContain("implementation status=not implemented");
    expect(combined).toContain("API integration=separate future Loop");
    expect(combined).toContain("OpenAI usage API not called");
    expect(combined).toContain("OpenAI cost API not called");
    expect(combined).toContain("production readiness: Go");
    expect(combined).toContain("Loop 188: production backup automation plan");
  });

  it("does not include obvious OpenAI, LINE, Supabase, bearer, or private-key secret values", () => {
    const combined = combinedDocs();
    const dash = "-";
    const http = "http";
    const authorization = "Authorization";
    const bearer = "Bearer";
    const postgres = "postgres";
    const token = "TOKEN";
    const secret = "SECRET";
    const openAi = "OPENAI";
    const supabase = "SUPABASE";
    const line = "LINE";
    const webhook = "WEBHOOK";

    const forbidden = [
      envAssignment(`${openAi}_API_KEY`),
      envAssignment(`${openAi}_MODEL`),
      new RegExp(`s${"k"}${dash}[A-Za-z0-9]`, "u"),
      envAssignment(`${line}_CHANNEL_ACCESS_${token}`),
      envAssignment(`${line}_CHANNEL_${secret}`),
      envAssignment(`${line}_${webhook}_${secret}_PATH`),
      new RegExp(`/api/line/${webhook.toLowerCase()}/[A-Za-z0-9._~-]{8,}`, "u"),
      new RegExp(`userId["': ][A-Za-z0-9._-]+`, "u"),
      new RegExp(`reply${token}["': ][A-Za-z0-9._-]+`, "u"),
      new RegExp(`${authorization}: ${bearer} [A-Za-z0-9._-]+`, "u"),
      new RegExp(`${supabase}_URL=${http}s?://[^<\\s]+`, "u"),
      envAssignment(`${supabase}_ANON_KEY`),
      envAssignment(`${supabase}_SERVICE_ROLE_KEY`),
      envAssignment(`${supabase}_DB_URL`),
      new RegExp(`${postgres}(?:ql)?://`, "iu"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY", "u")
    ];

    for (const pattern of forbidden) {
      expect(combined).not.toMatch(pattern);
    }
  });
});
