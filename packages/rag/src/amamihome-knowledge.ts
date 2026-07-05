import type { KnowledgePage } from "./index";

export const AMAMI_HOME_TENANT_ID = "tenant_amamihome";
export const AMAMI_HOME_OFFICIAL_DOMAIN = "amamihome.net";

const amamiHomeKnowledgePages = [
  {
    id: "knowledge_amamihome_top",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "トップページ / 会社全体案内",
    url: "https://amamihome.net/",
    category: "会社案内",
    source_type: "official_site",
    content:
      "アマミホームの会社全体案内に関する初期ナレッジです。家づくり相談、施工事例、資料請求、来場相談などの入口として扱います。内容は後続Loopで公式HPを確認して更新します。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_model_house_reservation",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "モデルハウス見学予約",
    url: "https://amamihome.net/reservation/",
    category: "モデルハウス見学",
    source_type: "official_site",
    content:
      "モデルハウス見学予約は、モデルハウスやモデルホームの見学、来場予約を希望するお客様へ案内する公式ページです。希望日時の確定や変更は担当者確認を前提にします。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_consultation",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "家づくり相談",
    url: "https://amamihome.net/consultation/",
    category: "家づくり相談",
    source_type: "official_site",
    content:
      "家づくり相談は、新築や住まいづくりの進め方について相談したいお客様へ案内する公式ページです。個別条件は担当者が確認します。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_construction_cases",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "施工事例",
    url: "https://amamihome.net/works/",
    category: "施工事例",
    source_type: "official_site",
    content:
      "施工事例は、お客様の好みや暮らし方に近い住まいを探すための初期ナレッジです。価格や仕様の断定は避け、担当者が公式情報を確認して案内します。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_owner_interviews",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "オーナーズインタビュー",
    url: "https://amamihome.net/owners-interview/",
    category: "オーナーズインタビュー",
    source_type: "official_site",
    content:
      "オーナーズインタビューは、家づくりの検討背景や暮らし方の参考として扱う初期ナレッジです。具体的な内容は後で公式HPから確認して更新します。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_online_consultation",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "オンライン相談",
    url: "https://amamihome.net/online-consultation/",
    category: "相談",
    source_type: "official_site",
    content:
      "オンライン相談は、来場前に家づくりの進め方や希望条件を相談する導線として扱います。日時や対応可否は担当者が最新状況を確認して案内します。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_document_request",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "資料請求",
    url: "https://amamihome.net/download/",
    category: "資料請求",
    source_type: "official_site",
    content:
      "資料請求は、検討中のお客様へ資料案内を行うための初期ナレッジです。送付資料や受付条件は担当者が確認し、必要な連絡先情報を安全に扱います。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_company_hours",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "会社情報・営業時間",
    url: "https://amamihome.net/",
    category: "会社案内",
    source_type: "official_site",
    content:
      "会社情報や営業時間、所在地、アクセスなどの一般的な質問は、公式サイトの情報を確認して案内します。最新情報や個別の来場可否は担当者確認を前提にします。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_land_and_ready_built",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "分譲地・建売",
    url: "https://amamihome.net/land/",
    category: "分譲地・建売",
    source_type: "official_site",
    content:
      "分譲地・建売は、土地や建売に関する相談導線として扱います。価格、在庫、販売状況は変動するため断定せず、担当者が最新情報を確認します。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_warranty_maintenance",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "保証・メンテナンス",
    url: "https://amamihome.net/maintenance/",
    category: "保証・メンテナンス",
    source_type: "faq",
    content:
      "保証・メンテナンスは、建築後や入居後の相談に関する初期ナレッジです。保証判断や対応可否は契約や状況により変わるため、担当者確認へ誘導します。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_sotono_ma",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "SoToNo MA",
    url: "https://amamihome.net/sotono-ma/",
    category: "SoToNo MA",
    source_type: "official_site",
    content:
      "SoToNo MAに関する問い合わせを受けたときの初期ナレッジです。暮らし方や施工事例への関心タグとして扱い、詳細は公式情報を確認して案内します。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_contact_visit",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "お問い合わせ / 来場相談",
    url: "https://amamihome.net/contact/",
    category: "お問い合わせ",
    source_type: "official_site",
    content:
      "お問い合わせや来場相談は、担当者が希望内容を確認して次の案内につなげる導線です。日程確定や個別条件は自動断定せず、担当者確認を前提にします。",
    allowed_for_ai: true,
    last_crawled_at: null
  },
  {
    id: "knowledge_amamihome_after_support",
    tenant_id: AMAMI_HOME_TENANT_ID,
    title: "アフター相談",
    url: "https://amamihome.net/after-support/",
    category: "アフター相談",
    source_type: "faq",
    content:
      "アフター相談は、入居後の困りごとや点検、メンテナンス相談を担当者につなぐための初期ナレッジです。対応可否や保証範囲は担当者が確認します。",
    allowed_for_ai: true,
    last_crawled_at: null
  }
] satisfies KnowledgePage[];

export function createAmamiHomeKnowledgePages(): KnowledgePage[] {
  return amamiHomeKnowledgePages.map((page) => ({ ...page }));
}

export function seedAmamiHomeKnowledge(repository: {
  upsertMany(pages: KnowledgePage[]): void;
}): void {
  repository.upsertMany(createAmamiHomeKnowledgePages());
}
