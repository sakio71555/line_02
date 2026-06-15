# Development Loop

このプロジェクトでは、ループエンジニアリングを最重要の開発方針にします。Codexでの開発は、1回に1タスクです。大きな機能を一度に実装せず、設計、実装、テスト、修正、レビュー、ドキュメント更新のループを小さく回します。

## 1ループの定義

1. `docs/11_codex_tasks/` の対象タスクを読む。
2. Scopeに書かれた範囲だけ実装する。
3. Out of scopeに書かれたものは実装しない。
4. 必要なテストを追加する。
5. `npx pnpm@10.12.1 lint` を実行する。
6. `npx pnpm@10.12.1 typecheck` を実行する。
7. `npx pnpm@10.12.1 test` を実行する。
8. 失敗した場合は原因を修正して再実行する。
9. READMEまたはdocsに反映する必要があれば更新する。
10. 必要に応じて `docs/14_dev_logs/YYYY-MM-DD.md` に作業ログを追記する。
11. 最後に変更ファイル、実行コマンド、残リスク、次タスクを報告する。

## 検証コマンド方針

この環境ではdirect `pnpm` や `corepack` が使えない可能性があるため、Loop完了時の検証コマンドは当面 `npx pnpm@10.12.1` 経由で実行します。

- `npx pnpm@10.12.1 install`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

将来的に `corepack enable` などでpnpmが直接使える環境になった場合は、同じscriptをdirect `pnpm` コマンドへ置き換えて構いません。

UI loopではNext.js buildが必要になる場合があります。ただし、Loop 014のread-only UI foundationでは使用量節約のため、原則として `lint`、`typecheck`、`test`、`test:integration` を優先し、buildが必要な場合だけ理由を記録して実行します。

UI確認Loopでは、必要に応じて開発専用の `POST /api/dev/seed-demo-data` を使い、in-memoryにデモ顧客・デモメッセージを投入してread-only管理画面を確認します。このdemo seedは本番用途ではなく、`APP_ENV=production` または `NODE_ENV=production` では使えない前提です。

Action UI loopでは、まずAI要約、AI返信下書き、RAG回答案のような担当者確認用アクションだけを画面から試せるようにします。LINE送信やstaff reply送信UIは別Loopに分け、AI結果をお客様へ自動送信しない状態を維持します。

Staff reply UI loopでは、既存のstaff reply APIと `MockLineClient` 境界を前提に、管理画面から担当者返信を開発確認できるところまでにします。本番LINE access token利用、本物のLINE push送信、認証/RLS連携は別Loopで扱います。

Alert UI loopでは、未返信チェック、alert一覧、open alert通知を管理画面から開発確認できるところまでにします。通知は `MockStaffNotifier` 前提で、本番LINEグループ通知、scheduler、永続DB連携は別Loopで扱います。

主要UI loop完了後は、必要に応じて `docs/15_runbooks/local_manual_test_checklist.md` を更新します。手動確認手順はローカルMVPの動作確認用であり、実装の正本はGitと自動テストです。

Supabaseなど外部永続化に入る前は、実装Loopの前にplanning Loopを挟みます。planning Loopではrepository mapping、tenant_id分離、RLS、service role key、env、migration、test方針をdocsに整理し、Supabase client追加や実DB接続は行いません。

本番認証、JWT検証、staff/admin tenant context、staff tenant schema、RLSのようなセキュリティ境界は、実装Loopの前に必ずplanning Loopを挟みます。開発用 `x-tenant-id` は本番認証ではないため、認証済みuser/sessionとactive membershipからtenant contextを決定する設計を先に固めてからAPI差し替えへ進みます。

セキュリティ境界のschema migration Loopでは、DB schemaとstatic validation testだけを整え、Auth/JWT/API guard/RLS SQL/runtime切替は別Loopに分けます。

