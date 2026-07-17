"use client";

import { Building2, Check, Circle, ClipboardList, KeyRound, MessageSquareText, ShieldCheck, UsersRound } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import type { AuditEvent, ReplyTemplate, WorkspaceSettings } from "@amami-line-crm/domain";

import { accentPresets, saveTenantBrandProfile, TENANT_BRAND_UPDATED_EVENT, type TenantAccentPreset } from "../../src/tenant-brand";
import { formatCompactDateTime } from "../../src/admin-display";
import { saveReplyTemplateAction, saveWorkspaceSettingsAction, type SettingsActionState } from "./actions";
import { LineExperienceEditor } from "./line-experience-editor";

const initialState: SettingsActionState = { status: "idle" };

export function SettingsWorkspace({ auditEvents, initialSettings, templates }: { auditEvents: AuditEvent[]; initialSettings: WorkspaceSettings; templates: ReplyTemplate[] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [settingsState, settingsAction, settingsPending] = useActionState(saveWorkspaceSettingsAction, initialState);
  const [templateState, templateAction, templatePending] = useActionState(saveReplyTemplateAction, initialState);

  useEffect(() => {
    if (settingsState.status !== "success") return;
    saveTenantBrandProfile(window.localStorage, { companyName: settings.company_name || settings.product_name, productName: settings.product_name, accentPreset: settings.accent_preset as TenantAccentPreset });
    window.dispatchEvent(new Event(TENANT_BRAND_UPDATED_EVENT));
  }, [settings, settingsState.status]);

  return <div className="settings-form">
    <form action={settingsAction} className="settings-section">
      <header><p className="eyebrow">会社の基本設定</p><h2>表示と対応ルール</h2><p>この会社で使う名称、色、標準の返信期限を設定します。</p></header>
      <input name="line_experience" type="hidden" value={JSON.stringify(settings.line_experience)} />
      <div className="settings-fields settings-fields-two">
        <label><span>会社名</span><input maxLength={120} name="company_name" onChange={(event) => setSettings({ ...settings, company_name: event.target.value })} value={settings.company_name} /></label>
        <label><span>画面名</span><input maxLength={120} name="product_name" onChange={(event) => setSettings({ ...settings, product_name: event.target.value })} value={settings.product_name} /></label>
      </div>
      <fieldset className="color-choice"><legend>画面の色</legend><div>{(Object.entries(accentPresets) as Array<[TenantAccentPreset, (typeof accentPresets)[TenantAccentPreset]]>).map(([key, preset]) => <label className="color-choice-item" key={key}><input checked={settings.accent_preset === key} name="accent_preset" onChange={() => setSettings({ ...settings, accent_preset: key })} type="radio" value={key} /><span className="color-swatch" style={{ backgroundColor: preset.accent }} /><span>{preset.label}</span>{settings.accent_preset === key ? <Check size={17} /> : <Circle size={17} />}</label>)}</div></fieldset>
      <div className="settings-fields settings-fields-two"><label><span>標準の返信期限</span><select name="sla_minutes" onChange={(event) => setSettings({ ...settings, sla_minutes: Number(event.target.value) })} value={settings.sla_minutes}><option value="60">1時間</option><option value="180">3時間</option><option value="360">6時間</option><option value="720">12時間</option><option value="1440">24時間</option><option value="2880">2日</option></select></label></div>
      <div className="settings-subsection">
        <header><p className="eyebrow">お客様のLINE</p><h3>メニューと受付フロー</h3><p>会社ごとにLINEメニューを追加し、各6枠のリンク・案内・質問内容を設定します。</p></header>
        <LineExperienceEditor
          onChange={(lineExperience) => setSettings({ ...settings, line_experience: lineExperience })}
          value={settings.line_experience}
        />
      </div>
      <div className="settings-toggle-list">
        <label><input checked={settings.rich_menu_auto_switch_enabled} name="rich_menu_auto_switch_enabled" onChange={(event) => setSettings({ ...settings, rich_menu_auto_switch_enabled: event.target.checked })} type="checkbox" /><span><strong>顧客段階に合わせてLINEメニューを切り替える</strong><small>顧客詳細で段階を変更した時に適用します。</small></span></label>
        <label><input checked={settings.customer_status_notifications_enabled} name="customer_status_notifications_enabled" onChange={(event) => setSettings({ ...settings, customer_status_notifications_enabled: event.target.checked })} type="checkbox" /><span><strong>お客様への状況通知を利用する</strong><small>送信前の明示確認は常に必要です。</small></span></label>
        <label><input checked={settings.setup_completed} name="setup_completed" onChange={(event) => setSettings({ ...settings, setup_completed: event.target.checked })} type="checkbox" /><span><strong>初期設定を完了にする</strong><small>会社名、担当者、LINE・AI接続の確認後に選びます。</small></span></label>
      </div>
      {settingsState.status === "error" ? <p className="form-error">{settingsState.error}</p> : null}{settingsState.status === "success" ? <p className="form-success">設定を保存しました。</p> : null}
      <button disabled={settingsPending} type="submit">{settingsPending ? "保存中" : "会社設定を保存"}</button>
    </form>

    <section className="settings-section"><header><p className="eyebrow">初期設定</p><h2>利用開始チェック</h2><p>他社へ追加するときも、この3項目を確認すれば開始できます。</p></header>
      <ol className="setup-checklist"><li className={settings.company_name ? "is-done" : ""}><Building2 size={19} /><span><strong>会社の表示</strong><small>会社名と画面色</small></span><Check size={18} /></li><li><UsersRound size={19} /><span><strong>会社と担当者</strong><small>利用会社と権限を確認</small></span><a href="/select-tenant">確認</a></li><li className={settings.setup_completed ? "is-done" : ""}><KeyRound size={19} /><span><strong>LINE・AI接続</strong><small>管理者による接続確認</small></span><Check size={18} /></li></ol>
    </section>

    <section className="settings-section"><header><p className="eyebrow">返信を速くする</p><h2>返信定型文</h2><p>よく使う文章を登録し、顧客詳細から選べるようにします。</p></header>
      <div className="template-grid">{templates.map((template) => <article key={template.id}><MessageSquareText size={18} /><div><strong>{template.title}</strong><small>{template.category}</small><p>{template.body}</p></div></article>)}</div>
      <form action={templateAction} className="template-create-form"><label><span>定型文名</span><input name="title" required placeholder="例：来店予約のご案内" /></label><label><span>分類</span><select name="category"><option value="general">一般</option><option value="reservation">予約</option><option value="aftercare">アフター</option><option value="documents">書類</option></select></label><label className="template-body"><span>返信文</span><textarea name="body" required rows={4} placeholder="お客様へ送る文章" /></label><button disabled={templatePending} type="submit">{templatePending ? "登録中" : "定型文を登録"}</button></form>
      {templateState.status === "error" ? <p className="form-error">{templateState.error}</p> : null}{templateState.status === "success" ? <p className="form-success">定型文を登録しました。</p> : null}
    </section>

    <section className="settings-section"><header><p className="eyebrow">安全管理</p><h2>操作履歴</h2><p>誰が何を変更したかを確認できます。</p></header>
      <div className="audit-list">{auditEvents.length === 0 ? <p className="empty">記録された操作はありません。</p> : auditEvents.map((event) => <article key={event.id}><span><ShieldCheck size={17} /></span><div><strong>{event.summary}</strong><small>{event.action} ・ {formatCompactDateTime(event.created_at)}</small></div></article>)}</div>
      <div className="setup-boundary"><ClipboardList size={18} /><p>秘密情報やLINE本文は監査履歴へ記録しません。業務上必要な変更概要だけを残します。</p></div>
    </section>
  </div>;
}
