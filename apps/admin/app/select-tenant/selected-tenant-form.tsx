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
  const [message, setMessage] = useState("まだ会社は保存されていません。");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedTenantId = readSelectedTenantIdFromStorage(window.localStorage);

    if (savedTenantId) {
      setInputValue(savedTenantId);
      setSelectedTenantId(savedTenantId);
      setMessage("保存済みの会社を読み込みました。");
    }
  }, []);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = writeSelectedTenantIdToStorage(window.localStorage, inputValue);

    if (!result.ok) {
      document.cookie = createClearSelectedTenantCookieValue();
      setSelectedTenantId(null);
      setError("会社の選択情報が正しくありません。");
      setMessage("会社は保存されていません。");
      return;
    }

    if (!result.selectedTenantId) {
      document.cookie = createClearSelectedTenantCookieValue();
      setSelectedTenantId(null);
      setError(null);
      setMessage("会社選択を解除しました。");
      return;
    }

    document.cookie = createSelectedTenantCookieValue(result.selectedTenantId);
    setInputValue(result.selectedTenantId);
    setSelectedTenantId(result.selectedTenantId);
    setError(null);
    setMessage("会社を保存しました。次の画面確認から使われます。");
  }

  function handleClear() {
    clearSelectedTenantIdFromStorage(window.localStorage);
    document.cookie = createClearSelectedTenantCookieValue();
    setInputValue(DEFAULT_TENANT_ID);
    setSelectedTenantId(null);
    setError(null);
    setMessage("会社選択を解除しました。");
  }

  const preview = validateSelectedTenantId(inputValue);

  return (
    <div className="action-panel selected-tenant-panel">
      <div className="action-card-header">
        <p className="result-label">会社選択</p>
        <h3>操作する会社を保存する</h3>
      </div>
      <p className="meta">管理者から案内された登録済み会社を選びます。</p>
      <form className="action-form" onSubmit={handleSave}>
        <label htmlFor="selected-tenant-id">登録済み会社コード</label>
        <input
          id="selected-tenant-id"
          name="selectedTenantId"
          onChange={(event) => setInputValue(event.currentTarget.value)}
          placeholder={DEFAULT_TENANT_ID}
          value={inputValue}
        />
        <small className="field-help">会社コードが分からない場合は、システム管理者へ確認してください。</small>
        <div className="confirmation-actions">
          <button type="submit">この会社を保存する</button>
          <button type="button" onClick={handleClear}>
            選択を解除する
          </button>
        </div>
      </form>

      <dl className="compact-detail">
        <dt>現在の保存値</dt>
        <dd>{selectedTenantId ? "アマミホーム" : "未選択"}</dd>
        <dt>次回の確認先</dt>
        <dd>{selectedTenantId ? "保存した会社を使います。" : "まだ会社は未選択です。"}</dd>
        <dt>保存先</dt>
        <dd>この端末と画面確認用の保存場所</dd>
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
