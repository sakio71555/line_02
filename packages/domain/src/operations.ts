import { z } from "zod";

import type {
  Alert,
  Customer,
  Message,
  Reservation,
  StaffMembershipStatus,
  StaffRole,
  StaffStatus,
  StaffTenantMembership,
  StaffUser
} from "./index";
import { adminRoles } from "./admin-permissions";

export const workspaceAccentPresets = ["forest", "ocean", "charcoal", "sunrise"] as const;
export type WorkspaceAccentPreset = (typeof workspaceAccentPresets)[number];

export const lineMenuTypes = ["initial", "negotiation", "aftercare"] as const;
export type BuiltInLineMenuType = (typeof lineMenuTypes)[number];
export type LineMenuType = string;

export const lineMenuItemBehaviors = [
  "link",
  "guide",
  "consultation",
  "staff_handoff"
] as const;
export type LineMenuItemBehavior = (typeof lineMenuItemBehaviors)[number];

export const lineMenuActionKeys = [
  "initial.customer_info_register",
  "initial.model_house_reservation",
  "initial.home_building_consultation",
  "initial.works",
  "initial.catalog_request",
  "initial.contact_staff",
  "negotiation.meeting_schedule",
  "negotiation.plan_consultation",
  "negotiation.estimate_budget",
  "negotiation.land_site",
  "negotiation.required_documents",
  "negotiation.contact_staff",
  "aftercare.repair_inspection",
  "aftercare.periodic_inspection",
  "aftercare.trouble_consultation",
  "aftercare.warranty_maintenance",
  "aftercare.contact_change",
  "aftercare.contact_staff"
] as const;
export type BuiltInLineMenuActionKey = (typeof lineMenuActionKeys)[number];
export type LineMenuActionKey = string;

const structuredLineMenuActionKeys = new Set<BuiltInLineMenuActionKey>([
  "negotiation.meeting_schedule",
  "negotiation.plan_consultation",
  "negotiation.estimate_budget",
  "negotiation.land_site",
  "negotiation.required_documents",
  "aftercare.repair_inspection",
  "aftercare.periodic_inspection",
  "aftercare.trouble_consultation",
  "aftercare.warranty_maintenance"
]);

export const lineFlowStepKinds = ["choice", "text"] as const;
export type LineFlowStepKind = (typeof lineFlowStepKinds)[number];

export const lineFlowConditionOperators = ["equals", "not_equals", "in", "not_in"] as const;
export type LineFlowConditionOperator = (typeof lineFlowConditionOperators)[number];

export const lineFlowConditionSchema = z.object({
  field_key: z.string().trim().min(1).max(80),
  operator: z.enum(lineFlowConditionOperators),
  values: z.array(z.string().trim().min(1).max(120)).min(1).max(30)
});

export type LineFlowConditionSettings = z.infer<typeof lineFlowConditionSchema>;

export const lineFlowOptionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
  notification_label: z.string().trim().max(120).optional()
});

export type LineFlowOptionSettings = z.infer<typeof lineFlowOptionSchema>;

export const lineFlowStepSchema = z
  .object({
    key: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,79}$/),
    kind: z.enum(lineFlowStepKinds),
    prompt_timeline_body: z.string().trim().min(1).max(300),
    value_timeline_prefix: z.string().trim().min(1).max(120),
    prompt_reply: z.string().trim().min(1).max(2000),
    retry_reply: z.string().trim().min(1).max(2000),
    options: z.array(lineFlowOptionSchema).max(30).default([]),
    condition: lineFlowConditionSchema.nullable().optional()
  })
  .superRefine((step, context) => {
    if (step.kind === "choice" && step.options.length < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "選択式の質問には選択肢が必要です。"
      });
    }

    if (step.kind === "text" && step.options.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "自由入力の質問には選択肢を設定できません。"
      });
    }

    if (new Set(step.options.map((option) => option.value)).size !== step.options.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "同じ質問内で選択肢の内部値を重複できません。"
      });
    }
  });

export type LineFlowStepSettings = z.infer<typeof lineFlowStepSchema>;

