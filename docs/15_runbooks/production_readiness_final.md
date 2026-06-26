# Production Readiness Final Gate

## Purpose

productionへ進む直前に、staging検証、Auth/JWT、RLS、selectedTenantId、Admin UI token forwarding、LINE real push gate、OpenAI real API gateを一括で確認し、Go / No-Goを正直に判定する。

このrunbookでは本物LINE送信、OpenAI API実呼び出し、production DB接続、production deploy、production smokeは行わない。

## Current State

| area | status |
| --- | --- |
| staging CRM smoke | customers/messages、alerts、knowledge/RAG、real Auth user smoke済み |
| RLS | staging apply済み、authenticated role/JWT claim相当smoke済み |
| production dev header rejection | 実装済み |
| selectedTenantId | Admin UI保存と `x-selected-tenant-id` forwarding済み |
| Admin token forwarding | Bearer token provider境界済み、token保存/表示なし |
| Admin login/session boundary | fake auth clientでsign-in / refresh / logout / token provider連携を検証済み |
| production Auth runtime gate | `AUTH_SESSION_VERIFIER=supabase` でSupabase Auth client境界とStaffAuthLookup境界を自動構成できる |
| LINE real push gate | 複数gate、confirmation、idempotency、fake transport検証済み |
| OpenAI real API gate | 複数gate、draft-only、fake transport検証済み |
| VPS deployment plan | `taiyolabel.site` DNS/VPS audit、nginx/systemd/env templates、rollback plan追加済み |
| production start/port boundary | API/Admin start scriptsと `127.0.0.1:8788` / `127.0.0.1:3002` 境界追加済み |
| VPS dry deployment preflight | command pack、rollback、No-Go checklist追加済み |
| VPS localhost mock deployment | localhost-only review配置を実施。Nginx/SSL/LINE/OpenAI/Supabase実接続なし |
| VPS localhost mobile UI review | Loop 110 mobile Admin UIをlocalhost-only review環境へ再配置し、SSH tunnel経由のmobile smoke済み。Nginx/SSL/DNS/public公開なし |
| Nginx include dry-run final gate | `sites-available` candidate配置済み。一時 `sites-enabled` symlinkでinclude tree全体の `nginx -t` 成功を確認後、symlink削除済み。reload/restart/certbot/DNS/public公開なし |
| Nginx reload rollback dry-run | `amami-line-crm.invalid` のまま一時enable + reloadを実施し、Host header smokeで `/api/health` が `404` となったためNo-Go。symlink削除後に `nginx -t` とrollback reloadを実行済み |
| Nginx Host header routing diagnosis | standalone localhost-only Nginx `127.0.0.1:18080` でcandidate route shapeを確認し、`/api/health` は `200`。diagnostic headerをcandidateへ追加。system Nginx reload/restart未実施 |
| Corrected Nginx candidate reload smoke | Loop 123でlatest active sourceに対して `amami-line-crm.invalid` のtemporary include + reload smokeを再実施。`/api/health` は `404`、diagnostic headerも absent。cleanup trapでsymlink削除、rollback reload済み |
| Domain/DNS/HTTPS readiness | placeholder templateとread-only preflight helper追加済み。Loop 118で `admin.taiyolabel.site` を検証/管理用ホストとしてread-only DNS確認済み |
| Real domain decision gate | Loop 117でdomain decision packet、DNS provider checklist、production domain approval sheetを追加。Loop 118でA record一致を確認したが、DNS owner、rollback owner、ACME method、Nginx enable approver、certificate approver、LINE webhook approverは未確定 |
| Approved domain DNS inventory | `admin.taiyolabel.site A 160.251.174.201` が期待IPと一致。TXT未取得、DNS変更なし、Nginx reload/restartなし、certbotなし、external smokeなし |
| Domain / release approval record | Loop 119でdomain owner、DNS change owner、DNS rollback owner、Nginx enable approver、Certificate approver、LINE webhook approver、External smoke approver、Maintenance window、Final Go/No-Go ownerの承認欄を追加。全て未確定のためNo-Go |
| Release commit alignment | Loop 120でrelease candidate `5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db` とrollback candidate `176cb34fc6059ecabfb9826daacaabc2a437bebe` を記録。VPS release dirはcopy-basedで `.git` がないためfast-forward-only redeployは未実施 |
| Copy-based archive redeploy | Loop 121でrelease archiveを作成しVPS stagingへ転送。checksum、`.env*` 除外、install/lint/typecheck/buildは確認したが、staging full testが失敗したためactive deploy、systemd restart、Nginx reload/restartは未実施 |
| Active localhost-only copy-based redeploy | Loop 122でrelease candidate `2a9a746940b5f7a707af4c042bb9225d3dea258b` をVPS active `/var/www/amami-line-crm` へ反映。staging full validation、active backup、`.env*` preservation、active build、existing service restart、localhost-only smokeは成功。Nginx reload/restart、DNS、certbot、HTTPS、external smokeは未実施 |
| production deploy/smoke | 未実施 |

