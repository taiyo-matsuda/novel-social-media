# AI小説SNS（仮）

好みを伝えると、AIがあなた専用の小説を書き、公開して他の人と読み合えるSNSです。

## はじめかた

```bash
pnpm install
cp .env.example .env.local   # 値を入れる（ANTHROPIC_API_KEY が空ならAIはフェイクで動く）
pnpm dev
```

DBは [Supabase](https://supabase.com/) を使います。`supabase/migrations/` のSQLをプロジェクトに適用してください。

## 開発

- まとめて確認：`pnpm check`
- 詳しいルールは [CLAUDE.md](CLAUDE.md)、設計は [docs/](docs/) を参照