export const lineConsultationFlowSettingsSchema = z
  .object({
    category: z.string().trim().min(1).max(80),
    assigned_role: z.string().trim().min(1).max(80),
    secondary_role: z.string().trim().max(80).optional(),
    default_severity: z.enum(["low", "medium", "high", "critical"]),
    default_priority: z.enum(["normal", "high"]),
    ai_auto_reply: z.boolean(),
    requires_staff_confirmation: z.boolean(),
    steps: z.array(lineFlowStepSchema).min(1).max(20)
  })
  .superRefine((flow, context) => {
    const stepKeys = flow.steps.map((step) => step.key);
    if (new Set(stepKeys).size !== stepKeys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message: "質問の内部IDが重複しています。"
      });
    }

    flow.steps.forEach((step, stepIndex) => {
      if (!step.condition) return;
      const sourceIndex = flow.steps.findIndex(
        (candidate) => candidate.key === step.condition?.field_key
      );
      if (sourceIndex < 0 || sourceIndex >= stepIndex) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", stepIndex, "condition", "field_key"],
          message: "表示条件には、この質問より前の質問を指定してください。"
        });
      }
    });
  });

export type LineConsultationFlowSettings = z.infer<
  typeof lineConsultationFlowSettingsSchema
>;

export const lineMenuItemSettingsSchema = z.object({
  action_key: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{2,79}$/),
  label: z.string().trim().min(1).max(20),
  behavior: z.enum(lineMenuItemBehaviors),
  trigger_text: z.string().trim().max(300),
  target_url: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  reply_text: z.string().trim().max(2000),
  timeline_label: z.string().trim().max(120),
  flow: lineConsultationFlowSettingsSchema.nullable().optional()
});

export type LineMenuItemSettings = z.infer<typeof lineMenuItemSettingsSchema>;

export const lineMenuPublicationStatuses = ["draft", "published", "retired"] as const;
export type LineMenuPublicationStatus = (typeof lineMenuPublicationStatuses)[number];

export const lineMenuPublishedSnapshotSchema = z.object({
  name: z.string().trim().min(1).max(300),
  chat_bar_text: z.string().trim().min(1).max(14),
  line_rich_menu_id: z.string().trim().max(160).optional(),
  items: z.array(lineMenuItemSettingsSchema).length(6)
});

export type LineMenuPublishedSnapshot = z.infer<typeof lineMenuPublishedSnapshotSchema>;

export const lineMenuSettingsSchema = z.object({
  menu_type: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,63}$/),
  name: z.string().trim().min(1).max(300),
  chat_bar_text: z.string().trim().min(1).max(14),
  line_rich_menu_id: z.string().trim().max(160).optional(),
  items: z.array(lineMenuItemSettingsSchema).length(6),
  publication_status: z.enum(lineMenuPublicationStatuses).optional(),
  published_snapshot: lineMenuPublishedSnapshotSchema.nullable().optional()
});

export type LineMenuSettings = z.infer<typeof lineMenuSettingsSchema>;

export const lineExperienceSettingsSchema = z
  .object({
    menus: z.array(lineMenuSettingsSchema).min(1).max(20)
  })
  .superRefine((settings, context) => {
    const menuTypes = settings.menus.map((menu) => menu.menu_type);
    const actionKeys = settings.menus.flatMap((menu) =>
      menu.items.map((item) => item.action_key)
    );
    const itemsByTrigger = new Map<
      string,
      Array<{ item: LineMenuItemSettings; path: (string | number)[] }>
    >();

    if (new Set(menuTypes).size !== menuTypes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["menus"],
        message: "LINEメニューの内部IDは重複できません。"
      });
    }

    if (new Set(actionKeys).size !== actionKeys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["menus"],
        message: "LINEメニュー項目の内部IDは重複できません。"
      });
    }

    settings.menus.forEach((menu, menuIndex) => {
      menu.items.forEach((item, itemIndex) => {
        const path = ["menus", menuIndex, "items", itemIndex] as (string | number)[];

        if (item.behavior !== "link" && item.trigger_text) {
          const normalizedTrigger = item.trigger_text.trim();
          const entries = itemsByTrigger.get(normalizedTrigger) ?? [];
          entries.push({ item, path });
          itemsByTrigger.set(normalizedTrigger, entries);
        }

        if (!item.action_key.startsWith(`${menu.menu_type}.`)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "action_key"],
            message: "LINEメニュー項目が別のメニュー種別に属しています。"
          });
        }

        if (item.behavior === "link" && !item.target_url) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "target_url"],
            message: "リンクを開く項目にはURLが必要です。"
          });
        }

        if (item.behavior !== "link" && !item.trigger_text) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "trigger_text"],
            message: "LINEで送る文字が必要です。"
          });
        }

        if (item.behavior === "guide" && !item.reply_text) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "reply_text"],
            message: "案内を返す項目には返答文が必要です。"
          });
        }

        if (
          item.behavior === "consultation" &&
          !item.flow &&
          !structuredLineMenuActionKeys.has(item.action_key as BuiltInLineMenuActionKey)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "behavior"],
            message: "相談を受け付ける項目には質問フローが必要です。"
          });
        }

        if (item.behavior !== "consultation" && item.flow) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "flow"],
            message: "質問フローは相談受付の項目だけに設定できます。"
          });
        }
      });
    });

    for (const entries of itemsByTrigger.values()) {
      if (entries.length < 2) {
        continue;
      }

      const runtimeFingerprints = new Set(
        entries.map(({ item }) =>
          JSON.stringify({
            behavior: item.behavior,
            target_url: item.target_url,
            reply_text: item.reply_text,
            timeline_label: item.timeline_label,
            consultation_action_key:
              item.behavior === "consultation" ? item.action_key : null,
            flow: item.flow ?? null
          })
        )
      );

      if (runtimeFingerprints.size > 1) {
        for (const { path } of entries) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path, "trigger_text"],
            message: "同じ送信文字には同じ動作と返答を設定してください。"
          });
        }
      }
    }
  });