## Go Conditions

controlled production enablementへ進むには、少なくとも以下が必要です。

- production envで `x-tenant-id` / dev_header が拒否される。
- production Admin routeが `Authorization: Bearer` を必須にする。
- production runtimeでfake verifierがdefaultにならない。
- production runtimeでSupabase Auth clientとStaffAuthLookupが安全に自動構成される。
- Admin login/session/token取得とrefresh/logoutが実装・検証済み。
- selectedTenantIdがactive membershipで再検証される。
- RLSがproduction apply前にstagingでverified済み。
- LINE real pushはflags、authenticated_staff、permission、tenant一致、confirmation、idempotencyなしでは動かない。
- OpenAI real APIはprovider/key/model/tenant AI setting/RAG source/draft-only gateなしでは動かない。
- secrets、project ref、DB URL、token、LINE userId、実顧客情報をdocs/logへ出さない。
- rollback/recovery手順がある。

## No-Go Conditions

以下が残る場合はproduction No-Goです。

- Admin UIの実Supabase Auth client注入とreal login/session/token smokeが未完了。
- real LINE送信UI、実transport、安全な送信先smoke、永続audit/idempotency storeが未完了。
- OpenAI real HTTP transport、本番接続、cost/rate limit運用、prompt logging policyが未完了。
- VPS deploy、SSL issue、nginx reload、systemd service作成、external smokeが未完了。
- production接続やsecret表示が必要になる。
- DNS owner、DNS rollback owner、Nginx enable approver、Certificate approver、LINE webhook approver、Maintenance window、Final Go/No-Go ownerが未確定。
- client-facing final hostnameがundecided。

## Auth/JWT

済み:

- `SupabaseAuthSessionVerifier` 境界。
- fake Supabase auth client test。
- staging real Auth user smoke。
- production fake verifier default禁止。
- `AUTH_SESSION_VERIFIER=supabase` と明示注入されたclient/lookupでruntimeを作るgate。
- production runtimeでSupabase Auth client境界とStaffAuthLookup境界を自動構成するfactory。
- required env不足やruntime例外をsecret/token/URLなしでsafe failureすること。
- Admin UI session controller境界。
- fake auth clientによるsign-in / session read / refresh / logout検証。
- Admin API helperへsession token providerを渡す境界。

未完了:

- 実Supabase Auth clientをAdmin UIへ注入すること。
- staging/production相当でreal login/session/token取得、refresh、logoutをsmokeすること。

## selectedTenantId

- `selectedTenantId` はpermissionではなくselector。
- Admin UIは非secretのtenant selectorだけをlocalStorage/cookieへ保存する。
- Admin API helperは `x-selected-tenant-id` を送る。
- API側authenticated_staff runtimeでactive membership再検証後のtenantだけをrepositoryへ渡す。

## RLS

- core RLS SQLはstaging apply済み。
- authenticated role/JWT claim相当smoke済み。
- staging real Auth user smokeで `auth.uid()` と `staff_users.auth_user_id` の接続をdummy dataで確認済み。
- service_roleはserver-side onlyで、RLS bypass前提のためproduction authorizationの代替にしない。

## Production Dev Header Rejection

- production modeではAdmin routeの `x-tenant-id` / dev_header pathを拒否する。
- `x-selected-tenant-id` 単体を認証扱いしない。
- dev seed routeはproductionで拒否する。

## Admin UI Token Forwarding

- Admin API helperはaccess token providerから受け取ったtokenを `Authorization: Bearer` headerへだけ載せる。
- tokenはlocalStorage、cookie、UI、docs、dev log、error messageへ保存・表示しない。
- production-style configでは開発用 `x-tenant-id` を送らない。
- Loop 105ではfake auth clientからsessionを読み、token provider経由でAdmin API helperへ渡す境界を追加した。
- 実Supabase Auth client注入とreal login smokeは後続Loopで扱う。

