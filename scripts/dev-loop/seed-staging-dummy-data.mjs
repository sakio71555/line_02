#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  checkPsqlVersion,
  loadStagingDatabaseConfig,
  resolvePsqlPath,
  runPsql,
  SafeConfigError
} from "./lib/staging-psql.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = parseArgs(process.argv.slice(2));
const envFile = args.env ?? ".env.staging";
const psqlPath = args.psql ?? resolvePsqlPath();

if (!psqlPath) {
  fail("psql was not found. Check /usr/local/opt/libpq/bin/psql or /opt/homebrew/opt/libpq/bin/psql.");
}

const version = checkPsqlVersion(psqlPath);

if (!version.ok) {
  fail(`psql is not usable: ${version.error}`);
}

try {
  const config = loadStagingDatabaseConfig({ repoRoot, envFile });
  const result = runPsql({
    psqlPath,
    connectionEnv: config.env,
    redactions: config.redactions,
    args: ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", buildSeedSql()]
  });

  if (result.status !== 0) {
    fail(result.stderr || result.error || "staging dummy seed failed");
  }

  console.log("[ok] staging dummy seed completed");
  console.log("[ok] tenant upserted: 1");
  console.log("[ok] customers upserted: 2");
  console.log("[ok] messages upserted: 5");
  console.log("[ok] knowledge pages upserted: 10");
  console.log("[ok] real LINE/OpenAI disabled for dummy seed");
} catch (error) {
  if (error instanceof SafeConfigError) {
    fail(error.message);
  }

  throw error;
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--env" && next) {
      parsed.env = next;
      index += 1;
    } else if (value === "--psql" && next) {
      parsed.psql = next;
      index += 1;
    }
  }

  return parsed;
}

function fail(message) {
  console.error(`[ng] ${message}`);
  process.exit(1);
}

