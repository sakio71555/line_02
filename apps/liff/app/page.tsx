import { initialTenant } from "@amami-line-crm/domain";

export default function LiffHomePage() {
  return (
    <main>
      <h1>相談フォーム</h1>
      <p>初期テナント: {initialTenant.slug}</p>
      <p>LIFF本番登録はPhase 0では行いません。</p>
    </main>
  );
}
