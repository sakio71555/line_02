import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "./_components/admin-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "顧客対応デスク",
  description: "LINE相談と顧客対応をまとめて管理する画面"
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
