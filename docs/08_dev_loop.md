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

本物LINE送信など外部ユーザーへ影響する操作は、先に安全設計docを作り、送信前確認、誤送信防止、二重送信防止、送信失敗時の表示、tenant/権限/認証要件を固めてから実装します。AI下書きから直接本送信する導線は作らず、デモ送信と本番送信の表示を明確に分けます。

Alert UI loopでは、未返信チェック、alert一覧、open alert通知を管理画面から開発確認できるところまでにします。通知は `MockStaffNotifier` 前提で、本番LINEグループ通知、scheduler、永続DB連携は別Loopで扱います。

主要UI loop完了後は、必要に応じて `docs/15_runbooks/local_manual_test_checklist.md` を更新します。手動確認手順はローカルMVPの動作確認用であり、実装の正本はGitと自動テストです。

Admin UIをVPS localhost-only review環境で確認する場合は、SSH tunnel経由のローカル確認に限定します。Nginx公開、HTTPS、DNS変更、public port追加、LINE/OpenAI/Supabase実接続は別Loopで明示許可されるまで行いません。mobile UI smokeで見つかった小さな表示崩れはAdmin UI範囲だけで修正し、production readinessは `production_no_go` のまま記録します。

Supabaseなど外部永続化に入る前は、実装Loopの前にplanning Loopを挟みます。planning Loopではrepository mapping、tenant_id分離、RLS、service role key、env、migration、test方針をdocsに整理し、Supabase client追加や実DB接続は行いません。

社内確認版からstaging検証版へ進む場合は、まず永続化対象、既存Supabase repository状況、local/staging/production分離、env/key管理、migration apply前チェックをdocs化してからruntime switchへ進みます。in-memoryの一時保存問題を解消する場合も、Supabase接続、migration apply、RLS SQL、API差し替えを1つのLoopにまとめません。

Supabase staging接続へ進む前に、env/key/project/migration/dummy dataのreadiness checklistを通します。必要env名は名前だけを整理し、実key、`.env`、project ref、dummy seed、migration apply、runtime switchはそれぞれ別Loopで扱います。

永続化runtime switchは、まず `customers` / `messages` から小さく始めます。default in-memoryを維持したまま、runtime mode / repository bundle / factory / env不足時errorの境界とtestを先に追加し、API route差し替えやSupabase実接続は後続Loopに分けます。

Supabase runtime switch前に、fake clientでrepository mapping、tenant_id filter、timeline order、error handlingを固定します。実DB/staging接続は、fake client testでcustomers/messagesの境界を確認してから別Loopで進めます。

Supabase staging migration applyへ進む前に、staging migration dry-run記録を残します。dry-runではmigration SQLの場所、schema inventory、tenant_id index/unique/FK、customers/messages repository期待値、RLS SQL未実装状態、apply前stop条件を静的に確認し、Supabase接続、`.env` 作成、migration apply、API runtime switch、git pushは別Loopに分けます。

Supabase staging migration applyの実行前には、apply plan Loopを挟みます。apply planでは、人間の承認条件、project確認、禁止コマンド、rollback / recovery方針、apply後確認、Go / No-Go判断、結果記録テンプレートをdocs化し、まだ `supabase link`、`supabase db push`、`.env` 作成、migration apply、git pushは行いません。

Supabase staging migration applyを実際に検討する直前には、execution gate Loopを挟みます。明示許可、staging project確認、productionでない確認、env/key readiness、dummy data、rollback / recoveryを確認し、1つでも欠けていればNo-GoとしてSupabase接続、migration apply、`.env` 作成、git pushを行いません。

Supabase staging接続へ進む準備では、`.env.staging.example` を先に用意し、実値は作業者がローカルで `.env.staging` に入力します。repo、README、docs、dev log、Codex promptには実key、project ref、DB URL、LINE token、OpenAI API keyを書きません。LINEは `LINE_REAL_PUSH_ENABLED=false`、OpenAIは `AI_PROVIDER=mock`、repositoryは `REPOSITORY_RUNTIME=in_memory` を初期状態として維持し、接続・送信・runtime switchは別Loopで明示的に扱います。

実envを入力した後は、値を表示しない `scripts/dev-loop/verify-staging-env.mjs` でpresenceとsafety flagsだけを確認してから接続Loopへ進みます。`.env.staging` のraw contentやsecret値をterminal、docs、README、dev log、Codex prompt、commitに出しません。

