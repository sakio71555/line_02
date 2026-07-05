import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "./_components/admin-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amami LINE CRM Admin",
  description: "LINE相談を確認して返信する管理画面"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