本番tenant contextは、`schema -> auth context boundary -> API tenant guard -> Auth/JWT -> RLS/local test -> runtime接続` の順に分けて進めます。boundary Loopではpure resolverとfake lookup testに留めます。API tenant guard Loopでは既存dev-only `x-tenant-id` をguard境界に集約し、Supabase Auth/JWT接続は次以降へ分けます。

認証UIも `plan -> placeholder -> error mapping -> auth client boundary -> integration` の順に分けます。placeholder段階では既存のローカルMVP確認を壊さず、未認証・権限不足・tenant選択・session切れのsafe stateだけを先に整理します。

認証placeholder UI loopでは、本物のlogin submit、cookie/session保存、Supabase Auth/JWT接続、Admin API guard切替は実装しません。既存の `/customers`、`/customers/[customerId]`、`/alerts` はdev-only MVP確認用として維持し、placeholder画面は安全な導線確認だけに留めます。

Admin API auth error mapping loopでは、既存 `missing_tenant_id` / `unknown_tenant_id` の互換を維持しながら、将来のAuth/JWT/session/permission errorをHTTP statusとplaceholder routeに対応づけます。この段階ではAdmin UI redirectやJWT検証には接続しません。

Supabase Auth関連は、`config/client boundary -> Admin login UI integration -> session/JWT verification -> authenticated_staff guard -> runtime connection` の順に分けて進めます。Auth client boundary loopでは `SUPABASE_URL` / `SUPABASE_ANON_KEY` の境界とclient factoryだけを扱い、login/logout/session保存やAdmin API guard接続は実装しません。

staff auth lookup repository loopでは、JWT/sessionから得た `auth_user_id` をstaff identityとtenant membershipへ変換するrepository境界だけを追加します。Admin API authenticated_staff guardへの接続、JWT検証、Supabase Auth session取得は次以降のLoopに分けます。

authenticated staff guard loopでは、`AuthUserIdentity + StaffAuthLookup` を `AdminTenantContext(source: authenticated_staff)` へ変換するAPI境界だけを追加します。Hono route差し替え、JWT/session検証、dev-header廃止、本番runtime接続は後続Loopに分けます。

認証UIは `placeholder -> disabled form -> Auth client接続 -> session/JWT guard -> runtime switch` の順に分けて進めます。login UI integration loopではemail/password入力欄を表示しても、Supabase Auth呼び出し、session保存、Admin API guard接続は実装しません。

tenant selection UIも `placeholder -> disabled selection -> membership API/session integration -> authenticated_staff guard connection` の順に分けて進めます。placeholder段階では静的tenant cardとdisabled buttonだけを表示し、tenant一覧取得、selectedTenantId保存、cookie/session/localStorage保存は実装しません。

role-based admin action guardは `plan -> API guard boundary -> UI visibility/disabled control -> authenticated runtime connection` の順に分けて進めます。権限の本丸はAPI側guardに置き、UIのbutton非表示やdisabled表示は補助として扱います。dev-only `x-tenant-id` runtimeの間は本番role guardとして扱いません。

permission判定は、まずHTTP/UI/DB非依存のpure boundaryとして `packages/domain` に置きます。API routeへ接続するLoopでは `AdminTenantContext(source: authenticated_staff, role)` と組み合わせ、dev-only `x-tenant-id` runtimeとは混ぜません。

Admin API role guardは `route/action mapping plan -> API guard boundary -> representative route -> full route rollout` の順に分けます。いきなり全Admin APIへenforceせず、まずrouteごとの `AdminAction` 対応とdev-only/non-admin route除外方針を固めます。

API guard boundary loopでは、`AdminTenantContext(source: authenticated_staff)` だけをrole判定対象にし、dev-only `source: dev_header` は `authenticated_staff_required` として扱います。route接続は別Loopに分け、現在のlocal MVP runtimeを暗黙にrole-authorized扱いしません。

representative route/test loopでは、まず `view_customers` のような読み取り系代表actionで `authenticated_staff` contextのallow/denyと `permission_denied` response mappingを確認します。既存MVP routeを壊さないため、dev-header runtimeへの全体適用はfull rolloutやauthenticated runtime接続とは分けます。