## LINE Real Push Gate

real push pathは以下がすべて必要です。

- `LINE_MESSAGING_ENABLED=true`
- `LINE_REAL_PUSH_ENABLED=true`
- authenticated_staff runtime
- `send_staff_reply` permission
- `x-selected-tenant-id` present and membership revalidated
- customer tenant match
- send confirmation
- idempotency key

Loop 103では本物LINE API送信は未実施。

## OpenAI Real API Gate

real OpenAI pathは以下がすべて必要です。

- `AI_PROVIDER=openai`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- tenant AI settingsでOpenAIと対象機能がenabled
- RAG answer draftではsourceあり
- draft-only
- auto-sendなし

Loop 103ではOpenAI API実呼び出しは未実施。

## Staging Smoke

stagingでは以下をdummy dataで確認済み。

- customers/messages Supabase runtime smoke。
- alerts Supabase runtime smoke。
- knowledge_pages/RAG Supabase runtime smoke。
- RLS staging apply。
- authenticated role / JWT claim相当RLS smoke。
- real Auth user smoke。

## VPS Deployment Plan

Loop 106で `taiyolabel.site` 向けVPS deployment plan and templatesを追加した。

追加済み:

- `admin.taiyolabel.site` -> `127.0.0.1:3002` planned route。
- `api.taiyolabel.site` -> `127.0.0.1:8788` planned route。
- nginx HTTP bootstrap / SSL templates。
- systemd templates。
- API/Admin env examples。
- SSL/certbot、secret投入、LINE webhook、rollback、No-Go runbook。

Loop 107でproduction start/port boundaryを追加した。

追加済み:

- `@amami-line-crm/api` の `start` はLoop 109のlocalhost-only reviewでは `tsx src/index.ts` を使う。compiled API runtimeは別Loopで整理する。
- `@amami-line-crm/admin` の `start` はLoop 109で `next start --hostname 127.0.0.1` へ補正。
- API production default `127.0.0.1:8788`。
- Admin production env `HOSTNAME=127.0.0.1` / `PORT=3002`。
- systemd templatesの `npx pnpm@10.12.1 --filter ... start`。

Loop 108でVPS dry deployment preflight command packを追加した。

追加済み:

- read-only audit command pack。
- backup command pack。
- release directory plan。
- secret injection checklist。
- dependency install / build plan。
- local service smoke plan。
- systemd registration plan。
- nginx HTTP bootstrap plan。
- certbot SSL plan。
- external smoke plan。
- LINE webhook URL plan。
- rollback runbook。
- No-Go checklist。

未実施:

- nginx config install / `nginx -t` / reload。
- certbot issue。
- production deploy / external smoke。
- production Supabase connection。
- Admin real login smoke。
- LINE webhook registration and real LINE smoke。
- OpenAI real smoke。

Loop 109でlocalhost-only mock deploymentを実施する。対象は `/var/www/amami-line-crm`、`/etc/amami-line-crm/*.env`、`amami-line-crm-api.service`、`amami-line-crm-admin.service`、`127.0.0.1:8788` / `127.0.0.1:3002` local smokeだけ。Nginx設定、`nginx -t`、reload、certbot、LINE webhook、LINE/OpenAI/Supabase実接続は未実施のまま維持する。

Loop 109 smokeで、API/Adminのstart境界とworkspace package exportsはVPS上の実build出力に合わせて補正した。これによりlocalhost-only reviewは前進するが、public production deployment remains No-Go until nginx/SSL/external smoke/Auth/LINE/OpenAI production gates are completed.

## Secret Handling

docs、dev log、test snapshot、error responseに以下を書かない。

- Supabase URL/key/project ref/DB URL/password。
- Authorization token。
- JWT secret。
- LINE channel token / secret。
- LINE userId実値。
- OpenAI API key。
- 実顧客情報。

## Rollback / Recovery

- production deploy前にDB backup、migration rollback/recovery、service role grant recovery、feature flag rollbackを確認する。
- LINE/OpenAI real enablementはfeature flagsで停止できる状態にする。
- production smokeはsafe tenant / safe recipient / dummy dataに限定する。

## Manual Checks Before Production Enablement