Supabase staging migration apply execution Loopでは、`psql` が使える場合だけ承認済みmigrationを適用します。`psql` がない、接続先がstagingか不明、verify-staging-envが失敗、またはsecretを表示しないと進められない場合はNo-Goとして停止し、別手段でのapplyへ勝手に切り替えません。

psql availability setup / apply preflight Loopでは、`psql --version` と値非表示のenv verificationだけを確認し、`psql` がない場合の手動準備runbookを整備します。CodexはHomebrew/Postgres.app install、OS設定変更、PATH恒久変更、Supabase接続、migration apply、git pushを行いません。

Supabase staging migration apply retry Loopでは、Codex shellが `~/.zshrc` を読まない前提で、`command -v psql` だけでなく `/usr/local/opt/libpq/bin/psql` と `/opt/homebrew/opt/libpq/bin/psql` も確認します。絶対pathで `psql --version` が通る場合だけ、値非表示helper経由でstaging migration applyとschema verificationを行います。RLS未実装のままproductionへ進みません。

Supabase staging verification edition Loopでは、migration適用済みstaging DBにdummy seedだけを投入し、customers/messagesだけをSupabase runtime bundleで検証します。default runtimeは `in_memory` のまま維持し、LINE/OpenAIはmock/disabled、RLS未実装、production No-Goを明記します。rollback/recovery、dummy seed、verification、API smoke、persistence確認はsecret値を表示しないscriptとrunbookに記録します。

Supabase REST / PostgRESTで `42501 permission denied` が出た場合は、RLSやAuthを急いで追加せず、まずdirect `psql` 成功範囲とREST権限不足を切り分けます。staging recovery Loopでは `service_role` 限定GRANTだけをmigration化し、`anon` / `authenticated` へ広いDML権限を付与しません。RLS未実装のままproductionへ進みません。

stagingでservice_role前提のcustomers/messages smokeが通っても、production readinessは別Loopで判定します。productionへ進む前に、RLS未実装、Supabase Auth/JWT未接続、selectedTenantId UI保存未実装、LINE/OpenAI未接続をNo-Go理由として整理し、RLS/Auth production readiness runbookへ残します。production dev_header rejectionはLoop 093で実装済みですが、RLS SQL、Auth/JWT本接続、selectedTenantId UI保存、LINE/OpenAI本接続は1つのLoopでまとめて実装しません。

customers/messagesのSupabase staging smokeが通った後でも、alerts/knowledge_pages/RAGをまとめてruntime switchしません。先に [docs/11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md](11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md) と [docs/15_runbooks/supabase_alerts_knowledge_staging_runtime_plan.md](15_runbooks/supabase_alerts_knowledge_staging_runtime_plan.md) で、alerts runtime方針、knowledge_pages runtime方針、fake client test方針、staging smoke方針、service_role/RLSの関係を整理してから、小さいLoopで実装へ進みます。

Loop 084/085でalertsとknowledge_pages/RAGの明示Supabase runtime smokeが揃いました。これによりstaging拡張検証版は100%相当として記録しますが、default runtimeは引き続き `in_memory` のまま維持し、RLS/Auth/JWT、production dev_header rejection、LINE/OpenAI本接続は別Loopに分けます。

staging拡張検証版100%相当に到達しても、production hardeningへ一気に進みません。RLS/Auth/JWT/selectedTenantId/production dev_header rejection/LINE real push/OpenAI real APIは [docs/11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md](11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md) と [docs/15_runbooks/production_hardening_split_plan.md](15_runbooks/production_hardening_split_plan.md) の分割に従い、migration SQL unchanged / no RLS SQLのdocs-only計画Loopを挟んでから小さい実装Loopへ進みます。

alerts runtime switch前に、fake clientで `SupabaseAlertRepository` の `tenant_id` filter、create payload、open alert listing、active alert lookup、status transition mapping、error sanitizerを固定します。この段階ではAPI runtime wiring、staging DB接続、migration、RLSはまだ行いません。

