# Admin UI Mobile Review Checklist

## Purpose

Loop 110後の管理画面を、スマートフォン優先で確認するためのチェックリスト。これはUI確認用であり、LINE/OpenAI/Supabase/VPS公開を行う手順ではない。

## Viewports

以下の幅で確認する。

- 375 x 667
- 390 x 844
- 430 x 932
- 768 x 1024
- 1280 x 800

## Common Checks

- 横スクロールが出ない。
- 下部ナビが本文やボタンを隠さない。
- ボタン、リンク、checkboxのタップ領域が十分にある。
- focus-visibleが見える。
- 長い顧客名、本文、URL、IDが折り返される。
- error、empty、noticeの見た目が揃っている。
- 技術語ではなく「利用先」「一時保存」「デモ用」「デモ保存」が主表示になっている。

## Login / Logout

- `/login` では下部ナビが表示されない。
- 入力欄ラベルが見える。
- tokenやsecretが表示されない。
- `/logout` でも下部ナビが表示されない。

## Tenant Selection

- `/select-tenant` で「利用先」と表示される。
- 現在選択中の利用先が分かる。
- 保存、選択解除の操作が縦並びでも押しやすい。
- selectedTenantIdは権限ではなくselectorであることが短く分かる。

## Customers

- `/customers` は顧客カードとして表示される。
- 顧客名、対応状況、最新メッセージ、最終更新、担当者返信待ちが一目で分かる。
- 空状態でdemo seed再投入が必要なことが分かる。
- desktopではgridとして広がる。

## Customer Detail

- 顧客名と対応状況が先頭に出る。
- 重要情報がカードとして縦に読める。
- 戻る導線が見える。

## Timeline

- お客様発言は左側、担当者返信は右側、AI/systemは補助カードとして見える。
- 送信者、種類、日時が表示される。
- 長文が横にはみ出さない。

## AI Assistance

- AI要約、AI返信下書き、RAG回答案が「AI補助」としてまとまっている。
- 自動送信されないことが分かる。
- 回答案や参考情報が折り返される。

## Staff Reply

- textareaが十分な高さで表示される。
- 「送信前に確認する」が押しやすい。
- 確認カードで宛先、利用先、本文、送信種別が分かる。
- 「これはデモ保存です」が表示される。
- 「本物のLINEには送信されません」が表示される。
- checkboxのタップ領域が十分にある。

## Alerts

- `/alerts` はアラートカードとして表示される。
- 状態、重要度、種類、お客様リンク、内容、作成日時、デモ通知日時が分かる。
- open / notified / resolved / dismissed が色だけでなく文言で分かる。
- デモ通知であり、本物通知ではないことが分かる。

## Not Production

- API contractは変えない。
- Auth/RLS/Supabase runtimeは変えない。
- LINE real push gateは変えない。
- OpenAI real API gateは変えない。
- VPS localhost-only review環境へは、別Loopで再配置するまで反映されない。

## Loop 111 Browser Review Result

Loop 111でVPS localhost-only review環境へ再配置し、SSH tunnel経由で以下を確認した。

Checked viewports:

- 375 x 667
- 390 x 844
- 430 x 932
- 768 x 1024
- 1280 x 800

Checked pages:

- `/`
- `/login`
- `/select-tenant`
- `/customers`
- `/customers/customer_demo_yamada_taro`
- `/alerts`
- `/permission-denied`
- `/session-expired`

Result:

- 40 checks completed.
- 横スクロールなし。
- 致命的エラー表示なし。
- app pagesの下部/上部nav表示は維持。
- `/login` に不要なmain navは表示されない。
- 顧客カード、顧客詳細、タイムライン、アラートカードは読み取り可能。
- 「これはデモ保存です」「本物のLINEには送信されません」などの安全文言は維持。
- ページヘッダーの「トップへ戻る」「一覧へ戻る」は44px以上のtap targetへ修正済み。

Residual review item:

- `/permission-denied` などの準備画面リンクが一部説明文内でinline technical linkとして残る。主要操作ではないが、初心者向けには後続Loopでbutton風の「準備画面を見る」表示へ整理するとよい。
