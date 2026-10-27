# AI小説SNS（仮）

好みを伝えると、AIがあなた専用の小説を書き、公開して他の人と読み合えるスマホアプリです。

## 構成

- `apps/mobile`：スマホアプリ（Expo）
- `apps/api`：サーバー（Cloudflare Workers。ログイン・DB・AI生成のAPI）
- `packages/core`：共有ロジック

## はじめかた

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars   # BETTER_AUTH_SECRET を埋める。ANTHROPIC_API_KEY が空ならAIはフェイクで動く
cp apps/mobile/.env.example apps/mobile/.env.local
pnpm --filter @novel/api db:migrate:local   # ローカルのDBを作る（初回とマイグレーション追加時）
pnpm dev:api      # サーバー（http://localhost:8787）
pnpm dev:mobile   # アプリ（スマホの Expo Go でQRコードを読む）
```

サーバーとDBは [Cloudflare](https://www.cloudflare.com/)（Workers と D1）、ログインは [Better Auth](https://www.better-auth.com/) を使います。本番に出す手順は [apps/api/CLAUDE.md](apps/api/CLAUDE.md) を参照してください。

## 開発

- まとめて確認：`pnpm check`
- 詳しいルールは [CLAUDE.md](CLAUDE.md)、設計は [docs/](docs/) を参照
