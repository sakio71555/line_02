"use client";

import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  MessageCircleReply,
  MessagesSquare,
  Plus,
  Trash2,
  UserRoundCheck
} from "lucide-react";
import { useEffect, useState } from "react";

import type {
  LineConsultationFlowSettings,
  LineExperienceSettings,
  LineFlowConditionOperator,
  LineFlowOptionSettings,
  LineFlowStepSettings,
  LineMenuItemBehavior,
  LineMenuItemSettings,
  LineMenuSettings
} from "@amami-line-crm/domain";

const behaviorOptions: Array<{ value: LineMenuItemBehavior; label: string }> = [
  { value: "link", label: "Webページを開く" },
  { value: "guide", label: "案内を返してWebページを開く" },
  { value: "consultation", label: "質問に沿って相談を受け付ける" },
  { value: "staff_handoff", label: "共通の担当者相談を始める" }
];

const behaviorIcons = {
  link: ExternalLink,
  guide: MessageCircleReply,
  consultation: MessagesSquare,
  staff_handoff: UserRoundCheck
};

const roleOptions = [
  ["staff", "担当者"],
  ["sales", "営業担当"],
  ["designer", "設計担当"],
  ["estimator", "積算担当"],
  ["sales_admin", "営業事務"],
  ["aftercare", "アフター担当"],
  ["site_staff", "現場担当"]
] as const;

const severityOptions = [
  ["low", "低"],
  ["medium", "通常"],
  ["high", "高"],
  ["critical", "至急"]
] as const;

const conditionOperatorOptions: Array<{
  value: LineFlowConditionOperator;
  label: string;
}> = [
  { value: "equals", label: "選んだ場合" },
  { value: "not_equals", label: "選ばなかった場合" },
  { value: "in", label: "いずれかを選んだ場合" },
  { value: "not_in", label: "いずれも選ばなかった場合" }
];

function createInternalId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function createOption(index: number): LineFlowOptionSettings {
  return {
    label: `選択肢 ${index}`,
    value: createInternalId("answer")
  };
}

function createFlowStep(index: number, kind: "choice" | "text" = "choice"): LineFlowStepSettings {
  const options = kind === "choice" ? [createOption(1), createOption(2)] : [];
  return {
    key: createInternalId("question"),
    kind,
    prompt_timeline_body: `質問 ${index} を案内`,
    value_timeline_prefix: `回答 ${index}`,
    prompt_reply: `質問 ${index} を入力してください。`,
    retry_reply: kind === "choice" ? "表示された選択肢から選んでください。" : "内容を入力してください。",
    options,
    condition: null
  };
}

function createFlow(actionKey: string, label: string): LineConsultationFlowSettings {
  return {
    category: actionKey.replaceAll(".", "_"),
    assigned_role: "staff",
    secondary_role: "",
    default_severity: "medium",
    default_priority: "normal",
    ai_auto_reply: false,
    requires_staff_confirmation: true,
    steps: [
      {
        ...createFlowStep(1, "text"),
        prompt_timeline_body: `${label}の内容を質問`,
        value_timeline_prefix: "相談内容",
        prompt_reply: "詳しい内容を入力してください。"
      }
    ]
  };
}

function createMenuItem(menuType: string, index: number): LineMenuItemSettings {
  const label = `新しい項目 ${index}`;
  return {
    action_key: `${menuType}.item_${index}`,
    label,
    behavior: "guide",
    trigger_text: label,
    target_url: "https://example.jp/",
    reply_text: `${label}をご案内します。`,
    timeline_label: `${label}を案内`,
    flow: null
  };
}

