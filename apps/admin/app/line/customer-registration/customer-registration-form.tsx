"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";

type FormMode = "customer_registration" | "contact_change";
type LoadStatus = "idle" | "loading" | "ready" | "confirming" | "submitting" | "success" | "error";

interface LiffProfile {
  displayName?: string;
}

interface LiffSdk {
  init(input: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(input?: { redirectUri?: string }): void;
  getProfile(): Promise<LiffProfile>;
  getIDToken(): string | null;
}

declare global {
  interface Window {
    liff?: LiffSdk;
  }
}

interface CustomerProfileFormState {
  displayName: string;
  phone: string;
  postalCode: string;
  address: string;
  email: string;
  consultationType: string;
  consultationBody: string;
  preferredContactMethod: string;
  preferredContactTime: string;
  notes: string;
}

const consultationTypeOptions = [
  "家づくりについて",
  "モデルハウス見学について",
  "資料請求について",
  "費用・ローンについて",
  "その他"
] as const;

const contactMethodOptions = ["LINE", "電話", "メール", "どれでもよい"] as const;

const initialFormState: CustomerProfileFormState = {
  displayName: "",
  phone: "",
  postalCode: "",
  address: "",
  email: "",
  consultationType: consultationTypeOptions[0],
  consultationBody: "",
  preferredContactMethod: contactMethodOptions[0],
  preferredContactTime: "",
  notes: ""
};

export function CustomerRegistrationForm({ mode }: { mode: FormMode }) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerProfileFormState>(initialFormState);
  const labels = useMemo(() => getModeLabels(mode), [mode]);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/u, "") ?? "";
  const canRenderForm = status === "ready" || (status === "error" && Boolean(idToken));

  useEffect(() => {
    if (!scriptLoaded || status !== "idle") {
      return;
    }

    void initializeLiff();

    async function initializeLiff() {
      let liffId: string | null = null;

      try {
        const configResponse = await fetch(`${apiBaseUrl}/api/liff/runtime-config`, {
          cache: "no-store"
        });

        if (configResponse.ok) {
          const configBody = (await configResponse.json()) as {
            liff_id?: unknown;
            liff_id_configured?: unknown;
          };

          liffId = typeof configBody.liff_id === "string" ? configBody.liff_id.trim() : null;
        }
      } catch {
        liffId = null;
      }

      if (!liffId) {
        setStatus("error");
        setErrorMessage("LIFF IDが未設定です。管理者へお知らせください。");
        return;
      }

      if (!window.liff) {
        setStatus("error");
        setErrorMessage("LIFFの読み込みに失敗しました。LINEアプリから開き直してください。");
        return;
      }

      try {
        setStatus("loading");
        await window.liff.init({ liffId });

        if (!window.liff.isLoggedIn()) {
          window.liff.login({ redirectUri: window.location.href });
          return;
        }

        const [profile, token] = await Promise.all([
          window.liff.getProfile(),
          Promise.resolve(window.liff.getIDToken())
        ]);

        if (!token) {
          throw new Error("id_token_unavailable");
        }

        setIdToken(token);
        setForm((current) => ({
          ...current,
          displayName: current.displayName || profile.displayName || ""
        }));
        setStatus("ready");
      } catch {
        setStatus("error");
        setErrorMessage("本人確認に失敗しました。LINEアプリから開き直してください。");
      }
    }
  }, [apiBaseUrl, scriptLoaded, status]);

  function updateField(field: keyof CustomerProfileFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function validateForm(): string | null {
    if (!form.displayName.trim()) {
      return "お名前を入力してください。";
    }

    if (!form.phone.trim()) {
      return "電話番号を入力してください。";
    }

    if (!form.address.trim()) {
      return "住所またはエリアを入力してください。";
    }

    if (mode === "customer_registration" && !form.consultationBody.trim()) {
      return "相談内容を入力してください。";
    }

    return null;
  }

  function handleConfirm() {
    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      setStatus("error");
      return;
    }

    setErrorMessage(null);
    setStatus("confirming");
  }

  async function handleSubmit() {
    if (!idToken) {
      setErrorMessage("本人確認情報を取得できませんでした。LINEアプリから開き直してください。");
      setStatus("error");
      return;
    }

    try {
      setStatus("submitting");
      const response = await fetch(`${apiBaseUrl}/api/liff/customer-profile`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          id_token: idToken,
          mode,
          display_name: form.displayName,
          phone: form.phone,
          postal_code: form.postalCode,
          address: form.address,
          email: form.email,
          consultation_type: form.consultationType,
          consultation_body:
            mode === "customer_registration" ? form.consultationBody : form.notes,
          preferred_contact_method: form.preferredContactMethod,
          preferred_contact_time: form.preferredContactTime,
          notes: form.notes
        })
      });

      if (!response.ok) {
        throw new Error("submit_failed");
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("登録に失敗しました。少し時間をおいて再度お試しください。");
    }
  }

  return (
    <>
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <main className="liff-form-page">
        <section className="liff-form-panel" aria-labelledby="liff-form-title">
          <p className="eyebrow">アマミホーム LINE</p>
          <h1 id="liff-form-title">{labels.title}</h1>
          <p className="meta">{labels.description}</p>

          {status === "loading" || status === "idle" ? (
            <div className="notice">LINE本人確認を確認しています。</div>
          ) : null}

          {status === "error" && errorMessage ? (
            <div className="error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {status === "success" ? (
            <div className="notice liff-success-panel">
              <h2>登録しました</h2>
              <p>入力内容をCRMへ反映しました。担当者が内容を確認します。</p>
            </div>
          ) : null}

          {canRenderForm ? (
            <LiffFormFields
              form={form}
              labels={labels}
              mode={mode}
              onConfirm={handleConfirm}
              onUpdate={updateField}
            />
          ) : null}

          {status === "confirming" || status === "submitting" ? (
            <ConfirmationView
              form={form}
              labels={labels}
              mode={mode}
              onBack={() => setStatus("ready")}
              onSubmit={handleSubmit}
              submitting={status === "submitting"}
            />
          ) : null}
        </section>
      </main>
    </>
  );
}

