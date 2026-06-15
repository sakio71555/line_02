# Beginner-Friendly POP Admin UI Direction

## Purpose

このドキュメントは、管理画面を初心者でも迷わず使えるPOPで分かりやすいUIへ育てるための方針です。

対象はアマミホームのスタッフ、営業担当、LINE相談対応者、AIやRAGに詳しくない利用者です。専門的な管理ツールではなく、「お客様対応を安心して進めるための画面」として設計します。

## Basic Principles

- 最初に「次に何をすればよいか」が見える。
- 専門用語、英語、内部ID、開発者向け表現を主役にしない。
- POPで親しみやすくするが、業務画面として落ち着きと信頼感を残す。
- AI、LINE送信、tenant、権限、mock、未接続状態は誤解されないよう明示する。
- 危険操作は目立つ確認、補足、成功/失敗表示を置く。
- 初心者向けでも、tenant_id分離、外部API未接続、保存/未保存の境界は曖昧にしない。

## POP Direction

POP化は派手に飾ることではなく、見た瞬間に意味が分かる状態を増やすことです。

- 大きめの見出しと短い説明文で画面の目的を伝える。
- status、severity、response_mode、mock、未接続はバッジやラベルで見せる。
- テーブルだけでなく、重要な顧客状態やアクションはカード化する。
- ボタン文言は動詞から始める。
- 成功/失敗/注意は色と文言の両方で伝える。
- 開発用表示は「デモ用」「一時保存」「本番未接続」などの日本語にする。
- 過度な装飾、子どもっぽい表現、意味のないアイコン多用は避ける。

## Terminology Replacement Policy

| Technical label | Beginner-friendly label |
| --- | --- |
| AI Summary | 相談内容をまとめる |
| AI Reply Draft | 返信文の下書きを作る |
| RAG | ホームページ情報から回答案を作る |
| Knowledge | 参考情報 |
| Source | 参考にした情報 |
| Mock | デモ用 |
| In-memory | 一時保存 |
| Tenant | 会社 / 利用先 |
| `tenant_id` | 利用先ID |
| `dev_header` | 開発用の確認モード |
| `authenticated_staff` | ログイン済みスタッフ |
| Role | 権限 |
| `owner` | 管理者 |
| `manager` | 店舗/チーム管理者 |
| `staff` | 担当者 |
| Permission denied | 権限がありません |
| Session expired | ログインの有効期限が切れました |
| response_mode | 対応モード |
| `human_required` | 担当者の確認が必要 |
| `human_active` | 担当者が対応中 |
| `bot_auto` | 自動対応中 |
| `emergency` | 至急対応 |
| `closed` | 対応完了 |

技術名は必要な場所に補助表示してよいですが、見出し、ボタン、主要説明では初心者向けラベルを優先します。

## AI Display Policy

- AIはお客様へ自動送信しない。
- AI要約は「担当者が内容を把握するための補助」として表示する。
- AI返信下書きは「担当者が確認してから送る文案」として表示する。
- 見積金額、土地価格、建売在庫、補助金可否、契約条件、保証判断は断定しない。
- `MockAiProvider` の結果は「デモ用AI結果」と表示する。
- OpenAI API未接続の場合は「本番AI未接続」と明示する。
- AI結果には、注意点、次に確認すること、担当者確認が必要かを近くに置く。

## RAG Display Policy

- 画面上では原則 `RAG` という言葉を主役にしない。
- 「ホームページ情報から回答案を作る」「参考情報つき回答案」と表現する。
- sourcesは「参考にした情報」として、タイトル、カテゴリ、抜粋、URLを表示する。
- sourceが0件の場合は「参考情報が見つかりませんでした。担当者確認が必要です。」のように案内する。
- 回答案は保存せず、LINE送信もしないことを明示する。
- 公式HP crawl、embedding、pgvector、本物のOpenAI APIが未接続なら、開発用注記にまとめて表示する。

## LINE And Staff Reply Policy

- 「下書き」と「送信」を同じ見た目にしない。
- 本番LINE送信前は「デモ用送信」「MockLineClient」と明示する。
- 本番LINE送信を接続するLoopでは、送信前確認を必須にする。
- AI下書きをそのまま送信する導線は作らない。担当者が編集/確認する流れを挟む。
- 送信成功後は、timelineにstaff messageが増えることを自然に確認できるようにする。

## Mock, Unconnected, Dev-Only Display Policy

初心者にとって `mock` や `in-memory` は分かりにくいため、以下の言い換えを使います。

- mock: デモ用
- in-memory: 一時保存
- unconnected: 本番未接続
- dev-only: 開発確認用
- placeholder: 準備中の画面

