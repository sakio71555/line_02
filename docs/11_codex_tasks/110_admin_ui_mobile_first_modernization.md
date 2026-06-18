# Loop 110: Admin UI mobile-first modernization

## Purpose

管理画面をスマートフォンで確認しやすいモバイルファーストUIへ整理する。住宅会社・工務店の担当者が、スマホから顧客一覧、会話タイムライン、AI補助、担当者返信、アラートを迷わず扱えることを優先する。

## Scope

- `apps/admin` の表示レイアウト、共通シェル、CSS、Admin UI関連testを更新。
- `/login`、`/logout`、`/select-tenant`、`/customers`、`/customers/:customerId`、`/alerts` をスマホ基準で整える。
- 顧客一覧とアラート一覧はカード表示へ変更。
- 顧客詳細は重要情報、会話タイムライン、AI補助、担当者返信の順へ整理。
- AI要約、AI返信下書き、RAG回答案は「AI補助」として折りたたみ表示。
- 担当者返信は「これはデモ保存です」「本物のLINEには送信されません」を維持。

## Out of Scope

- API contract変更。
- `apps/api` runtime、認証、selectedTenantId処理変更。
- Supabase repository/runtime、RLS SQL、migration変更。
- LINE real push gate、OpenAI real API gate変更。
- LINE/OpenAI/Supabase実接続。
- VPS、Nginx、systemd、certbot、DNS操作。
- `.env` 変更、依存追加、lockfile変更。

## Starting State

- 直近完了Loop: Loop 109 VPS localhost-only mock deployment execution。
- VPS review環境は旧commitのまま。Loop 110では再配置しない。
- production readinessは引き続き `production_no_go`。

## Design Direction

- 375〜430px幅を基準にした1カラム。
- 本文16px前後、タップ領域44px以上。
- 白とニュートラルカラーを中心に、控えめな境界線と影で整理。
- 角丸、余白、状態バッジを共通tokenへ寄せる。
- `tenant` は「利用先」、`mock` は「デモ用 / デモ保存」、`in-memory` は「一時保存」と表記する。

## Common Shell

- `apps/admin/app/_components/admin-shell.tsx` を追加。
- `/customers`、`/alerts`、`/select-tenant` への共通ナビを提供。
- mobileでは下部ナビ、desktopではtopbarを表示。
- `/login` と `/logout` ではナビを非表示。
- active routeには `aria-current="page"` を付与。

## Screens

### Login / Logout

- 1カラムのカードUIへ整理。
- tokenやsecretは表示しない。
- ログイン画面で管理画面の目的が分かる文言へ変更。

### Select Tenant

- 「利用先」として選択状態を説明。
- 技術値の露出を減らし、selectorであり権限ではないことを短く示す。

### Customer List

- tableではなくcustomer card listへ変更。
- 顧客名、対応状況、最新メッセージ、最終更新、担当者返信待ちをカードで表示。
- 空状態ではdemo seedの再投入を案内。

### Customer Detail / Timeline

- 顧客名と対応状況を先頭に表示。
- 重要情報をカードgridへ整理。
- timelineはLINEに近い吹き出し風にし、customerは左、staffは右、AI/systemは補助カードとして表示。
- 長文、URL、IDで横崩れしないようにする。

### AI Assistance

- AI要約、AI返信下書き、RAG回答案を `details` で折りたたみ。
- 自動送信されないことを明示。
- OpenAI API / Webクロール / embedding は未接続のまま。

### Staff Reply

- 担当者返信フォームはタイムライン後に表示。
- 確認カードで宛先、利用先、本文、デモ保存であることを表示。
- 本物のLINE送信ではないことを維持。

### Alerts

- tableではなくalert card listへ変更。
- 状態、重要度、種類、お客様詳細リンク、作成日時、デモ通知日時をスマホで読みやすく表示。
- notify-openはデモ通知であることを維持。

## Accessibility / Responsive Checks

- focus-visibleを維持。
- safe-area-inset-bottomを考慮。
- `@media (min-width: 768px)` 以降でdesktop向けにgridを広げる。
- 色だけで状態を伝えず、状態ラベルを併記する。

## Tests

- mobile bottom navigationの表示とauth画面での非表示。
- globals.cssのmobile-first token、safe-area、touch target、card/timeline layout。
- customer list mobile cards。
- customer action panelのAI補助折りたたみとデモ保存文言。
- alerts mobile card list。

## Browser Check

ローカルBrowser目視確認は環境が許せば実施する。未実施の場合は、component/integration testとbuildで代替確認したことを完了報告に記録する。

## VPS Note

Loop 110はローカルrepo内のAdmin UI変更のみ。VPS localhost-only review環境はLoop 109の旧commitのままで、Loop 110反映には別Loopで再配置が必要。

## Risks

- 実機スマホでのソフトウェアキーボード挙動は未確認。
- VPS review環境へは未反映。
- production readinessは引き続き `production_no_go`。

## Next Loop Candidate

- Loop 111: VPS localhost-only redeploy for mobile UI review
