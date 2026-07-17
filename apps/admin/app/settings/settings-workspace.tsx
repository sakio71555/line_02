"use client";

import React from "react";

import { ArrowRight, Check, Circle, KeyRound, UsersRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import {
  accentPresets,
  defaultTenantBrand,
  readTenantBrandProfile,
  saveTenantBrandProfile,
  TENANT_BRAND_UPDATED_EVENT,
  type TenantAccentPreset,
  type TenantBrandProfile
} from "../../src/tenant-brand";
export function SettingsWorkspace() {
  const [brand, setBrand] = useState<TenantBrandProfile>(defaultTenantBrand);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBrand(readTenantBrandProfile(window.localStorage));
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = saveTenantBrandProfile(window.localStorage, brand);
    window.dispatchEvent(new Event(TENANT_BRAND_UPDATED_EVENT));
    setBrand(normalized);
    setSaved(true);
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <section className="settings-section">
        <header>
          <p className="eyebrow">共通デザイン</p>
          <h2>会社の表示</h2>
          <p>管理画面に表示する会社名と画面名を設定します。</p>
        </header>
        <div className="settings-fields settings-fields-two">
          <label>
            <span>会社名</span>
            <input
              maxLength={40}
              onChange={(event) => setBrand({ ...brand, companyName: event.target.value })}
              value={brand.companyName}
            />
          </label>
          <label>
            <span>画面名</span>
            <input
              maxLength={40}
              onChange={(event) => setBrand({ ...brand, productName: event.target.value })}
              value={brand.productName}
            />
          </label>
        </div>
        <fieldset className="color-choice">
          <legend>画面の色</legend>
          <div>
            {(Object.entries(accentPresets) as Array<
              [TenantAccentPreset, (typeof accentPresets)[TenantAccentPreset]]
            >).map(([key, preset]) => (
              <label className="color-choice-item" key={key}>
                <input
                  checked={brand.accentPreset === key}
                  name="accentPreset"
                  onChange={() => setBrand({ ...brand, accentPreset: key })}
                  type="radio"
                  value={key}
                />
                <span className="color-swatch" style={{ backgroundColor: preset.accent }} />
                <span>{preset.label}</span>
                {brand.accentPreset === key ? <Check aria-hidden="true" size={17} /> : <Circle aria-hidden="true" size={17} />}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="settings-section">
        <header>
          <p className="eyebrow">新しい会社を追加</p>
          <h2>利用開始までの3ステップ</h2>
          <p>会社ごとに表示とデータを分けて、安全に利用を開始します。</p>
        </header>
        <ol className="onboarding-steps">
          <li>
            <span className="onboarding-step-number">1</span>
            <span className="onboarding-step-main">
              <strong>会社の表示を整える</strong>
              <small>上のフォームで会社名、画面名、色を決めます。</small>
            </span>
            <span className="onboarding-step-state">この画面</span>
          </li>
          <li>
            <span className="onboarding-step-number">2</span>
            <span className="onboarding-step-main">
              <strong>会社と担当者を登録する</strong>
              <small>登録済みの会社から、今回操作する会社を選びます。</small>
            </span>
            <a className="onboarding-step-action" href="/select-tenant">
              会社を選ぶ <ArrowRight aria-hidden="true" size={17} />
            </a>
          </li>
          <li>
            <span className="onboarding-step-number">3</span>
            <span className="onboarding-step-main">
              <strong>LINE・AIを接続する</strong>
              <small>管理者が接続確認を行い、担当者へ利用開始を案内します。</small>
            </span>
            <span className="onboarding-step-state">管理者作業</span>
          </li>
        </ol>
        <div className="setup-boundary setup-boundary-grid">
          <span><UsersRound aria-hidden="true" size={18} /><strong>会社ごとに分離</strong></span>
          <span><KeyRound aria-hidden="true" size={18} /><strong>秘密情報は入力不要</strong></span>
          <p>新しい会社のデータ領域やLINE接続は、権限を持つ管理者が作成します。この画面から任意の会社コードを作ることはできません。</p>
        </div>
      </section>

      {saved ? <div className="settings-success"><Check aria-hidden="true" size={18} />設定を保存しました。</div> : null}

      <div className="settings-save-bar">
        <span>変更はこの管理画面にすぐ反映されます。</span>
        <button type="submit">設定を保存</button>
      </div>
    </form>
  );
}