alerts runtime boundaryでは、customers/messages/alertsを同じ明示Supabase bundleで扱い、split-brainを避けます。staging smokeは `MockStaffNotifier` を使い、default runtimeと `.env.staging` の `REPOSITORY_RUNTIME=in_memory` は維持します。RLS/Auth/JWT、production dev_header rejection、LINE実送信、OpenAI実接続は別Loopに分けます。

knowledge/RAG runtime switch前に、fake clientで `SupabaseKnowledgePageRepository` の `tenant_id` filter、`allowed_for_ai = true` filter、wrong-tenant/disallowed row防御、`url`/`title`/`content` mapping、RAG search互換性、error sanitizerを固定します。この段階ではAPI/RAG runtime wiring、staging DB接続、migration、RLS、crawl/import/upsert実装はまだ行いません。

GPTとCodexの往復は、repo context収集とCodex prompt生成だけを自動化し、実行、commit、push、外部接続は人間ゲートを残します。生成promptは `tmp/dev-loop/` 配下の作業用下書きであり、人間がScope / Out of Scope / push方針を確認してからCodexへ貼ります。

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

Supabase Auth session extractionは、Admin API routeへ接続する前にserver-side boundaryとして切り出します。Bearer token付きAuthorization headerの解析、token verifier interface、error mappingを先に固定し、Supabase Auth実接続、Admin UI token forwarding、`dev_header` rejectionは後続Loopへ分けます。

fake authenticated runtime接続では、session extraction boundary、fake verifier、fake `StaffAuthLookup`、authenticated staff tenant guard、role guardをroute非接続のまま組み合わせて検証します。これにより、representative route接続へ進む前に `authenticated_staff` contextと `AdminAction` permissionの流れを固定します。

representative Admin API route wiringでは、まず `GET /api/admin/customers` のようなread-only route 1本だけにfake authenticated runtimeを接続します。既存 `dev_header` MVP互換を維持し、全route rollout、Admin UI token forwarding、production `dev_header` rejectionは次以降へ分けます。

Admin API authenticated runtimeの全route rolloutは、代表route接続後にdocs-only planを挟み、read-only route、AI/RAG draft route、side-effect routeの順で分けて進めます。selectedTenantId transport、real Supabase Auth verifier、Admin UI token forwarding、production `dev_header` rejectionはそれぞれ別Loopに分け、1回で全認証切替を行いません。

selectedTenantId transportは、`transport plan -> transport boundary -> read-only route rollout` の順に進めます。`selectedTenantId` は権限ではなくselectorとして扱い、active membershipで再検証してから `AdminTenantContext.tenantId` を確定します。cookie/session/localStorage保存や `/select-tenant` の保存処理は、transport boundaryとroute rolloutとは別Loopに分けます。

Loop 087ではtransport boundaryとして `x-selected-tenant-id` をauthenticated_staff runtimeに追加しました。これは `x-tenant-id` / `dev_header` とは別で、membership再検証後の `AdminTenantContext.tenantId` だけをrepositoryへ渡すための境界です。dev_header path、default `in_memory`、production dev_header rejection未実装の状態は維持し、全route rolloutは後続Loopで扱います。

Loop 088では、authenticated_staff runtimeを全Admin routeへ展開する前にdocs-only route rollout planを固定します。customer read、customer write/AI、alerts、RAG、production dev_header rejectionを別Loopに分け、selectedTenantIdは毎回active membershipで再検証し、repositoryへは `AdminTenantContext.tenantId` だけを渡す方針を維持します。詳細は [docs/11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md](11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md) と [docs/15_runbooks/authenticated_staff_runtime_route_rollout.md](15_runbooks/authenticated_staff_runtime_route_rollout.md) を参照してください。

Loop 089では、customer read routesだけにauthenticated_staff runtimeを展開します。対象は `GET /api/admin/customers`、顧客詳細、timelineに限定し、customer write/AI、alerts、RAG、production dev_header rejection、Auth/JWT、RLS SQLは後続Loopへ分けます。

Loop 090では、customer write / AI routesだけにauthenticated_staff runtimeを展開します。対象はstaff reply、AI summary、AI reply draftに限定し、`x-selected-tenant-id` をactive membershipで再検証してから検証済み `AdminTenantContext.tenantId` だけをwrite / AI処理へ渡します。本物LINE送信、OpenAI API実接続、alerts/RAG rollout、production dev_header rejection、Auth/JWT、RLS SQLは後続Loopへ分けます。