export type LineExperienceSettings = z.infer<typeof lineExperienceSettingsSchema>;

const amamiHomeContactStaffReply = [
  "担当者に相談ですね。",
  "相談カテゴリを次から選んで、そのままLINEで送ってください。",
  "",
  "・家づくりについて",
  "・モデルハウス見学について",
  "・資料請求について",
  "・費用・ローンについて",
  "・その他"
].join("\n");

const amamiHomeLineExperienceDefaults: LineExperienceSettings = {
  menus: [
    {
      menu_type: "initial",
      name: "初期メニュー",
      chat_bar_text: "メニュー",
      items: [
        {
          action_key: "initial.customer_info_register",
          label: "お客様情報登録",
          behavior: "link",
          trigger_text: "",
          target_url: "https://admin.taiyolabel.site/line/customer-registration",
          reply_text: "",
          timeline_label: "お客様情報登録"
        },
        {
          action_key: "initial.model_house_reservation",
          label: "モデルハウス見学予約",
          behavior: "guide",
          trigger_text: "モデルハウス見学予約",
          target_url: "https://amamihome.net/reservation/",
          reply_text:
            "モデルハウス見学のご予約はこちらからお願いいたします。\nご希望日時を入力して送信してください。",
          timeline_label: "モデルハウス見学予約ページ案内済み"
        },
        {
          action_key: "initial.home_building_consultation",
          label: "家づくり相談",
          behavior: "guide",
          trigger_text: "家づくり相談",
          target_url: "https://amamihome.net/consultation/",
          reply_text:
            "家づくり相談はこちらからお願いいたします。\nご相談内容を入力して送信してください。",
          timeline_label: "家づくり相談ページ案内済み"
        },
        {
          action_key: "initial.works",
          label: "施工事例を見る",
          behavior: "guide",
          trigger_text: "施工事例を見る",
          target_url: "https://amamihome.net/works/",
          reply_text:
            "施工事例はこちらからご覧いただけます。\n気になる施工事例があれば、そのままLINEでお知らせください。",
          timeline_label: "施工事例ページ案内済み"
        },
        {
          action_key: "initial.catalog_request",
          label: "資料請求",
          behavior: "guide",
          trigger_text: "資料請求",
          target_url: "https://amamihome.net/download/",
          reply_text:
            "資料請求はこちらからお願いいたします。\n家づくり資料のご請求内容を入力して送信してください。",
          timeline_label: "資料請求ページ案内済み"
        },
        {
          action_key: "initial.contact_staff",
          label: "担当者に相談",
          behavior: "staff_handoff",
          trigger_text: "担当者に相談",
          target_url: "",
          reply_text: amamiHomeContactStaffReply,
          timeline_label: "担当者相談"
        }
      ]
    },
    {
      menu_type: "negotiation",
      name: "商談中メニュー",
      chat_bar_text: "商談メニュー",
      items: [
        {
          action_key: "negotiation.meeting_schedule",
          label: "打合せ予約・変更",
          behavior: "consultation",
          trigger_text: "打合せ予約・変更",
          target_url: "",
          reply_text: "打合せ予約・変更ですね。用件を次から選んで送ってください。",
          timeline_label: "打合せ予約・変更"
        },
        {
          action_key: "negotiation.plan_consultation",
          label: "プラン・間取り相談",
          behavior: "consultation",
          trigger_text: "プラン・間取り相談",
          target_url: "",
          reply_text: "相談したい内容を次から選んで送ってください。",
          timeline_label: "プラン・間取り相談"
        },
        {
          action_key: "negotiation.estimate_budget",
          label: "見積・資金計画",
          behavior: "consultation",
          trigger_text: "見積・資金計画",
          target_url: "",
          reply_text: "相談内容を次から選んで送ってください。",
          timeline_label: "見積・資金計画"
        },
        {
          action_key: "negotiation.land_site",
          label: "土地・敷地の相談",
          behavior: "consultation",
          trigger_text: "土地・敷地の相談",
          target_url: "",
          reply_text: "相談内容を次から選んで送ってください。",
          timeline_label: "土地・敷地の相談"
        },
        {
          action_key: "negotiation.required_documents",
          label: "必要書類・確認事項",
          behavior: "consultation",
          trigger_text: "必要書類・確認事項",
          target_url: "",
          reply_text: "確認したい内容を次から選んで送ってください。",
          timeline_label: "必要書類・確認事項"
        },
        {
          action_key: "negotiation.contact_staff",
          label: "担当者に相談",
          behavior: "staff_handoff",
          trigger_text: "担当者に相談",
          target_url: "",
          reply_text: amamiHomeContactStaffReply,
          timeline_label: "担当者相談"
        }
      ]
    },
    {
      menu_type: "aftercare",
      name: "アフターメニュー",
      chat_bar_text: "アフター",
      items: [
        {
          action_key: "aftercare.repair_inspection",
          label: "修理・点検依頼",
          behavior: "consultation",
          trigger_text: "修理・点検依頼",
          target_url: "",
          reply_text: "修理・点検依頼ですね。内容を次から選んで送ってください。",
          timeline_label: "修理・点検依頼"
        },
        {
          action_key: "aftercare.periodic_inspection",
          label: "定期点検予約",
          behavior: "consultation",
          trigger_text: "定期点検予約",
          target_url: "",
          reply_text:
            "点検の希望日時を入力してください。\n第1希望・第2希望・第3希望があれば、まとめて送ってください。",
          timeline_label: "定期点検予約"
        },
        {
          action_key: "aftercare.trouble_consultation",
          label: "不具合を相談",
          behavior: "consultation",
          trigger_text: "不具合を相談",
          target_url: "",
          reply_text: "不具合の種類を次から選んで送ってください。",
          timeline_label: "不具合相談"
        },
        {
          action_key: "aftercare.warranty_maintenance",
          label: "保証・メンテナンス",
          behavior: "consultation",
          trigger_text: "保証・メンテナンス",
          target_url: "",
          reply_text: "確認したい内容を次から選んで送ってください。",
          timeline_label: "保証・メンテナンス"
        },
        {
          action_key: "aftercare.contact_change",
          label: "連絡先変更",
          behavior: "link",
          trigger_text: "",
          target_url:
            "https://admin.taiyolabel.site/line/customer-registration?mode=contact-change",
          reply_text: "",
          timeline_label: "連絡先変更"
        },
        {
          action_key: "aftercare.contact_staff",
          label: "担当者に相談",
          behavior: "staff_handoff",
          trigger_text: "担当者に相談",
          target_url: "",
          reply_text: amamiHomeContactStaffReply,
          timeline_label: "担当者相談"
        }
      ]
    }
  ]
};

