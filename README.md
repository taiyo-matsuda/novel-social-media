# AI小説SNS（仮）

好みを伝えると、AIがあなた専用の小説を書き、公開して他の人と読み合えるスマホアプリです。

## 構成

- `apps/mobile`：スマホアプリ（Expo）
- `apps/web`：サーバー（Next.js。AI生成のAPI）
- `packages/core`：共有ロジック

## はじめかた

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local       # ANTHROPIC_API_KEY が空ならAIはフェイクで動く
cp apps/mobile/.env.example apps/mobile/.env.local
pnpm dev:web      # サーバー
pnpm dev:mobile   # アプリ（スマホの Expo Go でQRコードを読む）
```

DBは [Supabase](https://supabase.com/) を使います。`supabase/migrations/` のSQLをプロジェクトに適用してください。

## 開発

- まとめて確認：`pnpm check`
- 詳しいルールは [CLAUDE.md](CLAUDE.md)、設計は [docs/](docs/) を参照