Loop 091では、alerts routesだけにauthenticated_staff runtimeを展開します。対象はalert list、未返信チェック、open alert通知mockに限定し、`x-selected-tenant-id` をactive membershipで再検証してから検証済み `AdminTenantContext.tenantId` だけをalerts処理へ渡します。本物LINE通知、RAG rollout、production dev_header rejection、Auth/JWT、RLS SQLは後続Loopへ分けます。

Loop 092では、RAG routesだけにauthenticated_staff runtimeを展開し、主要Admin route rolloutのcompletion auditを残します。対象は `POST /api/admin/rag/search` と `POST /api/admin/rag/answer-draft` に限定し、`x-selected-tenant-id` をactive membershipで再検証してから検証済み `AdminTenantContext.tenantId` と `allowed_for_ai=true` knowledgeだけをRAG処理へ渡します。production dev_header rejection、Auth/JWT、RLS SQL、selectedTenantId UI保存は後続Loopへ分けます。詳細は [docs/11_codex_tasks/092_authenticated_staff_rag_routes_and_rollout_audit.md](11_codex_tasks/092_authenticated_staff_rag_routes_and_rollout_audit.md) と [docs/15_runbooks/authenticated_staff_route_rollout_completion_audit.md](15_runbooks/authenticated_staff_route_rollout_completion_audit.md) を参照してください。

Loop 093では、production modeで `x-tenant-id` / dev_header pathとdev seed routeを拒否します。Admin routeは `Authorization: Bearer` + authenticated_staff pathを前提にし、`x-selected-tenant-id` は認証ではなくselectorとして扱います。local/dev/testのdev_header互換は維持し、Supabase Auth/JWT本接続、RLS SQL、LINE/OpenAI本接続は後続Loopへ分けます。詳細は [docs/11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md](11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md) を参照してください。

Loop 094Aでは、RLS SQLをstagingへapplyせずdraftとして追加し、静的検証で `anon` grant、`using true`、`with check true`、broad grantを検出します。RLSは `draft review -> local/staging apply verification -> production readiness gate` の順に分け、SQL作成とDB適用を同じLoopに混ぜません。詳細は [docs/11_codex_tasks/094a_rls_sql_draft_review.md](11_codex_tasks/094a_rls_sql_draft_review.md) を参照してください。

Loop 095Aでは、RLS staging applyを実行する前にGo/No-Go、dry-run checklist、apply後verification、staging smoke、rollback/recoveryをdocs化します。`0003_rls_core_tables.sql` の実apply、Supabase実DB接続、`.env.staging` 読み込み、RLS SQL修正は別Loopに分けます。詳細は [docs/11_codex_tasks/095a_rls_staging_apply_plan.md](11_codex_tasks/095a_rls_staging_apply_plan.md) と [docs/15_runbooks/rls_staging_apply_plan.md](15_runbooks/rls_staging_apply_plan.md) を参照してください。

Loop 095Bでは、095AのGo/No-Goに沿って `0003_rls_core_tables.sql` をstaging DBへapplyし、RLS enabled/forced/policy count、service_role grants、既存staging smokeを確認します。service_roleはRLS bypass前提なので、authenticated role/JWT smokeとproduction readinessは後続Loopへ分けます。詳細は [docs/11_codex_tasks/095b_rls_staging_apply_execution_gate.md](11_codex_tasks/095b_rls_staging_apply_execution_gate.md) を参照してください。

Loop 096では、RLS staging apply後に `SET LOCAL ROLE authenticated` と `request.jwt.claim.sub` によるdummy `auth.uid()` simulationでtenant A/B分離を確認します。実Supabase Auth user作成、Supabase Auth/JWT本接続、production接続は行わず、write smokeは `BEGIN ... ROLLBACK` 内のdummy rowsだけに限定します。service_role smokeはRLS bypass確認、authenticated smokeはpolicy挙動確認として分けて記録します。詳細は [docs/11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md](11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md) を参照してください。

Loop 103 production readiness final gateでは、Goに必要な条件とNo-Go条件をrunbookとtestで機械的に確認します。OpenAI real API、LINE real push、production Auth runtimeのような外部接続境界は、複数flag、tenant settings、authenticated staff、selectedTenantId再検証、draft-only/no auto-send、secret非表示を満たすまで本接続しません。未実装が残る場合は `production_no_go` として記録します。

