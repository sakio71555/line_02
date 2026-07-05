"use client";

import React, { type ReactNode } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/customers", label: "お客様" },
  { href: "/alerts", label: "未対応" },
  { href: "/select-tenant", label: "会社選択" }
] as const;

const hideChromePaths = new Set(["/login", "/logout", "/line/customer-registration"]);

export function AdminShell({ children }: { children: ReactNode }) {
  return <AdminShellView pathname={usePathname() ?? "/"}>{children}</AdminShellView>;
}

export function AdminShellView({
  children,
  pathname
}: {
  children: ReactNode;
  pathname: string;
}) {
  const shouldShowChrome = !hideChromePaths.has(pathname);

  return (
    <div className={shouldShowChrome ? "admin-app-shell" : "admin-app-shell admin-app-shell-auth"}>
      {shouldShowChrome ? <DesktopNavigation pathname={pathname} /> : null}
      {children}
      {shouldShowChrome ? <MobileBottomNavigation pathname={pathname} /> : null}
    </div>
  );
}

function DesktopNavigation({ pathname }: { pathname: string }) {
  return (
    <header className="admin-topbar" aria-label="管理画面ナビゲーション">
      <a className="admin-brand" href="/">
        <span className="admin-brand-mark" aria-hidden="true">
          A
        </span>
        <span>
          <strong>アマミホーム管理画面</strong>
          <small>LINE相談を確認・返信</small>
        </span>
      </a>
      <nav className="admin-desktop-nav" aria-label="主要メニュー">
        {navItems.map((item) => (
          <a
            aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
            className="admin-nav-link"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <a className="admin-logout-link" href="/logout">
        ログアウト
      </a>
    </header>
  );
}

function MobileBottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav className="admin-bottom-nav" aria-label="スマートフォン用メニュー">
      {navItems.map((item) => (
        <a
          aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
          className="admin-bottom-nav-link"
          href={item.href}
          key={item.href}
        >
          <span className="admin-bottom-nav-icon" aria-hidden="true">
            {item.label.slice(0, 1)}
          </span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