- production env valuesは値非表示でpresence/safetyだけ確認する。
- Admin loginで実Bearer tokenを取得し、表示しない。
- Loop 105時点ではfake auth client境界のみのため、real login smokeは未実施として扱う。
- VPS deploymentはLoop 109でlocalhost-only review配置まで進めるが、Nginx公開、SSL、external smoke、LINE webhook、LINE/OpenAI/Supabase実接続は未実施として扱う。
- Loop 110ではAdmin UIをモバイルファーストに刷新するが、API/Auth/RLS/LINE/OpenAI gateやVPS配置は変更しない。VPS localhost-only review環境は旧commitのままで、UI反映には別Loopの再配置が必要。
- Loop 111ではAdmin mobile UIをVPS localhost-only review環境へ再配置し、Browser smokeで横スクロールなし、主要routeの致命的エラーなし、localhost-only bind維持を確認した。Nginx公開、HTTPS、DNS、external smoke、LINE/OpenAI/Supabase実接続は未実施のまま。
- Loop 112ではNginx reverse proxy dry-run planとplaceholder exampleを追加し、`/etc/nginx/sites-available/amami-line-crm.conf` へcandidateを配置して `nginx -t` 成功を確認した。`sites-enabled` 作成、Nginx reload/restart、certbot、DNS変更、public公開は未実施のまま。
- Loop 113では一時的に `/etc/nginx/sites-enabled/amami-line-crm.conf` symlinkを作成し、Nginx include tree全体で `nginx -t` 成功を確認した。確認後symlinkは削除済みで、Nginx reload/restart、certbot、DNS変更、public公開は未実施のまま。
- Loop 114では `amami-line-crm.invalid` のまま一時的に `/etc/nginx/sites-enabled/amami-line-crm.conf` symlinkを作成し、`nginx -t` 後に `sudo systemctl reload nginx` を実行した。Host header smokeで `/api/health` が `404` となったためNo-Goとして扱い、symlink削除、`nginx -t`、rollback reloadを実行済み。実ドメイン、DNS、HTTPS/certbot、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 115では `127.0.0.1:18080` のstandalone localhost-only NginxでHost header routingを診断し、candidate route shapeでは `/api/health` が `200` になることを確認した。今後のserver block選択確認用に `X-Amami-Line-Crm-Proxy` diagnostic headerをcandidateへ追加したが、system Nginx reload/restart未実施、temporary symlink削除済み、real domain/DNS/HTTPS/public smokeは未実施。
- Loop 116では実ドメイン、DNS、HTTPS公開前のreadiness inventoryを追加した。canonical hostname、DNS provider、domain ownership、ACME method、certificate SAN、LINE webhook public URLは未決定のまま、placeholder-based HTTP/HTTPS examplesとread-only preflight helperだけを追加した。Nginx active config変更、reload/restart、certbot、DNS変更、external smokeは未実施。
- Loop 117ではreal domain decision and DNS provider confirmation planとして、domain decision packet、DNS provider checklist、production domain approval sheetを追加した。候補は分類したがcanonical hostnameは `unknown` のまま維持し、DNS query、DNS変更、Nginx active config変更、reload/restart、certbot、external smoke、LINE webhook登録は未実施。
- Loop 118では `admin.taiyolabel.site` を検証/管理用ホストとして承認し、TXTを除くread-only DNS confirmationを実施した。A recordは `160.251.174.201` と一致し、AAAA/CNAME/CAA/DSは未設定だった。NSから `dnsv.jp / GMO DNS` と推定したが、DNS ownerとrollback ownerは未確定。VPS read-only確認では `nginx -t` 成功、`sites-enabled` candidateなし、localhost API/Admin 200を確認した。Nginx reload/restart、certbot、DNS変更、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 119ではdomain and release approval recordとDNS/Nginx rollback owner checklistを追加した。`admin.taiyolabel.site` はreview/admin hostnameとして記録し、client-facing final hostnameはundecidedのまま。DNS owner、DNS rollback owner、Nginx enable approver、Certificate approver、ACME method、LINE webhook approver、Maintenance window、Final Go/No-Go ownerが未確定のため、actual enable、certbot、HTTPS、external smokeへ進めない。
- Loop 120ではrelease candidateとrollback candidateを明示し、VPS localhost-only review環境のsource整合を監査した。VPS deployed sourceは `176cb34fc6059ecabfb9826daacaabc2a437bebe` のままで、release directoryがcopy-basedかつ `.git` なしだったため `git pull --ff-only origin main` は未実行。evidenceは `/root/deploy-backups/amami-line-crm/loop120-20260626-174138` に保存し、direct API `/health`、Admin `/login` / `/select-tenant` / `/customers` / `/alerts` は既存sourceで `200`。Nginx reload/restart、DNS、certbot、HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 121ではcopy-based release archiveをVPS stagingへ転送し、checksum一致、`.env*` 除外、install、lint、typecheck、buildを確認した。しかしfull `test` がcopy-based/no-env-template/Node.js 20 compatibilityで失敗したため、active source更新、systemd restart、Nginx reload/restartへ進まずNo-Goとした。active sourceは `176cb34fc6059ecabfb9826daacaabc2a437bebe` のまま。evidenceは `/root/deploy-backups/amami-line-crm/loop121-20260626-180347` に保存した。
- Loop 121.1ではcopy-based staging test compatibility patchを追加し、patched archive `loop1211-20260626-185306` をVPS stagingで検証した。staging sourceは `.git` / `.env*` なしで、`install --frozen-lockfile`、`lint`、`typecheck`、`test`、`test:integration`、`build` が成功した。ただしactive source更新、systemd restart、Nginx reload/restart、DNS、certbot、HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施で、active sourceは `176cb34fc6059ecabfb9826daacaabc2a437bebe` のまま。
- Loop 122ではcopy-based release archiveを `.env*` / `.git` / `node_modules` なしで再作成し、VPS staging `/root/deploy-staging/amami-line-crm/loop122-extract-20260626-190958/source` で `install --frozen-lockfile`、`lint`、`typecheck`、`test`、`test:integration`、`build` を成功させた。active source backupは `/root/deploy-backups/amami-line-crm/loop122-20260626-190958/active-source-before.tar`、active source afterは `2a9a746940b5f7a707af4c042bb9225d3dea258b`。active `.env*` はファイル名のみ前後一致を確認し、既存 `amami-line-crm-api.service` / `amami-line-crm-admin.service` をrestart、API `/health` とAdmin `/login` / `/select-tenant` / `/customers` / `/alerts` はlocalhostで `200`。Nginx reload/restart、DNS、certbot、HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- Loop 123ではcorrected Nginx candidateを `amami-line-crm.invalid` のまま一時 `sites-enabled` symlinkでincludeし、`sudo nginx -t` と `sudo systemctl reload nginx` を実行した。Host header smokeは `/` が `200`、`/api/health` が `404` で、`X-Amami-Line-Crm-Proxy` diagnostic headerもabsentだったためNo-Go。cleanup trapでsymlink削除、rollback `nginx -t`、rollback reloadを実行し、direct API `/health` とAdmin `/login` は `200` へ戻った。実ドメイン、DNS、certbot/HTTPS、external smoke、LINE/OpenAI/Supabase実接続は未実施。
- selectedTenantIdのmissing/wrong/validを確認する。
- productionでdev headerが拒否されることを確認する。
- LINE/OpenAI flagsはoffのまま起動確認する。
- real enablementは別Loopの明示許可で行う。