Loop 097では、実Supabase Auth/JWT接続へ進む前にconnection planとrunbookを作ります。`Authorization: Bearer` からSupabase Auth `user.id`、`staff_users.auth_user_id`、active staff / membership、`selectedTenantId` 再検証、RLS `auth.uid()` へつなぐ順序を整理し、実Auth user作成やreal verifier接続は後続Loopへ分けます。詳細は [docs/11_codex_tasks/097_supabase_auth_jwt_connection_plan.md](11_codex_tasks/097_supabase_auth_jwt_connection_plan.md) を参照してください。

Loop 098では、Supabase Auth real verifier境界だけを追加します。`SupabaseAuthSessionVerifier` はfake Supabase auth clientで検証し、token/secret redaction、`session_expired` mapping、production fake verifier default禁止を固定します。実Supabase Auth接続、Auth user作成、staging real Auth smoke、Admin UI selectedTenantId保存は後続Loopへ分けます。詳細は [docs/11_codex_tasks/098_supabase_auth_real_verifier_boundary.md](11_codex_tasks/098_supabase_auth_real_verifier_boundary.md) を参照してください。

Loop 099では、staging real Auth user smokeだけを実行します。dummy Supabase Auth user、Bearer token非表示、`staff_users.auth_user_id`、active membership、selectedTenantId再検証、Admin route smoke、RLS `auth.uid()` tenant boundaryを確認し、smoke後にdummy Auth user / dummy DB rowsをcleanupします。production接続、Admin UI selectedTenantId保存、LINE/OpenAI本接続は後続Loopへ分けます。詳細は [docs/11_codex_tasks/099_staging_real_auth_user_smoke.md](11_codex_tasks/099_staging_real_auth_user_smoke.md) を参照してください。

本番化Loopとは別に、ローカルデモMVPの完成度を上げるhardening Loopを挟みます。デモ確認ではmock/in-memory/未接続を画面とrunbookで明示し、Supabase Auth、LINE実送信、OpenAI実API、Supabase実DBが接続済みであるように見せないことを優先します。

ローカルデモMVPから社内確認版へ移行する場合は、実装だけでなく、確認順、未接続範囲、できること/まだできないこと、フィードバック項目をrunbook化します。社内確認版は本番運用版ではないため、本物LINE送信、OpenAI API、Supabase本番DB、本番ログイン、本番通知、schedulerが未接続であることを画面と手順書の両方で明示します。

社内確認後のfeedbackは、直接実装せず、triage -> 優先度付け -> Loop化してから対応します。P0/P1は社内確認を続けるための小さい修正Loopへ優先的に切り、LINE本送信、OpenAI本接続、Supabase永続化、本番ログイン、本番通知、scheduler、LIFFのような本番化要望は、社内確認版の文言/UI修正と混ぜず別Loopに分けます。フィードバック記録には実顧客情報、LINE userId、APIキー、`.env`、本番ログを書きません。

社内確認版は、実装完了だけでなく、Browser/API確認と最終確認記録を残してから確認会に出します。最終確認では、demo seed、主要画面、主要API、source付きRAG、mock/未接続表示、feedback導線、lint/typecheck/test/buildを確認し、本番運用版ではないことを明記します。

ローカルデモMVPの手動確認Loopでは、curlで確認した項目、HTTP routeだけ確認した項目、ブラウザ目視が必要な項目、bugまたは注意点を分けて記録します。未確認のものを確認済みとして扱わず、source付きRAGなどデモに必要な見え方が未確認の場合は、次Loopの候補として残します。

初心者向けAdmin UI改善では、実装前に [docs/16_design/beginner_friendly_pop_admin_ui.md](16_design/beginner_friendly_pop_admin_ui.md) を確認します。UI LoopはPOPで分かりやすい表示を目指しつつ、AIが自動送信しないこと、本番LINE送信/本番AI/本番Supabaseが未接続であること、tenant/権限境界を曖昧にしないことを優先します。文言変更、カード化、バッジ化、危険操作の確認表示は画面別の小さいLoopに分けます。

