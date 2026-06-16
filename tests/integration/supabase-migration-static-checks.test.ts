import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const migrationPath = join(repoRoot, "packages/db/migrations/0001_initial_schema.sql");
const supabaseMigrationsPath = join(repoRoot, "supabase/migrations");
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const stagingRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);
const stagingEnvRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_env_readiness_checklist.md"
);
const dryRunRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_migration_dry_run.md"
);
const taskDocPath = join(repoRoot, "docs/11_codex_tasks/070_staging_migration_dry_run_record.md");

const migrationSql = readFileSync(migrationPath, "utf8");

const expectedTables = [
  "tenants",
  "tenant_line_settings",
  "tenant_ai_settings",
  "staff_users",
  "staff_tenant_memberships",
  "customers",
  "consultations",
  "messages",
  "alerts",
  "knowledge_pages",
  "construction_cases",
  "reservations"
] as const;

const tenantScopedTables = expectedTables.filter((table) => table !== "tenants");

describe("Loop 070 Supabase migration static dry-run checks", () => {
  it("keeps the migration source in the packages/db migration folder", () => {
    expect(existsSync(migrationPath)).toBe(true);
    expect(existsSync(supabaseMigrationsPath)).toBe(false);
    expect(migrationSql).toContain("Loop 001: initial schema");
  });

  it("keeps the expected schema inventory and does not add a standalone tenant_settings table", () => {
    for (const table of expectedTables) {
      expect(migrationSql).toMatch(new RegExp(`create table if not exists ${table} \\(`, "i"));
    }

    expect(migrationSql).not.toMatch(/create table if not exists tenant_settings\b/i);
  });

  it("keeps tenant-owned tables scoped to tenants(id)", () => {
    expect(tableDefinition("tenants")).not.toMatch(/\btenant_id\b/i);

    for (const table of tenantScopedTables) {
      const definition = tableDefinition(table);

      expect(definition).toMatch(/\btenant_id\b/i);
      expect(definition).toMatch(/references tenants\(id\)/i);
    }
  });

  it("keeps customer schema aligned with repository and domain expectations", () => {
    const definition = tableDefinition("customers");

    expect(definition).toMatch(/\bid text primary key\b/i);
    expect(definition).toMatch(
      /\btenant_id text not null references tenants\(id\) on delete cascade\b/i
    );
    expect(definition).toMatch(/\bline_user_id text\b/i);
    expect(definition).toMatch(/\bdisplay_name text\b/i);
    expect(definition).toMatch(/\binterest_tags text\[\] not null default '\{\}'/i);
    expect(definition).toMatch(/\blast_message_at timestamptz\b/i);
    expect(definition).toMatch(/\blast_customer_message_at timestamptz\b/i);
    expect(definition).toMatch(/\blast_staff_reply_at timestamptz\b/i);
    expect(definition).toMatch(/\bcreated_at timestamptz not null default now\(\)/i);
    expect(definition).toMatch(/\bupdated_at timestamptz not null default now\(\)/i);
    expect(migrationSql).toMatch(
      /create unique index if not exists customers_tenant_line_user_id_unique\s+on customers \(tenant_id, line_user_id\)\s+where line_user_id is not null;/i
    );
    expect(migrationSql).toMatch(
      /create index if not exists customers_tenant_response_mode_idx on customers \(tenant_id, response_mode\);/i
    );
  });

  it("keeps message schema aligned with repository and timeline expectations", () => {
    const definition = tableDefinition("messages");

    expect(definition).toMatch(/\bid text primary key\b/i);
    expect(definition).toMatch(
      /\btenant_id text not null references tenants\(id\) on delete cascade\b/i
    );
    expect(definition).toMatch(
      /\bcustomer_id text not null references customers\(id\) on delete cascade\b/i
    );
    expect(definition).toMatch(/\bline_message_id text\b/i);
    expect(definition).toMatch(
      /\brole text not null check \(role in \('customer', 'bot', 'staff', 'system', 'ai'\)\)/i
    );
    expect(definition).toMatch(/\bmessage_type text not null default 'text' check/i);
    expect(definition).toMatch(/\bcreated_at timestamptz not null default now\(\)/i);
    expect(migrationSql).toMatch(
      /create unique index if not exists messages_tenant_line_message_id_unique\s+on messages \(tenant_id, line_message_id\)\s+where line_message_id is not null;/i
    );
    expect(migrationSql).toMatch(
      /create index if not exists messages_tenant_customer_created_at_idx\s+on messages \(tenant_id, customer_id, created_at desc\);/i
    );
  });

  it("keeps alert and knowledge tables ready for tenant-scoped staging checks", () => {
    const alertDefinition = tableDefinition("alerts");
    const knowledgeDefinition = tableDefinition("knowledge_pages");

    expect(alertDefinition).toMatch(/\balert_type text not null check/i);
    expect(alertDefinition).toMatch(/\bunreplied_customer_message\b/i);
    expect(alertDefinition).toMatch(/\bstatus text not null default 'open' check/i);
    expect(alertDefinition).toMatch(/\bseverity text not null default 'medium' check/i);
    expect(migrationSql).toMatch(
      /create index if not exists alerts_tenant_status_severity_idx\s+on alerts \(tenant_id, status, severity\);/i
    );

    expect(knowledgeDefinition).toMatch(/\ballowed_for_ai boolean not null default false\b/i);
    expect(knowledgeDefinition).toMatch(/\blast_crawled_at timestamptz\b/i);
    expect(migrationSql).toMatch(/knowledge_pages_tenant_id_idx/i);
    expect(migrationSql).toMatch(/knowledge_pages_tenant_allowed_for_ai_idx/i);
  });

  it("keeps staff auth readiness schema without requiring Auth runtime wiring", () => {
    const staffDefinition = tableDefinition("staff_users");
    const membershipDefinition = tableDefinition("staff_tenant_memberships");

    expect(staffDefinition).toMatch(/\bauth_user_id text\b/i);
    expect(staffDefinition).toMatch(/\bstatus text not null default 'active' check/i);
    expect(staffDefinition).toMatch(/\bdisabled_at timestamptz\b/i);
    expect(staffDefinition).toMatch(/\barchived_at timestamptz\b/i);
    expect(staffDefinition).toMatch(/unique \(tenant_id, email\)/i);
    expect(migrationSql).toMatch(/staff_users_auth_user_id_unique/i);

    expect(membershipDefinition).toMatch(
      /\bstaff_user_id text not null references staff_users\(id\)/i
    );
    expect(membershipDefinition).toMatch(/\brole text not null default 'staff' check/i);
    expect(membershipDefinition).toMatch(/\bstatus text not null default 'active' check/i);
    expect(membershipDefinition).toMatch(/unique \(tenant_id, staff_user_id\)/i);
    expect(migrationSql).toMatch(/staff_tenant_memberships_tenant_status_idx/i);
  });

  it("keeps RLS SQL out of the migration until a dedicated RLS implementation loop", () => {
    expect(migrationSql).toMatch(/RLS policy definitions are intentionally deferred/i);
    expect(migrationSql).not.toMatch(
      /alter table\s+[\w.]+\s+enable row level security|alter table\s+[\w.]+\s+force row level security|create policy/i
    );
  });

  it("records the dry-run in docs and keeps staging apply gated", () => {
    const readme = readFileSync(readmePath, "utf8");
    const devLoop = readFileSync(devLoopPath, "utf8");
    const stagingRunbook = readFileSync(stagingRunbookPath, "utf8");
    const stagingEnvRunbook = readFileSync(stagingEnvRunbookPath, "utf8");
    const dryRunRunbook = readFileSync(dryRunRunbookPath, "utf8");
    const taskDoc = readFileSync(taskDocPath, "utf8");

    expect(readme).toContain("070_staging_migration_dry_run_record.md");
    expect(readme).toContain("supabase_staging_migration_dry_run.md");
    expect(devLoop).toContain("staging migration dry-run");
    expect(stagingRunbook).toContain("supabase_staging_migration_dry_run.md");
    expect(stagingEnvRunbook).toContain("Loop 070 dry-run");
    expect(dryRunRunbook).toContain("Confirmation target commit");
    expect(dryRunRunbook).toContain("RLS SQL");
    expect(dryRunRunbook).toContain("Not implemented");
    expect(taskDoc).toContain("Loop 070: Staging Migration Dry-run Record");
    expect(taskDoc).toContain("git push");
    expect(taskDoc).toContain("行わない");
  });
});

function tableDefinition(tableName: string): string {
  const match = migrationSql.match(
    new RegExp(`create table if not exists ${tableName} \\(([\\s\\S]*?)\\n\\);`, "i")
  );

  if (!match?.[1]) {
    throw new Error(`Missing table definition for ${tableName}`);
  }

  return match[1];
}