role guard full rollout loopでは、全Admin routeへ `AdminAction` mappingとguard hookを配置しつつ、現行 `dev_header` runtimeは一時互換としてskipします。このskipは本番認可ではなく、authenticated runtime接続とproduction dev_header rejectionを後続Loopに分けるための足場です。

Admin UI role visibilityは `plan -> placeholder -> test fixtures -> authenticated runtime接続` の順に進めます。UIの表示/disabledは補助であり、権限の正本はAdmin API guardです。`dev_header` runtimeでは本番role visibilityとして扱わず、authenticated staff contextが来てから有効化します。

role visibility placeholder loopでは、既存ボタンを非表示/disabledにせず、将来の `owner` / `manager` / `staff` 制御方針だけをUIに表示します。本物のrole判定、API helper変更、authenticated runtime接続は次以降のLoopに分けます。

role visibility test fixture loopでは、UI operationと `AdminAction` の対応、`owner` / `manager` / `staff` ごとの将来 `expectedVisibility` をtest fixtureとして固定します。fixtureはまだUIへ接続せず、permission boundaryとの整合だけを自動テストで守ってから、後続LoopでUI controlへ進みます。

authenticated runtime接続は `connection plan -> token/session extraction boundary -> fake authenticated runtime -> Admin API integration -> Admin UI token forwarding -> production dev_header rejection` の順で進めます。`dev_header` はlocal MVP維持用であり、productionでは認証済みstaff contextが動いてから拒否します。

dev_header production rejectionは `plan -> session extraction boundary -> fake authenticated runtime -> representative route -> Admin API rollout -> staging rejection -> production rejection` の順で進めます。拒否実装を先に入れず、local/testのMVP互換とstagingのdummy staff検証を通してからproduction hardeningへ進みます。

Supabase Auth session extractionは、Admin API routeへ接続する前にserver-side boundaryとして切り出します。`Authorization: Bearer <token>` の解析、token verifier interface、error mappingを先に固定し、Supabase Auth実接続、Admin UI token forwarding、`dev_header` rejectionは後続Loopへ分けます。

fake authenticated runtime接続では、session extraction boundary、fake verifier、fake `StaffAuthLookup`、authenticated staff tenant guard、role guardをroute非接続のまま組み合わせて検証します。これにより、representative route接続へ進む前に `authenticated_staff` contextと `AdminAction` permissionの流れを固定します。

representative Admin API route wiringでは、まず `GET /api/admin/customers` のようなread-only route 1本だけにfake authenticated runtimeを接続します。既存 `dev_header` MVP互換を維持し、全route rollout、Admin UI token forwarding、production `dev_header` rejectionは次以降へ分けます。

Admin API authenticated runtimeの全route rolloutは、代表route接続後にdocs-only planを挟み、read-only route、AI/RAG draft route、side-effect routeの順で分けて進めます。selectedTenantId transport、real Supabase Auth verifier、Admin UI token forwarding、production `dev_header` rejectionはそれぞれ別Loopに分け、1回で全認証切替を行いません。

selectedTenantId transportは、`transport plan -> transport boundary -> read-only route rollout` の順に進めます。`selectedTenantId` は権限ではなくselectorとして扱い、active membershipで再検証してから `AdminTenantContext.tenantId` を確定します。cookie/session/localStorage保存や `/select-tenant` の保存処理は、transport boundaryとroute rolloutとは別Loopに分けます。

本番化Loopとは別に、ローカルデモMVPの完成度を上げるhardening Loopを挟みます。デモ確認ではmock/in-memory/未接続を画面とrunbookで明示し、Supabase Auth、LINE実送信、OpenAI実API、Supabase実DBが接続済みであるように見せないことを優先します。