export function createDefaultLineExperienceSettings(): LineExperienceSettings {
  return hydrateLineExperiencePublicationState(
    JSON.parse(JSON.stringify(amamiHomeLineExperienceDefaults)) as LineExperienceSettings
  );
}

export function createLineMenuPublishedSnapshot(
  menu: LineMenuSettings
): LineMenuPublishedSnapshot {
  return {
    name: menu.name,
    chat_bar_text: menu.chat_bar_text,
    ...(menu.line_rich_menu_id ? { line_rich_menu_id: menu.line_rich_menu_id } : {}),
    items: JSON.parse(JSON.stringify(menu.items)) as LineMenuItemSettings[]
  };
}

export function resolveLineMenuPublicationStatus(
  menu: LineMenuSettings
): LineMenuPublicationStatus {
  return menu.publication_status ?? "published";
}

export function hydrateLineExperiencePublicationState(
  settings: LineExperienceSettings
): LineExperienceSettings {
  return {
    menus: settings.menus.map((menu) => {
      const publicationStatus = resolveLineMenuPublicationStatus(menu);
      const publishedSnapshot =
        menu.published_snapshot ??
        (publicationStatus === "draft" ? null : createLineMenuPublishedSnapshot(menu));

      return {
        ...menu,
        publication_status: publicationStatus,
        published_snapshot: publishedSnapshot
      };
    })
  };
}

