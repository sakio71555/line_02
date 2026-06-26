# Client / operations confirmation questions

## Purpose

Use these questions to collect human approval values before public launch work. Do not record secrets, `.env` values, private keys, LINE user IDs, real customer information, or production logs in answers.

## Domain / DNS

1. `admin.taiyolabel.site` を確認用URLとして使ってよいですか？
2. クライアント正式URLは別に用意しますか？
3. DNSを変更できる担当者は誰ですか？
4. DNSを戻す担当者は誰ですか？
5. DNS変更の希望日時はありますか？
6. AAAAレコードは使いますか？
7. CAAレコードを追加・変更してよいですか？

## HTTPS

1. 証明書の発行方式は HTTP-01 / DNS-01 のどちらにしますか？
2. 証明書の対象hostnameは何ですか？
3. 秘密鍵の保管責任者は誰ですか？
4. 証明書更新の責任者は誰ですか？

## Nginx / public enable

1. Nginx real-domain enable の承認者は誰ですか？
2. 作業時間帯はいつがよいですか？
3. 外部からの表示確認を誰が行いますか？
4. 失敗時にどこまで戻しますか？

## LINE

1. LINE公式アカウントの管理者は誰ですか？
2. Webhook URL登録を誰が承認しますか？
3. 本物LINE送信をいつ許可しますか？
4. Webhook secret pathの管理責任者は誰ですか？

## Supabase

1. staging Supabase projectはありますか？
2. service role keyの管理者は誰ですか？
3. RLS/migration適用の承認者は誰ですか？
4. staging接続テストをいつ許可しますか？

## Current No-Go Boundary

```txt
review_admin_hostname=admin.taiyolabel.site
client_facing_final_hostname=undecided
production_readiness=production_no_go
```

These questions do not authorize DNS changes, certbot/HTTPS, Nginx reload/restart, external smoke, LINE/OpenAI/Supabase real connections, or production secret injection.