各画面では「今できること」と「まだできないこと」を短く分けます。長い技術説明は開発者向け詳細として折りたたむか、目立たない補足にします。

## Dangerous Operation Policy

以下の操作は後続UIでも安全表示を必ず置きます。

- 本物のLINE送信
- 担当者LINE通知
- AI下書きからの送信
- 顧客情報の変更
- alert通知
- tenant/利用先切り替え
- 権限変更
- 本番設定変更

危険操作では、実行前の説明、実行ボタンの明確な文言、成功/失敗表示、取り消しや再確認の導線を検討します。

## Screen-by-Screen Improvement Policy

### Admin Top

- 現在の役割はローカルデモの入口。
- 「まず何をするか」を大きなステップで表示する。
- `Local demo development UI`、`Demo flow`、`mock`、`in-memory` は日本語へ置き換える。
- 顧客一覧、アラート、ログイン準備中画面への導線を大きく分かりやすくする。

### Customer List

- 顧客IDを主役にせず、LINE表示名、相談状況、未返信/返信済みを主役にする。
- `status`、`response_mode`、timestampは初心者向けラベルに変換する。
- 未返信っぽい顧客は視覚的に分かるようにする。
- 空状態では「デモデータを入れてください」と次アクションを表示する。

### Customer Detail And Timeline

- 顧客詳細は「お客様情報」「対応状況」「会話履歴」に分ける。
- timelineは表だけでなく、会話らしい表示を優先する。
- AI/RAG/担当者返信は「担当者の作業」カードとしてまとめる。
- 保存されるもの、保存されないもの、送信されるものを近くに表示する。

### AI Summary

- 見出しは「相談内容をまとめる」。
- 結果はtimelineへ保存されることを明示する。
- 保存後にtimelineで見えることを画面上で案内する。

### AI Reply Draft

- 見出しは「返信文の下書きを作る」。
- 「保存しません」「LINE送信しません」を明示する。
- 次に確認すること、注意点、担当者対応が必要かを分かりやすく表示する。

### RAG Answer Draft

- 見出しは「ホームページ情報から回答案を作る」。
- `source` ではなく「参考にした情報」と表示する。
- sourceがない場合のfallbackも初心者向け文言にする。

### Staff Reply

- 見出しは「担当者として返信する」。
- 現在はデモ用送信であることを目立たせる。
- 本番LINE送信に進むLoopでは確認ステップを追加する。

### Alerts

- 見出しは「未返信アラート」。
- `open alert通知` ではなく「担当者に知らせる（デモ）」のように表現する。
- statusは「未対応」「通知済み」「解決済み」「非表示」などへ変換する。
- severityは「低」「中」「高」「至急」などへ変換する。

### Login Placeholder

- `Auth placeholder` ではなく「ログイン準備中」。
- Supabase Authなどの技術名は補足に寄せる。
- 入力しても送信されないことを分かりやすく伝える。

### Select Tenant

- `テナント選択` は「利用先を選ぶ」へ寄せる。
- `tenant_id`、`slug`、`domain` は開発者向け補足にする。
- 現在は保存されないことを明示する。

### Permission Denied And Session Expired

- 「権限がありません」「ログインの有効期限が切れました」と平易に表示する。
- 次に押すべきボタンを1つ以上用意する。
- 技術的なplaceholder説明は補足にする。

### Role Visibility Note

- `owner / manager / staff` をそのまま並べず、日本語の役割名とできることを説明する。
- まだ制御されていない場合は「現在は説明のみです」と明示する。

## Improvement Priorities

1. Admin topを初心者向けのデモ入口へ整理する。
2. Customer detailのAI/RAG/担当者返信カードをPOPで分かりやすくする。
3. Alerts pageの未返信チェック/通知mockを日本語の業務表現にする。
4. デモ用、一時保存、本番未接続の共通バッジを検討する。
5. 顧客一覧の未返信/返信済み/対応モードをバッジ化する。
6. role visibility、login、tenant selectionのplaceholder文言をやさしくする。

## Future UI Loop Candidates

- Loop 057: selectedTenantId transport boundary
- Loop 058: beginner-friendly Admin top polish
- Loop 059: customer detail action cards POP UI
- Loop 060: alerts page beginner-friendly polish
- Loop 061: mock/unconnected badge component
- Loop 062: AI/RAG copywriting polish
- Loop 063: staff reply safety confirmation plan
- Loop 064: role visibility friendly wording pass

Loop番号は後続の技術優先度に合わせて調整してよいですが、UI改善ではこのドキュメントを先に確認します。

