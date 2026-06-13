# ADR-001: Multitenant From Start

## Status

Accepted

## Context

初期導入先はアマミホーム1社だけです。しかし、将来ほかの工務店へ販売する計画があります。後からマルチテナント化すると、DB schema、API認可、AI検索、LINE channel設定、管理画面権限を大きく作り直す必要があります。

## Decision

Phase 0からマルチテナント前提で設計します。`tenants` 以外の主要テーブルには `tenant_id` を持たせます。AI検索でも必ず `tenant_id` を先に絞ります。

## Consequences

- 初期実装は少し冗長になる。
- tenant_idの指定漏れをテストで検出しやすくなる。
- 他社追加時にDB再設計を避けやすい。
- AIに会社を選ばせる危険な設計を避けられる。
