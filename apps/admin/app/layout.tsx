import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "./_components/admin-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amami LINE CRM Admin",
  description: "AI顧客カルテ付きLINE相談CRMの管理画面"
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