function LiffFormFields({
  form,
  labels,
  mode,
  onConfirm,
  onUpdate
}: {
  form: CustomerProfileFormState;
  labels: ReturnType<typeof getModeLabels>;
  mode: FormMode;
  onConfirm: () => void;
  onUpdate: (field: keyof CustomerProfileFormState, value: string) => void;
}) {
  return (
    <form className="liff-form" onSubmit={(event) => event.preventDefault()}>
      <label>
        お名前
        <input
          autoComplete="name"
          value={form.displayName}
          onChange={(event) => onUpdate("displayName", event.currentTarget.value)}
        />
      </label>
      <label>
        電話番号
        <input
          autoComplete="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(event) => onUpdate("phone", event.currentTarget.value)}
        />
      </label>
      <label>
        郵便番号
        <input
          autoComplete="postal-code"
          inputMode="numeric"
          value={form.postalCode}
          onChange={(event) => onUpdate("postalCode", event.currentTarget.value)}
        />
      </label>
      <label>
        住所またはエリア
        <input
          autoComplete="street-address"
          value={form.address}
          onChange={(event) => onUpdate("address", event.currentTarget.value)}
        />
      </label>
      <label>
        メールアドレス
        <input
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={(event) => onUpdate("email", event.currentTarget.value)}
        />
      </label>
      {mode === "customer_registration" ? (
        <>
          <label>
            相談種別
            <select
              value={form.consultationType}
              onChange={(event) => onUpdate("consultationType", event.currentTarget.value)}
            >
              {consultationTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            相談内容
            <textarea
              rows={5}
              value={form.consultationBody}
              onChange={(event) => onUpdate("consultationBody", event.currentTarget.value)}
            />
          </label>
        </>
      ) : (
        <label>
          備考
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => onUpdate("notes", event.currentTarget.value)}
          />
        </label>
      )}
      <label>
        希望連絡方法
        <select
          value={form.preferredContactMethod}
          onChange={(event) => onUpdate("preferredContactMethod", event.currentTarget.value)}
        >
          {contactMethodOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        連絡希望時間
        <input
          value={form.preferredContactTime}
          placeholder="例: 平日18時以降"
          onChange={(event) => onUpdate("preferredContactTime", event.currentTarget.value)}
        />
      </label>
      <button type="button" onClick={onConfirm}>
        {labels.confirmButton}
      </button>
    </form>
  );
}

function ConfirmationView({
  form,
  labels,
  mode,
  onBack,
  onSubmit,
  submitting
}: {
  form: CustomerProfileFormState;
  labels: ReturnType<typeof getModeLabels>;
  mode: FormMode;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const rows =
    mode === "customer_registration"
      ? [
          ["お名前", form.displayName],
          ["電話番号", form.phone],
          ["住所またはエリア", form.address],
          ["相談種別", form.consultationType],
          ["相談内容", form.consultationBody],
          ["希望連絡方法", form.preferredContactMethod],
          ["連絡希望時間", form.preferredContactTime || "-"]
        ]
      : [
          ["お名前", form.displayName],
          ["電話番号", form.phone],
          ["郵便番号", form.postalCode || "-"],
          ["住所またはエリア", form.address],
          ["メールアドレス", form.email || "-"],
          ["希望連絡方法", form.preferredContactMethod],
          ["連絡希望時間", form.preferredContactTime || "-"],
          ["備考", form.notes || "-"]
        ];

  return (
    <div className="liff-confirmation">
      <h2>登録前の確認</h2>
      <p className="meta">{labels.confirmDescription}</p>
      <dl className="compact-detail confirmation-detail">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="confirmation-actions">
        <button type="button" onClick={onBack} disabled={submitting}>
          内容を修正する
        </button>
        <button type="button" onClick={onSubmit} disabled={submitting}>
          {submitting ? "登録中..." : labels.submitButton}
        </button>
      </div>
    </div>
  );
}

function getModeLabels(mode: FormMode) {
  if (mode === "contact_change") {
    return {
      title: "連絡先変更",
      description: "変更したい連絡先を入力してください。本人確認後、CRMのお客様詳細へ反映します。",
      confirmButton: "変更内容を確認する",
      submitButton: "連絡先を登録する",
      confirmDescription: "この内容でCRMのお客様詳細を更新します。"
    };
  }

  return {
    title: "お客様情報登録",
    description: "お名前、連絡先、相談内容を入力してください。本人確認後、CRMへ反映します。",
    confirmButton: "登録内容を確認する",
    submitButton: "お客様情報を登録する",
    confirmDescription: "この内容でCRMのお客様詳細とタイムラインへ保存します。"
  };
}