export function resolveRuntimeLineMenus(
  settings: LineExperienceSettings,
  options: { includeRetired?: boolean } = {}
): LineMenuSettings[] {
  const includeRetired = options.includeRetired ?? true;
  return hydrateLineExperiencePublicationState(settings).menus.flatMap((menu) => {
    const status = resolveLineMenuPublicationStatus(menu);
    const snapshot = menu.published_snapshot;
    if (!snapshot || status === "draft" || (status === "retired" && !includeRetired)) {
      return [];
    }

    return [
      {
        menu_type: menu.menu_type,
        ...snapshot,
        publication_status: status,
        published_snapshot: snapshot
      }
    ];
  });
}

export function resolvePublishedLineMenu(
  settings: LineExperienceSettings,
  menuType: LineMenuType
): LineMenuSettings | null {
  return (
    resolveRuntimeLineMenus(settings, { includeRetired: false }).find(
      (menu) => menu.menu_type === menuType
    ) ?? null
  );
}

export function findLineMenuItemByTrigger(
  settings: LineExperienceSettings,
  triggerText: string | null
): LineMenuItemSettings | null {
  const normalized = triggerText?.trim();

  if (!normalized) {
    return null;
  }

  return (
    resolveRuntimeLineMenus(settings)
      .flatMap((menu) => menu.items)
      .find((item) => item.behavior !== "link" && item.trigger_text === normalized) ?? null
  );
}

export function buildLineRichMenuDefinition(
  settings: LineExperienceSettings,
  menuType: LineMenuType
): {
  size: { width: 2500; height: 1686 };
  selected: true;
  name: string;
  chatBarText: string;
  areas: Array<{
    bounds: { x: number; y: number; width: number; height: 843 };
    action:
      | { type: "uri"; label: string; uri: string }
      | { type: "message"; label: string; text: string };
  }>;
} {
  const parsed = lineExperienceSettingsSchema.parse(settings);
  const menu = resolvePublishedLineMenu(parsed, menuType);

  if (!menu) {
    throw new Error(`published line menu settings not found: ${menuType}`);
  }

  return buildLineRichMenuDefinitionForMenu(menu);
}

export function buildLineRichMenuDefinitionForMenu(
  menu: LineMenuSettings
): ReturnType<typeof buildLineRichMenuDefinition> {
  const parsedMenu = lineMenuSettingsSchema.parse(menu);

  const columns = [
    { x: 0, width: 833 },
    { x: 833, width: 833 },
    { x: 1666, width: 834 }
  ];

  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: parsedMenu.name,
    chatBarText: parsedMenu.chat_bar_text,
    areas: parsedMenu.items.map((item, index) => {
      const column = columns[index % 3]!;
      const row = Math.floor(index / 3);
      return {
        bounds: { x: column.x, y: row * 843, width: column.width, height: 843 },
        action:
          item.behavior === "link"
            ? { type: "uri" as const, label: item.label, uri: item.target_url }
            : {
                type: "message" as const,
                label: item.label,
                text: item.trigger_text
              }
      };
    })
  };
}

export interface OperationsStaffMember {
  id: string;
  tenant_id: string;
  display_name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
}

export interface StaffManagementRecord {
  staff_user: StaffUser;
  membership: StaffTenantMembership;
}

