import { Building2, Palette, ShieldCheck } from "lucide-react";

import { PageTitle } from "../_components/ui";
import { SettingsWorkspace } from "./settings-workspace";

export default function SettingsPage() {
  return (
    <main>
      <PageTitle
        eyebrow="管理画面設定"
        title="設定"
        description="会社らしい見た目を整え、新しい会社の利用準備を進めます。"
      />

      <section className="settings-intro" aria-label="設定できる内容">
        <div>
          <Palette aria-hidden="true" size={20} />
          <span><strong>ブランド</strong><small>会社名と画面色</small></span>
        </div>
        <div>
          <Building2 aria-hidden="true" size={20} />
          <span><strong>会社追加</strong><small>3ステップで準備</small></span>
        </div>
        <div>
          <ShieldCheck aria-hidden="true" size={20} />
          <span><strong>安全</strong><small>秘密情報は保存しません</small></span>
        </div>
      </section>

      <SettingsWorkspace />
    </main>
  );
}