Loop完了後は、Codex完了報告の要点を `docs/14_dev_logs/YYYY-MM-DD.md` に短く追記します。Obsidianでは `docs/14_dev_logs/` を作業履歴として見ますが、Obsidianはプロダクト機能ではなく記録用です。実装の正本はGitであり、作業ログには実顧客情報、LINE userId、APIキー、`.env`、本番ログを書きません。

Loop完了報告とdev logには、必要に応じて作業フォルダー、開始時git status、最終git status、commit hash、push有無、実行コマンド、変更ファイル、safety boundary、production readiness、残リスク、次Loop候補を残します。関連runbook、production readiness、Obsidian互換のdev logに分散する場合も、Git commitを正本として扱います。

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

## selectedTenantId UI persistence

Loop 100では、Admin UIで選択した `selectedTenantId` をlocalStorageとcookieに保存し、server-side Admin API helperから `x-selected-tenant-id` として送るところだけを扱いました。`selectedTenantId` は権限ではなくselectorで、API側のactive membership再検証を必須にします。開発用 `x-tenant-id` と混同せず、Bearer token、API key、session値は保存・表示しません。Supabase Auth/JWT production runtime、LINE real push、OpenAI real APIは別Loopに分けます。

## Admin Auth token forwarding

Loop 101では、Admin UIが将来のSupabase Auth access tokenをAdmin APIへ渡すための境界だけを追加しました。tokenはproviderからrequest時に読み、`Authorization: Bearer` headerへ載せるだけで、localStorage、cookie、UI、docs、dev logへ保存・表示しません。production向けhelperでは開発用 `x-tenant-id` を送らない設定を使い、`x-selected-tenant-id` は引き続きselectorとしてactive membership再検証を受けます。Supabase Auth login/session本実装、production接続、LINE/OpenAI本接続は別Loopに分けます。

## Admin Login Session Boundary

Loop 105では、Admin UIがSupabase Auth sessionを扱うための最小境界だけを追加しました。fake auth clientでsign-in、session read、refresh、logout、Admin API token provider連携を検証し、access tokenはlocalStorage、cookie、UI、docs、dev logへ独自保存・表示しません。実Supabase Auth client注入、real login smoke、production接続は後続Loopへ分けます。

## LINE real push gate

Loop 102では、本物LINE送信そのものではなく、本物送信へ進むためのgateだけを実装しました。`LINE_MESSAGING_ENABLED` と `LINE_REAL_PUSH_ENABLED` の両方、authenticated_staff、`send_staff_reply` permission、selectedTenantId再検証、customer tenant一致、送信前確認、idempotency keyが揃うまでreal push pathは動かしません。MockLineClientは維持し、RealLineClientはfake transportで検証します。本物LINE API送信、LINE token実値利用、実LINE userId利用は別Loopで明示許可がある場合だけ扱います。

## Production Auth runtime auto wiring

Loop 104では、production modeで `AUTH_SESSION_VERIFIER=supabase` を明示した場合だけSupabase Auth runtimeを構成する境界を追加しました。fake verifierはproduction defaultにせず、required env不足やruntime例外はsafe failureに丸めます。実Supabase接続、Admin login/session本実装、production smokeは別Loopで明示許可がある場合だけ扱います。

## VPS Deployment Planning

VPS deploymentは、実サーバー作業へ進む前に必ずdocs/templates Loopを挟みます。Loop 106ではVPS監査結果、nginx/systemd/env templates、SSL/certbot手順、rollback、No-Go条件だけをrepo内に追加し、SSH、nginx reload、certbot、systemd作成、production接続は行いません。既存VPSアプリを壊さないことを優先し、start scriptやport境界が未整備ならNo-Goとして記録します。

Loop 107では、VPS実配置へ進む前のproduction start scriptとport boundaryだけを小さく実装しました。APIはproduction defaultで `127.0.0.1:8788`、AdminはNext.js `HOSTNAME=127.0.0.1` / `PORT=3002` を使う方針に揃えます。start/port境界が整っても、SSH、systemd install、nginx reload、certbot、external smokeは後続Loopへ分け、production readinessは `production_no_go` のまま扱います。

Loop 108では、VPS上で将来実行するdry deployment preflight command packだけをdocs化します。read-only audit、backup、secret env、release directory、local smoke、systemd、nginx、certbot、external smoke、rollback、No-Goを実行順に整理しますが、CodexはVPSへSSHせず、nginx/systemd/certbotやproduction接続を実行しません。実VPS作業はLoop 109以降の明示許可とさらに細かいgateに分けます。