export interface AdminStaffMember {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role: StaffRole;
  status: StaffStatus;
  membership_status: StaffMembershipStatus;
  auth_linked: boolean;
  line_linked: boolean;
  last_login_at: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InternalNote {
  id: string;
  tenant_id: string;
  customer_id: string;
  alert_id: string | null;
  author_staff_user_id: string | null;
  body: string;
  mention_staff_user_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ReplyTemplate {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSettings {
  tenant_id: string;
  company_name: string;
  product_name: string;
  accent_preset: WorkspaceAccentPreset;
  sla_minutes: number;
  rich_menu_auto_switch_enabled: boolean;
  customer_status_notifications_enabled: boolean;
  line_experience: LineExperienceSettings;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  tenant_id: string;
  actor_staff_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OperationsSearchResult {
  customers: Customer[];
  messages: Array<{ customer_id: string; message: Message }>;
  notes: Array<{ customer_id: string; note: InternalNote }>;
  alerts: Alert[];
}

export interface OperationsRepository {
  listStaffMembers(tenantId: string): Promise<OperationsStaffMember[]>;
  listStaffManagementRecords(tenantId: string): Promise<StaffManagementRecord[]>;
  createStaffManagementRecord(record: StaffManagementRecord): Promise<StaffManagementRecord>;
  saveStaffManagementRecord(record: StaffManagementRecord): Promise<StaffManagementRecord>;
  searchWorkspace?(tenantId: string, query: string): Promise<OperationsSearchResult>;
  listInternalNotes(tenantId: string, customerId: string): Promise<InternalNote[]>;
  saveInternalNote(note: InternalNote): Promise<InternalNote>;
  listReplyTemplates(tenantId: string): Promise<ReplyTemplate[]>;
  saveReplyTemplate(template: ReplyTemplate): Promise<ReplyTemplate>;
  listReservations(tenantId: string): Promise<Reservation[]>;
  saveReservation(reservation: Reservation): Promise<Reservation>;
  getWorkspaceSettings(tenantId: string): Promise<WorkspaceSettings | null>;
  saveWorkspaceSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings>;
  compareAndSaveWorkspaceSettings(
    settings: WorkspaceSettings,
    expectedUpdatedAt: string | null
  ): Promise<WorkspaceSettings | null>;
  listAuditEvents(tenantId: string, limit?: number): Promise<AuditEvent[]>;
  recordAuditEvent(event: AuditEvent): Promise<AuditEvent>;
}

export const internalNoteInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  alert_id: z.string().trim().min(1).nullable().optional(),
  mention_staff_user_ids: z.array(z.string().trim().min(1)).max(20).default([])
});

export const replyTemplateInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80).default("general"),
  body: z.string().trim().min(1).max(4000),
  is_active: z.boolean().default(true)
});

export const workspaceSettingsInputSchema = z.object({
  company_name: z.string().trim().max(120),
  product_name: z.string().trim().min(1).max(120),
  accent_preset: z.enum(workspaceAccentPresets),
  sla_minutes: z.number().int().min(15).max(43200),
  rich_menu_auto_switch_enabled: z.boolean(),
  customer_status_notifications_enabled: z.boolean(),
  line_experience: lineExperienceSettingsSchema,
  setup_completed: z.boolean()
});

export const staffMemberCreateInputSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  role: z.enum(adminRoles)
});

export const staffMemberUpdateInputSchema = z
  .object({
    display_name: z.string().trim().min(1).max(120).optional(),
    role: z.enum(adminRoles).optional(),
    is_active: z.boolean().optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "変更内容を1つ以上指定してください。"
  });

export class InMemoryOperationsRepository implements OperationsRepository {
  private readonly staff: OperationsStaffMember[];
  private readonly staffManagement = new Map<string, StaffManagementRecord>();
  private readonly notes = new Map<string, InternalNote>();
  private readonly templates = new Map<string, ReplyTemplate>();
  private readonly reservations = new Map<string, Reservation>();
  private readonly settings = new Map<string, WorkspaceSettings>();
  private readonly auditEvents = new Map<string, AuditEvent>();

  constructor(
    input: { staff?: OperationsStaffMember[]; staffManagement?: StaffManagementRecord[] } = {}
  ) {
    this.staff = [...(input.staff ?? [])];
    for (const record of input.staffManagement ?? []) {
      this.staffManagement.set(staffManagementKey(record), structuredClone(record));
    }
  }

