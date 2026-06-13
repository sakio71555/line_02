# ADR-004: Domainless Dev With Tunnel

## Status

Accepted

## Context

LINE WebhookやLIFFを実機検証するには公開URLが必要です。ただし、Phase 0では本番ドメイン、SSL、LIFF本番登録まで進めません。

## Decision

開発段階では本番ドメインを使わず、ngrokまたはCloudflare TunnelでローカルAPIを一時公開します。Webhook pathは `LINE_WEBHOOK_SECRET_PATH` で推測されにくい値を使います。

## Consequences

- 本番インフラなしでLINE実機テストを始められる。
- tunnel URLは変わるため、LINE Developers側の設定更新が必要になる。
- 本番化時には固定ドメイン、SSL、監視、ログ、レート制限を別途設計する。