Loop 109では、VPSへlocalhost-onlyのreview/mock配置を行う場合も、まずローカル品質ゲートを通し、VPSではread-only audit、backup、release配置、secretなしenv、install/build、localhost-only systemd start、127.0.0.1 smokeの順で進めます。Nginx、certbot、LINE webhook、LINE/OpenAI/Supabase実接続は別Loopに分け、No-Goを検知したらamami-line-crm serviceだけ停止して既存アプリへ影響を出さないようにします。

Loop 112のようなNginx公開前Loopでは、reverse proxy configをいきなりVPSへ有効化せず、repo-local example、Host header smoke案、Go/No-Go、rollback方針を先にdocs化します。VPSへ進む場合も `sites-available` candidate配置と `nginx -t` だけに止め、`sites-enabled` symlink作成、Nginx reload/restart、certbot、DNS変更、public公開は、別Loopで明示許可されるまで行いません。

Loop 113のようにNginx include tree全体を確認する場合は、`sites-enabled` symlinkを一時作成して `nginx -t` と要約確認だけ行い、必ずsymlinkを削除してから終了します。`sites-enabled` を残すこと、Nginx reload/restart、certbot、DNS変更、public公開は、actual enable専用の別Loopで明示許可されるまで禁止です。

Loop 114のようにactual enable + reload dry-runが明示許可された場合でも、`server_name` は `.invalid` のまま、localhost + Host header smokeに限定し、同じLoop内でsymlink削除、`nginx -t`、rollback reloadまで完了させます。Host header smokeが期待値を満たさない場合はNo-Goとして記録し、実ドメイン、DNS、HTTPS/certbot、external smokeへ進みません。

Loop 115のようなHost header routing diagnosisでは、system Nginx reload/restartを行わず、standalone localhost-only Nginxを `127.0.0.1:18080` に立ててcandidate route shapeを確認します。候補server blockに到達した証拠が必要な場合は、非secretのdiagnostic headerを使い、確認後はstandalone processとtemporary symlinkを必ず削除します。

Loop 116のようなDomain/DNS/HTTPS readinessでは、実ドメインを決め打ちせず、canonical hostname、DNS provider、domain ownership、ACME method、certificate SAN、LINE webhook URL、cookie/CORS/forwarded header前提をdocsで整理します。placeholder-based templateとread-only preflight helperは追加してよいですが、DNS変更、Nginx active config変更、reload/restart、certbot、external smokeは別Loopの明示承認まで行いません。

Loop 117のようなreal domain decision gateでは、候補ドメインを分類してもcanonical hostnameを勝手に決めません。DNS provider、domain owner、DNS rollback owner、LINE webhook public URL、Auth callback URLはapproval sheetで人間承認を待ち、承認前はDNS queryもskipできます。TXT query、DNS変更、Nginx active config変更、reload/restart、certbot、external smokeは後続Loopの明示承認まで行いません。

Loop 118のようなapproved domain read-only DNS confirmationでは、承認済みホストと期待IPだけを対象にし、TXTを除くread-only DNS queryとVPS read-only確認に限定します。A一致は公開承認ではありません。DNS owner、rollback owner、ACME method、Nginx enable approver、certificate approver、LINE webhook approverが未確定なら、DNS変更、Nginx reload/restart、certbot、external smokeへ進まず `production_no_go` を維持します。

## Admin UI Mobile-First Loops

Loop 110以降のAdmin UI改善は、スマートフォンで社内担当者が迷わず使えることを優先します。顧客一覧やアラートはカード、顧客詳細は重要情報、会話タイムライン、AI補助、担当者返信の順に整理します。

UI Loopでは以下を守ります。

- API contract、Auth/RLS、Supabase runtime、LINE/OpenAI gateを変更しない。
- `tenant` は「利用先」、`mock` は「デモ用 / デモ保存」、`in-memory` は「一時保存」と表示する。
- AI要約、AI返信下書き、RAG回答案は「AI補助」として扱い、自動送信しないことを明示する。
- 担当者返信では「これはデモ保存です」「本物のLINEには送信されません」を維持する。
- VPS localhost-only review環境へ反映する場合は、UI commit後に別Loopで再配置する。

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
