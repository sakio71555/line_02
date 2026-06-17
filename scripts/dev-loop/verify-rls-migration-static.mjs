#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const targetTables = [
  "tenants",
  "tenant_line_settings",
  "tenant_ai_settings",
  "customers",
  "messages",
  "alerts",
  "knowledge_pages",
  "staff_users",
  "staff_tenant_memberships"
];

const tenantScopedTables = [
  "tenant_line_settings",
  "tenant_ai_settings",
  "customers",
  "messages",
  "alerts",
  "knowledge_pages"
];

function main() {
  const repoRoot = process.cwd();
  const migrationPath = join(repoRoot, "packages/db/migrations/0003_rls_core_tables.sql");
  const grantsMigrationPath = join(
    repoRoot,
    "packages/db/migrations/0002_service_role_postgrest_grants.sql"
  );

  if (!existsSync(migrationPath)) {
    fail("RLS migration draft is missing");
  }

  if (!existsSync(grantsMigrationPath)) {
    fail("service_role grants migration is missing");
  }

  const sql = readFileSync(migrationPath, "utf8");
  const grantsSql = readFileSync(grantsMigrationPath, "utf8");

  assertRequiredRlsShape(sql);
  assertTenantMembershipPolicies(sql);
  assertGrantSafety(sql);
  assertServiceRoleGrantSafety(sql, grantsSql);
  assertKnowledgePolicySafety(sql);

  console.log("[ok] RLS migration static verification passed");
}

function assertRequiredRlsShape(sql) {
  for (const table of targetTables) {
    assertMatches(
      sql,
      new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"),
      `${table} enables row level security`
    );
    assertMatches(
      sql,
      new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, "i"),
      `${table} forces row level security`
    );
    assertMatches(
      sql,
      new RegExp(`drop\\s+policy\\s+if\\s+exists[\\s\\S]+on\\s+public\\.${table}`, "i"),
      `${table} uses drop policy if exists`
    );
  }

  assertMatches(sql, /auth\.uid\(\)::text/i, "policy uses auth.uid()::text");
  assertMatches(sql, /\bpublic\.staff_users\b/i, "policy references staff_users");
  assertMatches(
    sql,
    /\bpublic\.staff_tenant_memberships\b/i,
    "policy references staff_tenant_memberships"
  );
}

function assertTenantMembershipPolicies(sql) {
  assertMatches(sql, /su\.auth_user_id\s*=\s*auth\.uid\(\)::text/i, "auth user is matched");
  assertMatches(sql, /su\.status\s*=\s*'active'/i, "active staff status is required");
  assertMatches(sql, /su\.is_active\s*=\s*true/i, "active staff boolean is required");
  assertMatches(sql, /stm\.status\s*=\s*'active'/i, "active membership status is required");

  for (const table of tenantScopedTables) {
    assertMatches(
      sql,
      new RegExp(`stm\\.tenant_id\\s*=\\s*${table}\\.tenant_id`, "i"),
      `${table} policy checks matching tenant_id`
    );
  }

  assertMatches(sql, /stm\.tenant_id\s*=\s*tenants\.id/i, "tenants policy checks tenant id");
  assertMatches(
    sql,
    /auth_user_id\s*=\s*auth\.uid\(\)::text[\s\S]+status\s*=\s*'active'[\s\S]+is_active\s*=\s*true/i,
    "staff_users self policy checks active authenticated staff"
  );
  assertMatches(
    sql,
    /su\.id\s*=\s*staff_tenant_memberships\.staff_user_id[\s\S]+su\.auth_user_id\s*=\s*auth\.uid\(\)::text/i,
    "staff_tenant_memberships policy checks own staff user"
  );
}

function assertGrantSafety(sql) {
  assertNotMatches(sql, /\bto\s+anon\b/i, "anon grants or policies are not allowed");
  assertNotMatches(sql, /\bto\s+public\b/i, "public grants or policies are not allowed");
  assertNotMatches(sql, /grant\s+all\b/i, "grant all is not allowed");
  assertNotMatches(
    sql,
    /grant[\s\S]+on\s+all\s+tables[\s\S]+to\s+authenticated/i,
    "grant on all tables to authenticated is not allowed"
  );
  assertNotMatches(
    sql,
    /grant[\s\S]+on\s+all\s+tables[\s\S]+to\s+anon/i,
    "grant on all tables to anon is not allowed"
  );
  assertNotMatches(sql, /using\s*\(\s*true\s*\)/i, "using true is not allowed");
  assertNotMatches(sql, /with\s+check\s*\(\s*true\s*\)/i, "with check true is not allowed");

  assertMatches(
    sql,
    /grant\s+usage\s+on\s+schema\s+public\s+to\s+authenticated/i,
    "authenticated gets explicit schema usage"
  );
  assertMatches(
    sql,
    /grant\s+select\s+on\s+table[\s\S]+public\.staff_users[\s\S]+public\.staff_tenant_memberships[\s\S]+to\s+authenticated/i,
    "authenticated select grant is explicit"
  );
  assertMatches(
    sql,
    /grant\s+select,\s*insert,\s*update\s+on\s+table[\s\S]+public\.customers[\s\S]+public\.alerts[\s\S]+to\s+authenticated/i,
    "authenticated write grant is explicit for customers and alerts"
  );
  assertMatches(
    sql,
    /grant\s+select,\s*insert\s+on\s+table[\s\S]+public\.messages[\s\S]+to\s+authenticated/i,
    "authenticated message grant is explicit"
  );
}

function assertServiceRoleGrantSafety(sql, grantsSql) {
  assertMatches(grantsSql, /grant\s+usage\s+on\s+schema\s+public\s+to\s+service_role/i, "service_role schema grant remains");
  assertMatches(grantsSql, /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table/i, "service_role table grant remains");
  assertNotMatches(sql, /\brevoke[\s\S]+service_role\b/i, "RLS draft must not revoke service_role");
  assertNotMatches(sql, /\bto\s+service_role\b/i, "RLS draft must not change service_role grants");
}

function assertKnowledgePolicySafety(sql) {
  assertMatches(
    sql,
    /knowledge_pages_select_allowed_for_active_staff_membership/i,
    "knowledge_pages allowed_for_ai policy exists"
  );
  assertMatches(sql, /allowed_for_ai\s*=\s*true/i, "knowledge_pages policy requires allowed_for_ai true");
  assertNotMatches(sql, /allowed_for_ai\s*=\s*false/i, "allowed_for_ai false must not be allowed");
}

function assertMatches(text, pattern, label) {
  if (!pattern.test(text)) {
    fail(`missing: ${label}`);
  }
}

function assertNotMatches(text, pattern, label) {
  if (pattern.test(text)) {
    fail(`unsafe pattern detected: ${label}`);
  }
}

function fail(message) {
  console.log("[ng] RLS migration static verification failed");
  console.log(`[ng] ${message}`);
  process.exit(1);
}

main();