ローカルデモMVPの手動確認Loopでは、curlで確認した項目、HTTP routeだけ確認した項目、ブラウザ目視が必要な項目、bugまたは注意点を分けて記録します。未確認のものを確認済みとして扱わず、source付きRAGなどデモに必要な見え方が未確認の場合は、次Loopの候補として残します。

Loop完了後は、Codex完了報告の要点を `docs/14_dev_logs/YYYY-MM-DD.md` に短く追記します。Obsidianでは `docs/14_dev_logs/` を作業履歴として見ますが、Obsidianはプロダクト機能ではなく記録用です。実装の正本はGitであり、作業ログには実顧客情報、LINE userId、APIキー、`.env`、本番ログを書きません。

## 1. 仕様を書く

実装前に `docs/11_codex_tasks/` のタスクカードを確認します。必要なら `docs/` の設計書またはADRを更新します。

確認すること:

- Goal
- Scope
- Out of scope
- Acceptance Criteria
- Test requirements

## 2. 1タスクずつ実装

大きな機能を一度に作らず、DB、Webhook、管理画面、AIなどを小さく分けて進めます。

例:

1. DB schema
2. LINE webhook
3. 顧客一覧
4. 顧客タイムライン
5. 担当者返信
6. 未返信アラート
7. AI要約
8. AI返信下書き

## 3. テスト

テストでは外部APIを直接呼びません。

- LINEは `MockLineClient`
- AIは `MockAiProvider`
- Supabaseはrepository interfaceまたはtest DB

テスト観点:

- tenant_id分離
- LINE署名検証
- response_mode
- 未返信判定
- AIに渡す情報の範囲

## 4. 修正

テストやレビューで見つかった問題は、スコープ内で修正します。スコープ外の本番接続、UI本格実装、スクレイピングなどは勝手に足しません。

## 5. レビュー

レビューでは以下を確認します。

- tenant_idが抜けていないか
- AIに全tenant情報を渡していないか
- 外部APIをテストで呼んでいないか
- secretsをコミットしていないか
- 人間対応中にBOT返信しないか

## 6. commit

`npx pnpm@10.12.1 lint`、`npx pnpm@10.12.1 typecheck`、`npx pnpm@10.12.1 test` が通ったらcommitします。commit messageは機能単位で短く書きます。

## 7. 次タスク

完了後は次のCodexタスクカードへ進みます。前タスクで残ったリスクやTODOは、次タスクのScopeまたはAcceptance Criteriaへ反映します。

## 理想サイズ

良いサイズ:

- DBテーブル定義だけ
- LINE Webhook署名検証だけ
- メッセージ保存だけ
- 顧客一覧APIだけ
- 顧客詳細画面だけ
- 未返信判定だけ
- AI要約Providerだけ
- MockAiProviderだけ

避けるサイズ:

- LINE BOT全体を作る
- 管理画面もAIも全部作る
- RAGとLIFFと予約をまとめる
- とりあえず動くところまで一気に作る

## 今回の開発ループ順

1. Loop 000: scaffold
2. Loop 001: database schema
3. Loop 002: LINE webhook foundation
4. Loop 003: message logging
5. Loop 004: admin customer list
6. Loop 005: customer timeline
7. Loop 006: staff reply
8. Loop 007: unreplied alert
9. Loop 008: staff notification
10. Loop 009: AI summary
11. Loop 010: AI reply draft
12. Loop 011: RAG foundation
13. Loop 012: Amami Home knowledge import
14. Loop 013: LIFF forms
15. Loop 014: Amami-specific features
16. Loop 015: local dev runbook and demo seed
17. Loop 016: admin action UI foundation

## 完了報告フォーマット

```md
### 変更内容
- 

### 作成・変更ファイル
- 

### 実行コマンド
- npx pnpm@10.12.1 lint
- npx pnpm@10.12.1 typecheck
- npx pnpm@10.12.1 test

### テスト結果
- 

### tenant_id分離の確認
- 

### 外部API mock確認
- 

### 残リスク
- 

### 次に進むべきタスク
- 
```