  async listStaffMembers(tenantId: string): Promise<OperationsStaffMember[]> {
    const managed = [...this.staffManagement.values()]
      .filter(
        ({ staff_user, membership }) =>
          membership.tenant_id === tenantId &&
          staff_user.is_active &&
          staff_user.status === "active" &&
          Boolean(staff_user.auth_user_id) &&
          membership.status === "active" &&
          Boolean(membership.accepted_at)
      )
      .map(({ staff_user, membership }) => ({
        id: staff_user.id,
        tenant_id: tenantId,
        display_name: staff_user.display_name,
        email: staff_user.email,
        role: membership.role,
        is_active: true
      }));
    const managedIds = new Set(managed.map((member) => member.id));
    return [
      ...this.staff.filter(
        (member) =>
          member.tenant_id === tenantId && member.is_active && !managedIds.has(member.id)
      ),
      ...managed
    ];
  }

  async listStaffManagementRecords(tenantId: string): Promise<StaffManagementRecord[]> {
    return [...this.staffManagement.values()]
      .filter(
        ({ staff_user, membership }) =>
          Boolean(staff_user.id) && membership.tenant_id === tenantId
      )
      .map((record) => structuredClone(record));
  }

  async createStaffManagementRecord(
    record: StaffManagementRecord
  ): Promise<StaffManagementRecord> {
    assertStaffManagementIdentity(record);
    const normalizedEmail = record.staff_user.email.trim().toLowerCase();
    const tenantHasOwner = [...this.staffManagement.values()].some(
      (candidate) =>
        candidate.membership.tenant_id === record.membership.tenant_id &&
        isConfiguredStaffOwner(candidate)
    );
    const requestedRecord: StaffManagementRecord = {
      staff_user: {
        ...structuredClone(record.staff_user),
        role: tenantHasOwner ? record.staff_user.role : "owner"
      },
      membership: {
        ...structuredClone(record.membership),
        role: tenantHasOwner ? record.membership.role : "owner"
      }
    };
    const existingTenantRecord = [...this.staffManagement.values()].find(
      (candidate) =>
        candidate.membership.tenant_id === record.membership.tenant_id &&
        candidate.staff_user.email.trim().toLowerCase() === normalizedEmail
    );
    if (existingTenantRecord) {
      throw new Error("staff_email_already_registered");
    }

    const existingIdentity = [...this.staffManagement.values()]
      .filter(
        (candidate) => candidate.staff_user.email.trim().toLowerCase() === normalizedEmail
      )
      .sort(compareReusableStaffIdentities)[0];
    const acceptedIdentity =
      existingIdentity?.staff_user.auth_user_id &&
      [...this.staffManagement.values()].some(
        (candidate) =>
          candidate.staff_user.id === existingIdentity.staff_user.id &&
          candidate.membership.status === "active" &&
          Boolean(candidate.membership.accepted_at)
      );
    const saved: StaffManagementRecord = existingIdentity
      ? {
          staff_user: {
            ...structuredClone(existingIdentity.staff_user),
            display_name: requestedRecord.staff_user.display_name,
            role: requestedRecord.membership.role
          },
          membership: {
            ...requestedRecord.membership,
            staff_user_id: existingIdentity.staff_user.id,
            status: acceptedIdentity ? "active" : "invited",
            accepted_at: acceptedIdentity ? requestedRecord.membership.created_at : null
          }
        }
      : requestedRecord;

    this.staffManagement.set(staffManagementKey(saved), saved);
    return structuredClone(saved);
  }

  async saveStaffManagementRecord(record: StaffManagementRecord): Promise<StaffManagementRecord> {
    assertStaffManagementIdentity(record);
    const saved = structuredClone(record);
    const current = this.staffManagement.get(staffManagementKey(saved));
    if (
      current &&
      ((isConfiguredStaffOwner(current) &&
        !isConfiguredStaffOwner(saved) &&
        [...this.staffManagement.values()].filter(
          (candidate) =>
            candidate.membership.tenant_id === saved.membership.tenant_id &&
            isConfiguredStaffOwner(candidate)
        ).length <= 1) ||
        (isActiveStaffOwner(current) &&
          !isActiveStaffOwner(saved) &&
          [...this.staffManagement.values()].filter(
            (candidate) =>
              candidate.membership.tenant_id === saved.membership.tenant_id &&
              isActiveStaffOwner(candidate)
          ).length <= 1))
    ) {
      throw new Error("last_owner_must_remain_active");
    }
    if (
      saved.staff_user.auth_user_id &&
      [...this.staffManagement.values()].some(
        (candidate) =>
          candidate.staff_user.id !== saved.staff_user.id &&
          candidate.staff_user.auth_user_id === saved.staff_user.auth_user_id
      )
    ) {
      throw new Error("staff_auth_user_already_linked");
    }
    for (const [key, candidate] of this.staffManagement.entries()) {
      if (candidate.staff_user.id === saved.staff_user.id) {
        this.staffManagement.set(key, {
          staff_user: {
            ...structuredClone(saved.staff_user),
            display_name: candidate.staff_user.display_name,
            role: candidate.membership.role
          },
          membership: candidate.membership
        });
      }
    }
    this.staffManagement.set(staffManagementKey(saved), saved);
    return structuredClone(saved);
  }

