import { initialTenant, responseModes } from "@amami-line-crm/domain";

export default function AdminHomePage() {
  return (
    <main>
      <h1>AI顧客カルテ付きLINE相談CRM</h1>
      <p>初期テナント: {initialTenant.id}</p>
      <p>管理画面は顧客一覧、タイムライン、担当者返信、未返信アラートを扱います。</p>
      <ul>
        {responseModes.map((mode) => (
          <li key={mode}>{mode}</li>
        ))}
      </ul>
    </main>
  );
}
