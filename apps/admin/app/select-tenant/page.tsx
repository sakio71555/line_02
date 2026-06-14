import React from "react";

import { AuthPlaceholderPage } from "../auth-placeholder-page";

export default function SelectTenantPlaceholderPage() {
  return (
    <AuthPlaceholderPage
      eyebrow="Auth placeholder"
      title="テナント選択"
      description="将来、staffが複数tenantに所属する場合に選択する画面です。現時点ではtenant一覧取得も選択保存も行いません。"
      notes={[
        "選択tenantは将来、active membershipで再検証してから採用します。",
        "現在はtenant_amamihomeをdev-only MVP確認用tenantとして扱います。",
        "Admin APIへのtenant一覧取得requestは行いません。",
        "cookie、session、localStorage、sessionStorageへのtenant保存は行いません。"
      ]}
      links={[
        { href: "/customers", label: "tenant_amamihomeで顧客一覧へ進む" },
        { href: "/alerts", label: "tenant_amamihomeでアラートへ進む" },
        { href: "/login", label: "ログインplaceholder" },
        { href: "/permission-denied", label: "権限不足placeholder" }
      ]}
    />
  );
}