  async listInternalNotes(tenantId: string, customerId: string): Promise<InternalNote[]> {
    return [...this.notes.values()]
      .filter((note) => note.tenant_id === tenantId && note.customer_id === customerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async saveInternalNote(note: InternalNote): Promise<InternalNote> {
    this.notes.set(note.id, note);
    return note;
  }

  async listReplyTemplates(tenantId: string): Promise<ReplyTemplate[]> {
    return [...this.templates.values()]
      .filter((template) => template.tenant_id === tenantId && template.is_active)
      .sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }

  async saveReplyTemplate(template: ReplyTemplate): Promise<ReplyTemplate> {
    this.templates.set(template.id, template);
    return template;
  }

  async listReservations(tenantId: string): Promise<Reservation[]> {
    return [...this.reservations.values()]
      .filter((reservation) => reservation.tenant_id === tenantId)
      .sort((a, b) =>
        (a.confirmed_start_at ?? a.created_at).localeCompare(b.confirmed_start_at ?? b.created_at)
      );
  }

  async saveReservation(reservation: Reservation): Promise<Reservation> {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  async getWorkspaceSettings(tenantId: string): Promise<WorkspaceSettings | null> {
    return this.settings.get(tenantId) ?? null;
  }

  async saveWorkspaceSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    this.settings.set(settings.tenant_id, settings);
    return settings;
  }

  async compareAndSaveWorkspaceSettings(
    settings: WorkspaceSettings,
    expectedUpdatedAt: string | null
  ): Promise<WorkspaceSettings | null> {
    const current = this.settings.get(settings.tenant_id);
    if ((current?.updated_at ?? null) !== expectedUpdatedAt) {
      return null;
    }
    this.settings.set(settings.tenant_id, settings);
    return settings;
  }

  async listAuditEvents(tenantId: string, limit = 100): Promise<AuditEvent[]> {
    return [...this.auditEvents.values()]
      .filter((event) => event.tenant_id === tenantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async recordAuditEvent(event: AuditEvent): Promise<AuditEvent> {
    this.auditEvents.set(event.id, event);
    return event;
  }
}

function staffManagementKey(record: StaffManagementRecord): string {
  return `${record.membership.tenant_id}:${record.staff_user.id}`;
}

function compareReusableStaffIdentities(
  left: StaffManagementRecord,
  right: StaffManagementRecord
): number {
  const authLinkOrder = Number(Boolean(right.staff_user.auth_user_id)) -
    Number(Boolean(left.staff_user.auth_user_id));
  if (authLinkOrder !== 0) {
    return authLinkOrder;
  }

  return (
    left.staff_user.created_at.localeCompare(right.staff_user.created_at) ||
    left.staff_user.id.localeCompare(right.staff_user.id)
  );
}

function isConfiguredStaffOwner(record: StaffManagementRecord): boolean {
  return (
    record.staff_user.status !== "archived" &&
    record.membership.status !== "archived" &&
    record.membership.status !== "disabled" &&
    record.membership.role === "owner"
  );
}

function isActiveStaffOwner(record: StaffManagementRecord): boolean {
  return (
    record.staff_user.status === "active" &&
    record.staff_user.is_active &&
    Boolean(record.staff_user.auth_user_id) &&
    record.membership.status === "active" &&
    Boolean(record.membership.accepted_at) &&
    record.membership.role === "owner"
  );
}

function assertStaffManagementIdentity(record: StaffManagementRecord): void {
  if (record.staff_user.id !== record.membership.staff_user_id) {
    throw new Error("Staff management identity mismatch.");
  }
}
