"use client";

import React, { useEffect, useState } from "react";

import {
  clearSelectedTenantIdFromStorage,
  createClearSelectedTenantCookieValue,
  createSelectedTenantCookieValue,
  readSelectedTenantIdFromStorage,
  validateSelectedTenantId,
  writeSelectedTenantIdToStorage
} from "../../src/selected-tenant";

const DEFAULT_TENANT_ID = "tenant_amamihome";

export function SelectedTenantForm() {
  const [inputValue, setInputValue] = useState(DEFAULT_TENANT_ID);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [message, setMessage] = useState("まだ利用先は保存されていません。");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedTenantId = readSelectedTenantIdFromStorage(window.localStorage);

    if (savedTenantId) {
      setInputValue(savedTenantId);
      setSelectedTenantId(savedTenantId);
      setMessage("保存済みの利用先を読み込みました。");
    }
  }, []);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = writeSelectedTenantIdToStorage(window.localStorage, inputValue);

    if (!result.ok) {
      document.cookie = createClearSelectedTenantCookieValue();
      setSelectedTenantId(null);
      setError("利用先IDは tenant_ から始まる英小文字・数字・_ の形式で入力してください。");
      setMessage("利用先は保存されていません。");
      return;
    }

    if (!result.selectedTenantId) {
      document.cookie = createClearSelectedTenantCookieValue();
      setSelectedTenantId(null);
      setError(null);
      setMessage("利用先選択を解除しました。");
      return;
    }

    document.cookie = createSelectedTenantCookieValue(result.selectedTenantId);
    setInputValue(result.selectedTenantId);
    setSelectedTenantId(result.selectedTenantId);
    setError(null);
    setMessage("利用先を保存しました。次の画面確認から使われます。");
  }

  function handleClear() {
    clearSelectedTenantIdFromStorage(window.localStorage);
    document.cookie = createClearSelectedTenantCookieValue();
    setInputValue(DEFAULT_TENANT_ID);
    setSelectedTenantId(null);
    setError(null);
    setMessage("利用先選択を解除しました。");
  }

  const preview = validateSelectedTenantId(inputValue);

  return (
    <div className="action-panel selected-tenant-panel">
      <div className="action-card-header">
        <p className="result-label">利用先セレクター</p>
        <h3>操作対象の利用先を保存する</h3>
      </div>
      <p className="meta">
        保存するのは秘密情報ではない利用先IDだけです。ログイン情報、APIキー、session値は
        保存も表示もしません。
      </p>
      <form className="action-form" onSubmit={handleSave}>
        <label htmlFor="selected-tenant-id">利用先ID</label>
        <input
          id="selected-tenant-id"
          name="selectedTenantId"
          onChange={(event) => setInputValue(event.currentTarget.value)}
          placeholder={DEFAULT_TENANT_ID}
          value={inputValue}
        />
        <div className="confirmation-actions">
          <button type="submit">この利用先を保存する</button>
          <button type="button" onClick={handleClear}>
            選択を解除する
          </button>
        </div>
      </form>

      <dl className="compact-detail">
        <dt>現在の保存値</dt>
        <dd className="mono">{selectedTenantId ?? "未選択"}</dd>
        <dt>次回の確認先</dt>
        <dd>{selectedTenantId ? "保存した利用先を使います。" : "まだ利用先は未選択です。"}</dd>
        <dt>保存先</dt>
        <dd>画面表示用の保存場所とサーバー側操作用cookie</dd>
        <dt>入力チェック</dt>
        <dd>{preview.ok ? "送信できる形式です。" : "形式が正しくありません。"}</dd>
      </dl>

      {error ? (
        <div className="error">
          <strong>保存エラー</strong>
          <pre>{error}</pre>
        </div>
      ) : (
        <p className="meta">{message}</p>
      )}
    </div>
  );
}