function createMenu(menuNumber: number): LineMenuSettings {
  const menuType = createInternalId("menu");
  return {
    menu_type: menuType,
    name: `追加メニュー ${menuNumber}`,
    chat_bar_text: "メニュー",
    items: Array.from({ length: 6 }, (_, index) => createMenuItem(menuType, index + 1))
  };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

export function LineExperienceEditor({
  value,
  onChange
}: {
  value: LineExperienceSettings;
  onChange: (value: LineExperienceSettings) => void;
}) {
  const [activeMenuType, setActiveMenuType] = useState(value.menus[0]?.menu_type ?? "initial");
  const activeMenu =
    value.menus.find((menu) => menu.menu_type === activeMenuType) ?? value.menus[0];

  useEffect(() => {
    if (!value.menus.some((menu) => menu.menu_type === activeMenuType)) {
      setActiveMenuType(value.menus[0]?.menu_type ?? "initial");
    }
  }, [activeMenuType, value.menus]);

  if (!activeMenu) return null;

  const updateMenu = (patch: Partial<LineMenuSettings>) => {
    onChange({
      menus: value.menus.map((menu) =>
        menu.menu_type === activeMenu.menu_type ? { ...menu, ...patch } : menu
      )
    });
  };

  const updateItem = (actionKey: string, patch: Partial<LineMenuItemSettings>) => {
    updateMenu({
      items: activeMenu.items.map((item) =>
        item.action_key === actionKey ? { ...item, ...patch } : item
      )
    });
  };

  const addMenu = () => {
    const menu = createMenu(value.menus.length + 1);
    onChange({ menus: [...value.menus, menu] });
    setActiveMenuType(menu.menu_type);
  };

  const deleteMenu = () => {
    if (value.menus.length <= 1) return;
    const nextMenus = value.menus.filter((menu) => menu.menu_type !== activeMenu.menu_type);
    onChange({ menus: nextMenus });
    setActiveMenuType(nextMenus[0]?.menu_type ?? "initial");
  };

  return (
    <div className="line-experience-editor">
      <div className="line-menu-toolbar">
        <div aria-label="編集するLINEメニュー" className="line-menu-tabs" role="tablist">
          {value.menus.map((menu) => (
            <button
              aria-selected={menu.menu_type === activeMenu.menu_type}
              className={menu.menu_type === activeMenu.menu_type ? "is-active" : ""}
              key={menu.menu_type}
              onClick={() => setActiveMenuType(menu.menu_type)}
              role="tab"
              type="button"
            >
              {menu.name}
            </button>
          ))}
        </div>
        <button className="line-menu-add-button" onClick={addMenu} type="button">
          <Plus size={16} />メニューを追加
        </button>
      </div>

      <div className="line-menu-heading-fields">
        <label>
          <span>メニュー名</span>
          <input
            maxLength={300}
            onChange={(event) => updateMenu({ name: event.target.value })}
            value={activeMenu.name}
          />
        </label>
        <label>
          <span>LINE公開ID（任意）</span>
          <input
            maxLength={160}
            onChange={(event) => updateMenu({ line_rich_menu_id: event.target.value })}
            placeholder="LINE側で公開した後に設定"
            value={activeMenu.line_rich_menu_id ?? ""}
          />
          <small>追加したメニューをお客様へ切り替える時に使います。LINE側で発行されたIDだけを入力します。</small>
        </label>
        <label>
          <span>LINE下部に表示する文字</span>
          <input
            maxLength={14}
            onChange={(event) => updateMenu({ chat_bar_text: event.target.value })}
            value={activeMenu.chat_bar_text}
          />
        </label>
      </div>

      <section aria-label={`${activeMenu.name}の6枠プレビュー`} className="line-menu-preview">
        <header>
          <div>
            <strong>LINEメニューの見え方</strong>
            <small>上段左から順に、LINE上の6枠へ表示されます。</small>
          </div>
          <span>{activeMenu.chat_bar_text}</span>
        </header>
        <div className="line-menu-preview-grid">
          {activeMenu.items.map((item, index) => (
            <article key={item.action_key}>
              <span>{index + 1}</span>
              <strong>{item.label || "未設定"}</strong>
              <small>{behaviorOptions.find((option) => option.value === item.behavior)?.label}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="line-menu-items">
        {activeMenu.items.map((item, index) => (
          <MenuItemEditor
            index={index}
            item={item}
            key={item.action_key}
            onChange={(patch) => updateItem(item.action_key, patch)}
          />
        ))}
      </div>

      <div className="line-menu-danger-zone">
        <div>
          <strong>このメニューを削除</strong>
          <small>最低1つのメニューは必要です。削除後は元に戻せません。</small>
        </div>
        <button disabled={value.menus.length <= 1} onClick={deleteMenu} type="button">
          <Trash2 size={16} />削除
        </button>
      </div>

      <div className="line-menu-note">
        <p>保存すると、各会社のLINE案内と質問フローに反映されます。現在のアマミホームの3メニューと質問内容は初期値として保持されています。</p>
        <p>メニュー画像の作成とLINEへの公開は管理者作業です。ここでは、6枠の動きと質問内容を会社ごとに管理します。</p>
      </div>
    </div>
  );
}

function MenuItemEditor({
  index,
  item,
  onChange
}: {
  index: number;
  item: LineMenuItemSettings;
  onChange: (patch: Partial<LineMenuItemSettings>) => void;
}) {
  const Icon = behaviorIcons[item.behavior];

  const changeBehavior = (behavior: LineMenuItemBehavior) => {
    if (behavior === "consultation") {
      onChange({ behavior, flow: item.flow ?? createFlow(item.action_key, item.label) });
      return;
    }
    onChange({ behavior, flow: null });
  };

  return (
    <details className="line-menu-item" open={index === 0}>
      <summary>
        <span className="line-menu-item-number">{index + 1}</span>
        <span>
          <strong>{item.label}</strong>
          <small>{behaviorOptions.find((option) => option.value === item.behavior)?.label}</small>
        </span>
        <Icon aria-hidden="true" size={18} />
      </summary>

      <div className="line-menu-item-fields">
        <label>
          <span>ボタンに表示する文字</span>
          <input
            maxLength={20}
            onChange={(event) => onChange({ label: event.target.value })}
            value={item.label}
          />
        </label>
        <label>
          <span>押したときの動き</span>
          <select
            onChange={(event) => changeBehavior(event.target.value as LineMenuItemBehavior)}
            value={item.behavior}
          >
            {behaviorOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {item.behavior !== "link" ? (
          <label>
            <span>タップ時にLINEへ送る文字</span>
            <input
              maxLength={300}
              onChange={(event) => onChange({ trigger_text: event.target.value })}
              value={item.trigger_text}
            />
          </label>
        ) : null}

        {item.behavior === "link" || item.behavior === "guide" ? (
          <label>
            <span>開くページのURL</span>
            <input
              inputMode="url"
              onChange={(event) => onChange({ target_url: event.target.value })}
              placeholder="https://example.jp/"
              value={item.target_url}
            />
          </label>
        ) : null}

        {item.behavior !== "link" ? (
          <label className="line-menu-item-reply">
            <span>{item.behavior === "guide" ? "LINEで返す案内文" : "最初にLINEで返す文章"}</span>
            <textarea
              maxLength={2000}
              onChange={(event) => onChange({ reply_text: event.target.value })}
              rows={4}
              value={item.reply_text}
            />
          </label>
        ) : null}

        <label>
          <span>顧客履歴に残す短い名称</span>
          <input
            maxLength={120}
            onChange={(event) => onChange({ timeline_label: event.target.value })}
            value={item.timeline_label}
          />
        </label>

        {item.behavior === "consultation" && item.flow ? (
          <FlowEditor flow={item.flow} onChange={(flow) => onChange({ flow })} />
        ) : null}

        {item.behavior === "staff_handoff" ? (
          <p className="line-menu-field-note line-menu-item-reply">会社共通の担当者相談フローを開始します。個別の質問を作る場合は「質問に沿って相談を受け付ける」を選んでください。</p>
        ) : null}
      </div>
    </details>
  );
}

function FlowEditor({
  flow,
  onChange
}: {
  flow: LineConsultationFlowSettings;
  onChange: (flow: LineConsultationFlowSettings) => void;
}) {
  const updateStep = (stepIndex: number, patch: Partial<LineFlowStepSettings>) => {
    onChange({
      ...flow,
      steps: flow.steps.map((step, index) => index === stepIndex ? { ...step, ...patch } : step)
    });
  };

  const removeStep = (stepIndex: number) => {
    if (flow.steps.length <= 1) return;
    const removedKey = flow.steps[stepIndex]?.key;
    if (!removedKey) return;
    onChange({
      ...flow,
      steps: flow.steps
        .filter((_, index) => index !== stepIndex)
        .map((step) => step.condition?.field_key === removedKey ? { ...step, condition: null } : step)
    });
  };

  return (
    <section className="line-flow-editor line-menu-item-reply">
      <header>
        <div>
          <strong>質問フロー</strong>
          <small>お客様に聞く順番と、担当者へ渡す条件を設定します。</small>
        </div>
      </header>

      <div className="line-flow-routing">
        <label>
          <span>主担当</span>
          <select value={flow.assigned_role} onChange={(event) => onChange({ ...flow, assigned_role: event.target.value })}>
            {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>共有先（任意）</span>
          <select value={flow.secondary_role ?? ""} onChange={(event) => onChange({ ...flow, secondary_role: event.target.value })}>
            <option value="">なし</option>
            {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>標準の緊急度</span>
          <select value={flow.default_severity} onChange={(event) => onChange({ ...flow, default_severity: event.target.value as LineConsultationFlowSettings["default_severity"] })}>
            {severityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="line-flow-checkbox">
          <input checked={flow.default_priority === "high"} onChange={(event) => onChange({ ...flow, default_priority: event.target.checked ? "high" : "normal" })} type="checkbox" />
          <span>優先対応として担当者へ知らせる</span>
        </label>
      </div>

      <div className="line-flow-steps">
        {flow.steps.map((step, stepIndex) => (
          <FlowStepEditor
            index={stepIndex}
            key={step.key}
            onChange={(patch) => updateStep(stepIndex, patch)}
            onMoveDown={() => onChange({ ...flow, steps: moveItem(flow.steps, stepIndex, stepIndex + 1) })}
            onMoveUp={() => onChange({ ...flow, steps: moveItem(flow.steps, stepIndex, stepIndex - 1) })}
            onRemove={() => removeStep(stepIndex)}
            previousSteps={flow.steps.slice(0, stepIndex)}
            step={step}
            totalSteps={flow.steps.length}
          />
        ))}
      </div>

      <button className="line-flow-add-question" onClick={() => onChange({ ...flow, steps: [...flow.steps, createFlowStep(flow.steps.length + 1)] })} type="button">
        <Plus size={16} />質問を追加
      </button>
    </section>
  );
}

function FlowStepEditor({
  index,
  step,
  previousSteps,
  totalSteps,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove
}: {
  index: number;
  step: LineFlowStepSettings;
  previousSteps: LineFlowStepSettings[];
  totalSteps: number;
  onChange: (patch: Partial<LineFlowStepSettings>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const sourceStep = previousSteps.find((candidate) => candidate.key === step.condition?.field_key);
  const availableConditionOptions = sourceStep?.options ?? [];

  const changeKind = (kind: "choice" | "text") => {
    onChange({ kind, options: kind === "choice" ? [createOption(1), createOption(2)] : [] });
  };

  const updateOption = (optionIndex: number, patch: Partial<LineFlowOptionSettings>) => {
    onChange({
      options: step.options.map((option, index) => index === optionIndex ? { ...option, ...patch } : option)
    });
  };

  const enableCondition = () => {
    const source = [...previousSteps].reverse().find((candidate) => candidate.kind === "choice");
    const firstOption = source?.options[0];
    if (!source || !firstOption) return;
    onChange({ condition: { field_key: source.key, operator: "equals", values: [firstOption.value] } });
  };

  return (
    <article className="line-flow-step">
      <header>
        <div><span>{index + 1}</span><strong>質問 {index + 1}</strong></div>
        <div className="line-flow-step-actions">
          <button aria-label="質問を上へ" disabled={index === 0} onClick={onMoveUp} type="button"><ArrowUp size={15} /></button>
          <button aria-label="質問を下へ" disabled={index === totalSteps - 1} onClick={onMoveDown} type="button"><ArrowDown size={15} /></button>
          <button aria-label="質問を削除" disabled={totalSteps <= 1} onClick={onRemove} type="button"><Trash2 size={15} /></button>
        </div>
      </header>

      <div className="line-flow-step-fields">
        <label className="line-flow-wide-field">
          <span>LINEで表示する質問</span>
          <textarea rows={3} value={step.prompt_reply} onChange={(event) => onChange({ prompt_reply: event.target.value, prompt_timeline_body: event.target.value.slice(0, 300) || `質問 ${index + 1}` })} />
        </label>
        <label>
          <span>答え方</span>
          <select value={step.kind} onChange={(event) => changeKind(event.target.value as "choice" | "text")}>
            <option value="choice">選択肢から選ぶ</option>
            <option value="text">自由に入力する</option>
          </select>
        </label>
        <label>
          <span>履歴に表示する項目名</span>
          <input maxLength={120} value={step.value_timeline_prefix} onChange={(event) => onChange({ value_timeline_prefix: event.target.value })} />
        </label>
      </div>

      {step.kind === "choice" ? (
        <div className="line-flow-options">
          <strong>選択肢</strong>
          {step.options.map((option, optionIndex) => (
            <div key={option.value}>
              <input aria-label={`選択肢 ${optionIndex + 1}`} maxLength={120} value={option.label} onChange={(event) => updateOption(optionIndex, { label: event.target.value, notification_label: event.target.value })} />
              <button aria-label="選択肢を削除" disabled={step.options.length <= 1} onClick={() => onChange({ options: step.options.filter((_, index) => index !== optionIndex) })} type="button"><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={() => onChange({ options: [...step.options, createOption(step.options.length + 1)] })} type="button"><Plus size={15} />選択肢を追加</button>
        </div>
      ) : null}

      {previousSteps.some((candidate) => candidate.kind === "choice") ? (
        <div className="line-flow-condition">
          <label className="line-flow-checkbox">
            <input checked={Boolean(step.condition)} onChange={(event) => event.target.checked ? enableCondition() : onChange({ condition: null })} type="checkbox" />
            <span>前の回答によって、この質問を出し分ける</span>
          </label>
          {step.condition ? (
            <div className="line-flow-condition-fields">
              <label>
                <span>どの質問の回答を見るか</span>
                <select value={step.condition.field_key} onChange={(event) => {
                  const source = previousSteps.find((candidate) => candidate.key === event.target.value);
                  onChange({ condition: { ...step.condition!, field_key: event.target.value, values: source?.options[0] ? [source.options[0].value] : [] } });
                }}>
                  {previousSteps.filter((candidate) => candidate.kind === "choice").map((candidate, previousIndex) => <option key={candidate.key} value={candidate.key}>質問 {previousIndex + 1}</option>)}
                </select>
              </label>
              <label>
                <span>条件</span>
                <select value={step.condition.operator} onChange={(event) => onChange({ condition: { ...step.condition!, operator: event.target.value as LineFlowConditionOperator } })}>
                  {conditionOperatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <fieldset>
                <legend>対象の回答</legend>
                {availableConditionOptions.map((option) => (
                  <label key={option.value}>
                    <input
                      checked={step.condition?.values.includes(option.value) ?? false}
                      onChange={(event) => {
                        const values = event.target.checked
                          ? [...(step.condition?.values ?? []), option.value]
                          : (step.condition?.values ?? []).filter((value) => value !== option.value);
                        if (values.length > 0) onChange({ condition: { ...step.condition!, values } });
                      }}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