function buildSeedSql() {
  return String.raw`
begin;

insert into tenants (id, slug, name, official_domain, status)
values ('tenant_amamihome', 'amamihome', 'アマミホーム', 'amamihome.net', 'active')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  official_domain = excluded.official_domain,
  status = excluded.status,
  updated_at = now();

insert into tenant_line_settings (
  tenant_id,
  channel_id,
  channel_secret_encrypted,
  channel_access_token_encrypted,
  webhook_secret_path,
  liff_id,
  staff_line_group_id,
  status
)
values (
  'tenant_amamihome',
  null,
  null,
  null,
  'wh_staging_dummy_amamihome',
  null,
  null,
  'draft'
)
on conflict (tenant_id) do update set
  channel_id = excluded.channel_id,
  channel_secret_encrypted = excluded.channel_secret_encrypted,
  channel_access_token_encrypted = excluded.channel_access_token_encrypted,
  webhook_secret_path = excluded.webhook_secret_path,
  liff_id = excluded.liff_id,
  staff_line_group_id = excluded.staff_line_group_id,
  status = excluded.status,
  updated_at = now();

insert into tenant_ai_settings (
  tenant_id,
  provider,
  model,
  summary_enabled,
  reply_draft_enabled,
  auto_reply_enabled,
  rag_enabled,
  allowed_source_policy
)
values (
  'tenant_amamihome',
  'openai',
  'mock-provider-placeholder',
  true,
  true,
  false,
  true,
  'approved_tenant_sources_only'
)
on conflict (tenant_id) do update set
  provider = excluded.provider,
  model = excluded.model,
  summary_enabled = excluded.summary_enabled,
  reply_draft_enabled = excluded.reply_draft_enabled,
  auto_reply_enabled = excluded.auto_reply_enabled,
  rag_enabled = excluded.rag_enabled,
  allowed_source_policy = excluded.allowed_source_policy,
  updated_at = now();

insert into customers (
  id,
  tenant_id,
  line_user_id,
  display_name,
  picture_url,
  phone,
  email,
  postal_code,
  address,
  interest_tags,
  response_mode,
  status,
  last_message_at,
  last_customer_message_at,
  last_staff_reply_at,
  created_at,
  updated_at
)
values
  (
    'customer_demo_yamada_taro',
    'tenant_amamihome',
    'dummy_line_user_yamada',
    'デモ 山田',
    null,
    null,
    null,
    null,
    null,
    array['平屋', 'SoToNo MA', 'モデルホーム見学'],
    'human_required',
    'active',
    '2026-06-16T09:18:00Z',
    '2026-06-16T09:18:00Z',
    null,
    '2026-06-16T09:00:00Z',
    '2026-06-16T09:18:00Z'
  ),
  (
    'customer_demo_sato_hanako',
    'tenant_amamihome',
    'dummy_line_user_sato',
    'デモ 佐藤',
    null,
    null,
    null,
    null,
    null,
    array['オンライン相談', '資料請求'],
    'human_active',
    'active',
    '2026-06-16T09:35:00Z',
    '2026-06-16T09:14:00Z',
    '2026-06-16T09:35:00Z',
    '2026-06-16T09:05:00Z',
    '2026-06-16T09:35:00Z'
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  line_user_id = excluded.line_user_id,
  display_name = excluded.display_name,
  picture_url = excluded.picture_url,
  phone = excluded.phone,
  email = excluded.email,
  postal_code = excluded.postal_code,
  address = excluded.address,
  interest_tags = excluded.interest_tags,
  response_mode = excluded.response_mode,
  status = excluded.status,
  last_message_at = excluded.last_message_at,
  last_customer_message_at = excluded.last_customer_message_at,
  last_staff_reply_at = excluded.last_staff_reply_at,
  updated_at = excluded.updated_at;

insert into messages (
  id,
  tenant_id,
  customer_id,
  consultation_id,
  line_message_id,
  role,
  message_type,
  body,
  media_storage_path,
  staff_user_id,
  ai_generated,
  sent_to_line_at,
  created_at
)
values
  (
    'message_demo_yamada_1',
    'tenant_amamihome',
    'customer_demo_yamada_taro',
    null,
    'dummy_line_message_yamada_1',
    'customer',
    'text',
    '平屋とSoToNo MAについて知りたいです。',
    null,
    null,
    false,
    null,
    '2026-06-16T09:08:00Z'
  ),
  (
    'message_demo_yamada_2',
    'tenant_amamihome',
    'customer_demo_yamada_taro',
    null,
    'dummy_line_message_yamada_2',
    'customer',
    'text',
    'モデルホーム見学の日程も相談したいです。',
    null,
    null,
    false,
    null,
    '2026-06-16T09:18:00Z'
  ),
  (
    'message_demo_yamada_summary_1',
    'tenant_amamihome',
    'customer_demo_yamada_taro',
    null,
    null,
    'ai',
    'summary',
    '{"summary":"dummy summary","next_actions":["dummy follow up"],"risk_flags":[],"recommended_response_mode":"human_required"}',
    null,
    null,
    true,
    null,
    '2026-06-16T09:20:00Z'
  ),
  (
    'message_demo_sato_1',
    'tenant_amamihome',
    'customer_demo_sato_hanako',
    null,
    'dummy_line_message_sato_1',
    'customer',
    'text',
    'オンライン相談と資料請求について知りたいです。',
    null,
    null,
    false,
    null,
    '2026-06-16T09:14:00Z'
  ),
  (
    'message_demo_sato_2',
    'tenant_amamihome',
    'customer_demo_sato_hanako',
    null,
    null,
    'staff',
    'text',
    'オンライン相談の日程候補を確認します。',
    null,
    null,
    false,
    '2026-06-16T09:35:00Z',
    '2026-06-16T09:35:00Z'
  )
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  customer_id = excluded.customer_id,
  consultation_id = excluded.consultation_id,
  line_message_id = excluded.line_message_id,
  role = excluded.role,
  message_type = excluded.message_type,
  body = excluded.body,
  media_storage_path = excluded.media_storage_path,
  staff_user_id = excluded.staff_user_id,
  ai_generated = excluded.ai_generated,
  sent_to_line_at = excluded.sent_to_line_at,
  created_at = excluded.created_at;

insert into knowledge_pages (
  id,
  tenant_id,
  url,
  category,
  source_type,
  title,
  content,
  checksum,
  allowed_for_ai,
  last_crawled_at,
  created_at,
  updated_at
)
values
  ('knowledge_staging_top', 'tenant_amamihome', 'https://amamihome.net/', 'top', 'official_site', 'アマミホーム トップ', '家づくり相談、資料請求、モデルホーム見学の入口です。', 'dummy-001', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_online', 'tenant_amamihome', 'https://amamihome.net/online/', 'consultation', 'official_site', 'オンライン相談', 'オンライン相談では住まいづくりの初回相談を受け付けます。', 'dummy-002', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_cases', 'tenant_amamihome', 'https://amamihome.net/works/', 'works', 'official_site', '施工事例', '平屋や二階建てなど施工事例を確認できます。', 'dummy-003', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_request', 'tenant_amamihome', 'https://amamihome.net/request/', 'document_request', 'official_site', '資料請求', '資料請求で家づくり資料を取り寄せできます。', 'dummy-004', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_maintenance', 'tenant_amamihome', 'https://amamihome.net/support/', 'support', 'official_site', '保証・メンテナンス', '保証やメンテナンスは担当者確認を前提に案内します。', 'dummy-005', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_sotono_ma', 'tenant_amamihome', 'https://amamihome.net/sotono-ma/', 'product', 'official_site', 'SoToNo MA', 'SoToNo MAは暮らし方の相談で紹介する住まいの提案です。', 'dummy-006', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_land', 'tenant_amamihome', 'https://amamihome.net/land/', 'land', 'official_site', '分譲地・建売', '分譲地や建売情報は最新状況を担当者が確認します。', 'dummy-007', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_interview', 'tenant_amamihome', 'https://amamihome.net/interview/', 'interview', 'official_site', 'オーナーズインタビュー', 'オーナーズインタビューで住まい手の声を確認できます。', 'dummy-008', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_contact', 'tenant_amamihome', 'https://amamihome.net/contact/', 'contact', 'official_site', '問い合わせ', '問い合わせは担当者が内容を確認して返答します。', 'dummy-009', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z'),
  ('knowledge_staging_faq', 'tenant_amamihome', 'https://amamihome.net/faq/', 'faq', 'faq', 'よくある質問', '費用や補助金は断定せず担当者確認へつなぎます。', 'dummy-010', true, '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z', '2026-06-16T09:00:00Z')
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  url = excluded.url,
  category = excluded.category,
  source_type = excluded.source_type,
  title = excluded.title,
  content = excluded.content,
  checksum = excluded.checksum,
  allowed_for_ai = excluded.allowed_for_ai,
  last_crawled_at = excluded.last_crawled_at,
  updated_at = excluded.updated_at;

commit;
`;
}
