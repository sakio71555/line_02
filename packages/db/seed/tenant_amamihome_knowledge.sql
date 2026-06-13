-- Static initial knowledge seed for tenant_amamihome.
-- This is provisional seed data for Loop 012 and must be verified against the official site later.
-- All seeded rows use allowed_for_ai = true and contain no secrets or personal data.

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
  last_crawled_at
) values
  (
    'knowledge_amamihome_top',
    'tenant_amamihome',
    'https://amamihome.net/',
    '会社案内',
    'official_site',
    'トップページ / 会社全体案内',
    'アマミホームの会社全体案内に関する初期ナレッジです。家づくり相談、施工事例、資料請求、来場相談などの入口として扱います。内容は後続Loopで公式HPを確認して更新します。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_construction_cases',
    'tenant_amamihome',
    'https://amamihome.net/works/',
    '施工事例',
    'official_site',
    '施工事例',
    '施工事例は、お客様の好みや暮らし方に近い住まいを探すための初期ナレッジです。価格や仕様の断定は避け、担当者が公式情報を確認して案内します。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_owner_interviews',
    'tenant_amamihome',
    'https://amamihome.net/owners-interview/',
    'オーナーズインタビュー',
    'official_site',
    'オーナーズインタビュー',
    'オーナーズインタビューは、家づくりの検討背景や暮らし方の参考として扱う初期ナレッジです。具体的な内容は後で公式HPから確認して更新します。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_online_consultation',
    'tenant_amamihome',
    'https://amamihome.net/online-consultation/',
    '相談',
    'official_site',
    'オンライン相談',
    'オンライン相談は、来場前に家づくりの進め方や希望条件を相談する導線として扱います。日時や対応可否は担当者が最新状況を確認して案内します。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_document_request',
    'tenant_amamihome',
    'https://amamihome.net/request/',
    '資料請求',
    'official_site',
    '資料請求',
    '資料請求は、検討中のお客様へ資料案内を行うための初期ナレッジです。送付資料や受付条件は担当者が確認し、必要な連絡先情報を安全に扱います。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_land_and_ready_built',
    'tenant_amamihome',
    'https://amamihome.net/land/',
    '分譲地・建売',
    'official_site',
    '分譲地・建売',
    '分譲地・建売は、土地や建売に関する相談導線として扱います。価格、在庫、販売状況は変動するため断定せず、担当者が最新情報を確認します。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_warranty_maintenance',
    'tenant_amamihome',
    'https://amamihome.net/maintenance/',
    '保証・メンテナンス',
    'faq',
    '保証・メンテナンス',
    '保証・メンテナンスは、建築後や入居後の相談に関する初期ナレッジです。保証判断や対応可否は契約や状況により変わるため、担当者確認へ誘導します。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_sotono_ma',
    'tenant_amamihome',
    'https://amamihome.net/sotono-ma/',
    'SoToNo MA',
    'official_site',
    'SoToNo MA',
    'SoToNo MAに関する問い合わせを受けたときの初期ナレッジです。暮らし方や施工事例への関心タグとして扱い、詳細は公式情報を確認して案内します。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_contact_visit',
    'tenant_amamihome',
    'https://amamihome.net/contact/',
    'お問い合わせ',
    'official_site',
    'お問い合わせ / 来場相談',
    'お問い合わせや来場相談は、担当者が希望内容を確認して次の案内につなげる導線です。日程確定や個別条件は自動断定せず、担当者確認を前提にします。',
    null,
    true,
    null
  ),
  (
    'knowledge_amamihome_after_support',
    'tenant_amamihome',
    'https://amamihome.net/after-support/',
    'アフター相談',
    'faq',
    'アフター相談',
    'アフター相談は、入居後の困りごとや点検、メンテナンス相談を担当者につなぐための初期ナレッジです。対応可否や保証範囲は担当者が確認します。',
    null,
    true,
    null
  )
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
  updated_at = now();
