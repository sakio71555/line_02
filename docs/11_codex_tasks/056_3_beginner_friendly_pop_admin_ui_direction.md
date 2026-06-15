# Loop 056.3: beginner-friendly POP admin UI direction

## Goal

初心者が使う前提で、管理画面をPOPで分かりやすいUIへ育てるための設計方針をdocs-onlyで整理する。

今回のLoopではReact component、Next.js page、CSS、API、schemaは変更しない。後続UI Loopで迷わず改善できるように、対象ユーザー、文言、画面別方針、安全表示、優先順位を固定する。

## Scope

- 既存のAdmin UI画面を読み、初心者に分かりにくい表現を整理する。
- beginner-friendly POP admin UI guidelineを追加する。
- READMEとdev loop docsに、今後のAdmin UI改善方針を追記する。
- Obsidian dev logにLoop 056.3を追記する。
- docs-onlyとしてlint/typecheck/testを実行する。

## Out of Scope

- React component変更
- Next.js page変更
- CSS変更
- API route変更
- Server Action変更
- Supabase接続
- OpenAI API接続
- LINE API接続
- RAG実装変更
- DB schema変更
- 認証実装
- package変更

## Reviewed UI Surface

- `apps/admin/app/page.tsx`
- `apps/admin/app/customers/page.tsx`
- `apps/admin/app/customers/[customerId]/page.tsx`
- `apps/admin/app/customers/[customerId]/customer-actions.tsx`
- `apps/admin/app/alerts/page.tsx`
- `apps/admin/app/alerts/alert-actions.tsx`
- `apps/admin/app/login/page.tsx`
- `apps/admin/app/select-tenant/page.tsx`
- `apps/admin/app/permission-denied/page.tsx`
- `apps/admin/app/session-expired/page.tsx`
- `apps/admin/app/role-visibility-note.tsx`

## Added Guideline

Main guideline:

- [docs/16_design/beginner_friendly_pop_admin_ui.md](../16_design/beginner_friendly_pop_admin_ui.md)

The guideline covers:

- target users
- POP UI direction
- terminology replacement policy
- AI/RAG display policy
- LINE/staff reply safety policy
- mock/unconnected/dev-only display policy
- dangerous operation policy
- screen-by-screen improvement policy
- future UI loop candidates

## Target Users

- アマミホームのスタッフ
- 営業担当
- LINE相談対応者
- AIやRAGに詳しくない利用者
- PC操作に慣れていない初心者

この管理画面は専門家向けの技術管理画面ではなく、お客様対応を安心して進めるための業務画面として育てる。

## UI Policy

- 画面ごとに「次に何をするか」を分かりやすくする。
- 英語、内部ID、技術用語を主要UIの主役にしない。
- `mock`、`in-memory`、`dev_header`、`tenant` などは初心者向けの日本語へ置き換える。
- 状態はテキストだけでなく、将来的にバッジやカードで表示する。
- AI、RAG、LINE送信、権限、tenant切り替えは安全表示を明確にする。

## POP Direction

POP化は、派手な装飾ではなく「見た瞬間に意味が分かる」状態を増やすことと定義する。

- やさしい見出し
- 短い説明
- 明確なボタン文言
- 状態バッジ
- 空状態の次アクション
- 成功/失敗の分かりやすい表示
- デモ用/一時保存/本番未接続の明示

## Terminology Replacement Policy

代表的な置き換え:

- AI Summary -> 相談内容をまとめる
- AI Reply Draft -> 返信文の下書きを作る
- RAG -> ホームページ情報から回答案を作る
- Knowledge -> 参考情報
- Source -> 参考にした情報
- Mock -> デモ用
- In-memory -> 一時保存
- Tenant -> 会社 / 利用先
- dev_header -> 開発用の確認モード
- authenticated_staff -> ログイン済みスタッフ
- Role -> 権限

詳細な表はdesign guidelineに記載した。

## Safety Policy

### AI

- AI要約は担当者支援用。
- AI返信下書きは送信前に担当者が確認する。
- AIはLINEへ自動送信しない。
- 金額、土地価格、在庫、補助金、契約条件、保証判断を断定しない。

### RAG

- `RAG` という技術語を主役にしない。
- 「ホームページ情報から回答案を作る」と説明する。
- sourceがない場合は担当者確認へ誘導する。

### LINE

- 下書きと送信を明確に分ける。
- 本番LINE送信前はデモ用送信であることを表示する。
- 本番送信Loopでは確認ステップを必須候補にする。

### Mock / Dev-only

- mockは「デモ用」。
- in-memoryは「一時保存」。
- placeholderは「準備中」。
- unconnectedは「本番未接続」。

### Dangerous Operations

危険操作は後続UIでも確認表示を置く。

- 本物のLINE送信
- 担当者LINE通知
- AI下書きからの送信
- 顧客情報変更
- alert通知
- tenant切り替え
- role変更
- 本番設定変更

## Screen-by-Screen Policy

- Admin top: 初心者向けデモ入口として整理する。
- Customer list: 顧客IDより相談状況、未返信/返信済みを主役にする。
- Customer detail: お客様情報、対応状況、会話履歴、担当者アクションに分ける。
- AI summary: 「相談内容をまとめる」と表示し、保存されることを明示する。
- AI reply draft: 「返信文の下書きを作る」と表示し、保存/送信しないことを明示する。
- RAG answer: 「ホームページ情報から回答案を作る」と表示し、参考情報を見せる。
- Staff reply: デモ用送信と本番LINE送信の違いを明示する。
- Alerts: 未返信チェックと担当者通知を業務表現へ置き換える。
- Login/tenant/permission/session: placeholder説明を初心者向けにする。
- Role visibility note: 日本語の権限名とできることを説明する。

## Priority

1. Admin topの初心者向けデモ入口化
2. Customer detailのAI/RAG/担当者返信カード改善
3. Alerts pageの業務表現化
4. デモ用/本番未接続/一時保存の共通バッジ
5. Customer listの相談状態バッジ化
6. Auth/role placeholderのやさしい文言化

## Test / Verification

Docs-onlyのため、UI snapshotやE2Eは追加していない。

実行対象:

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Result

- beginner-friendly POP admin UI guidelineを追加。
- README、dev loop docs、dev logを更新。
- React component、CSS、API、schema、外部接続は変更なし。

## Risks

- 方針整理のみで、実際のUIはまだPOP化していない。
- 後続Loopで画面別に小さく実装し、見た目と文言を検証する必要がある。

## Next Loop Candidates

- Loop 057: selectedTenantId transport boundary
- Loop 058: beginner-friendly Admin top polish
- Loop 059: customer detail action cards POP UI
- Loop 060: alerts page beginner-friendly polish

