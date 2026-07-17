"use client";

import {
  BriefcaseBusiness,
  CheckSquare2,
  ChevronRight,
  House,
  Inbox,
  LogOut,
  SendHorizontal,
  Settings,
  UsersRound
} from "lucide-react";
import React, { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  accentPresets,
  defaultTenantBrand,
  readTenantBrandProfile,
  TENANT_BRAND_UPDATED_EVENT,
  type TenantBrandProfile
} from "../../src/tenant-brand";

const navItems = [
  { href: "/", icon: House, label: "ホーム" },
  { href: "/inbox", icon: Inbox, label: "受信トレイ" },
  { href: "/customers", icon: UsersRound, label: "顧客" },
  { href: "/tasks", icon: CheckSquare2, label: "タスク" },
  { href: "/broadcast", icon: SendHorizontal, label: "一斉送信" },
  { href: "/deals", icon: BriefcaseBusiness, label: "案件" },
  { href: "/settings", icon: Settings, label: "設定" }
] as const;

const navGroups = [
  {
    label: "対応",
    items: navItems.filter((item) => ["/", "/inbox", "/tasks"].includes(item.href))
  },
  {
    label: "顧客管理",
    items: navItems.filter((item) => ["/customers", "/deals", "/broadcast"].includes(item.href))
  },
  {
    label: "運用設定",
    items: navItems.filter((item) => item.href === "/settings")
  }
] as const;

const mobileNavItems = navItems.filter((item) =>
  ["/", "/inbox", "/customers", "/tasks", "/broadcast"].includes(item.href)
);
const hideChromePaths = new Set(["/login", "/logout", "/line/customer-registration"]);

export function AdminShell({ children }: { children: ReactNode }) {
  return <AdminShellView pathname={usePathname() ?? "/"}>{children}</AdminShellView>;
}

export function AdminShellView({
  brand: providedBrand,
  children,
  pathname
}: {
  brand?: TenantBrandProfile;
  children: ReactNode;
  pathname: string;
}) {
  const [brand, setBrand] = useState(providedBrand ?? defaultTenantBrand);
  const shouldShowChrome = !hideChromePaths.has(pathname);

  useEffect(() => {
    if (providedBrand) return;

    const refreshBrand = () => setBrand(readTenantBrandProfile(window.localStorage));
    refreshBrand();
    window.addEventListener(TENANT_BRAND_UPDATED_EVENT, refreshBrand);
    return () => window.removeEventListener(TENANT_BRAND_UPDATED_EVENT, refreshBrand);
  }, [providedBrand]);

  const accent = accentPresets[brand.accentPreset];
  const style = {
    "--admin-accent": accent.accent,
    "--admin-accent-strong": accent.accentStrong
  } as CSSProperties;

  if (!shouldShowChrome) {
    return <div className="admin-app-shell admin-app-shell-auth">{children}</div>;
  }

  return (
    <div className="admin-app-shell" style={style}>
      <DesktopNavigation brand={brand} pathname={pathname} />
      <div className="admin-main-column">
        <DesktopTopbar brand={brand} pathname={pathname} />
        <MobileHeader brand={brand} />
        {children}
      </div>
      <MobileBottomNavigation pathname={pathname} />
    </div>
  );
}

function BrandLockup({ brand }: { brand: TenantBrandProfile }) {
  return (
    <span className="admin-brand-lockup">
      <span className="admin-brand-mark" aria-hidden="true">
        {brand.companyName.slice(0, 1)}
      </span>
      <span>
        <strong>{brand.companyName}</strong>
        <small>{brand.productName}</small>
      </span>
    </span>
  );
}

function DesktopNavigation({ brand, pathname }: { brand: TenantBrandProfile; pathname: string }) {
  return (
    <aside className="admin-sidebar" aria-label="管理画面ナビゲーション">
      <a className="admin-brand" href="/">
        <BrandLockup brand={brand} />
      </a>
      <nav className="admin-desktop-nav" aria-label="主要メニュー">
        {navGroups.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <p className="admin-nav-group-title">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                  className="admin-nav-link"
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" size={19} strokeWidth={2} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <a className="admin-logout-link" href="/logout">
          <LogOut aria-hidden="true" size={18} />
          ログアウト
        </a>
      </div>
    </aside>
  );
}

function DesktopTopbar({ brand, pathname }: { brand: TenantBrandProfile; pathname: string }) {
  const currentItem = navItems.find((item) => isActivePath(pathname, item.href)) ?? navItems[0];

  return (
    <header className="admin-desktop-topbar">
      <div className="admin-desktop-context" aria-label="現在位置">
        <span>{brand.productName}</span>
        <ChevronRight aria-hidden="true" size={15} />
        <strong>{currentItem.label}</strong>
      </div>
      <nav className="admin-topbar-actions" aria-label="すぐに使う操作">
        <a href="/inbox">
          <Inbox aria-hidden="true" size={18} />
          <span>受信トレイ</span>
        </a>
        <a href="/settings" aria-label="設定を開く" title="設定">
          <Settings aria-hidden="true" size={19} />
        </a>
      </nav>
    </header>
  );
}

function MobileHeader({ brand }: { brand: TenantBrandProfile }) {
  return (
    <header className="admin-mobile-header">
      <a className="admin-brand" href="/">
        <BrandLockup brand={brand} />
      </a>
      <a className="admin-mobile-settings" href="/settings" aria-label="設定を開く">
        <Settings aria-hidden="true" size={21} />
      </a>
    </header>
  );
}

function MobileBottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav className="admin-bottom-nav" aria-label="スマートフォン用メニュー">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <a
            aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
            className="admin-bottom-nav-link"
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" className="admin-bottom-nav-icon" size={22} strokeWidth={2} />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/inbox" && pathname === "/alerts") return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