## Final Judgment

`production_no_go`

理由:

- Admin UIのsession境界はfake auth clientで検証済みだが、実Supabase Auth client注入とreal login/session/token smokeが未完了。
- LINE本送信はgate済みだが、実送信UI、実transport、安全なrecipient smoke、永続audit/idempotency storeが未完了。
- OpenAI real API gateとfake transport境界は追加済みだが、実HTTP transport、本番接続、cost/rate limit運用は未完了。
- VPS deployment plan/templates、production start/port boundary、dry preflight command pack、localhost-only review配置、Nginx include dry-run final gate、Nginx reload rollback dry-run、Host header routing diagnosis、Domain/DNS/HTTPS readiness inventory、approved domain DNS inventory、domain/release approval record、release commit alignment record、copy-based archive deploy attempt、copy-based staging test compatibility patch、active localhost-only copy-based redeploy、corrected Nginx candidate reload smokeは追加済み。Loop 123でcorrected candidate reload smokeを再実施したが `/api/health` が `404` でdiagnostic headerもabsentのため、live server selection/routingは未解決。DNS owner、DNS rollback owner、Nginx enable approver、Certificate approver、ACME method、LINE webhook approver、Maintenance window、Final Go/No-Go owner、client-facing final hostnameも未確定で、actual enable、HTTPS発行、external smoke、LINE webhook登録、production secret injectionは未実施。

この判定は、Loop 123時点でもcontrolled production enablementへ進むにはNginx live routing診断、追加Loop、人間承認が必要であることを示す。
