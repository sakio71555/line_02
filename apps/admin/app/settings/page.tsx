import { Building2, Palette, ShieldCheck } from "lucide-react";

import { PageTitle } from "../_components/ui";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { getAdminAuditEvents, getAdminReplyTemplates, getAdminWorkspaceSettings } from "../../src/admin-api";
import { SettingsWorkspace } from "./settings-workspace";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const options = await getServerAdminApiRequestOptions();
  const [settingsResult, templatesResult, auditResult] = await Promise.allSettled([
    getAdminWorkspaceSettings(options), getAdminReplyTemplates(options), getAdminAuditEvents(30, options)
  ]);
  const settings = settingsResult.status === "fulfilled" ? settingsResult.value.settings : null;
  const settingsVersion = settingsResult.status === "fulfilled" ? settingsResult.value.settings_version : null;
  const templates = templatesResult.status === "fulfilled" ? templatesResult.value.templates : [];
  const auditEvents = auditResult.status === "fulfilled" ? auditResult.value.events : [];

  return <main><PageTitle eyebrow="管理画面設定" title="設定" description="会社の表示、対応ルール、返信定型文、操作履歴を管理します。" />
    <section className="settings-intro" aria-label="設定できる内容">
      <div><Palette size={20} /><span><strong>ブランド</strong><small>会社名と画面色</small></span></div>
      <div><Building2 size={20} /><span><strong>会社追加</strong><small>準備状況を確認</small></span></div>
      <div><ShieldCheck size={20} /><span><strong>安全</strong><small>操作履歴を記録</small></span></div>
    </section>
    {!settings ? <div className="inline-error">保存済み設定を読み込めませんでした。</div> : <SettingsWorkspace auditEvents={auditEvents} initialSettings={settings} settingsVersion={settingsVersion} templates={templates} />}
  </main>;
}
