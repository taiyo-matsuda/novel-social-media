# AI小説SNS

読者が好みを伝えると、AIが自分専用の小説を書き、それを公開してユーザー同士で読み合うSNS。
プロダクトの前提とMVP範囲は [docs/product.md](docs/product.md)、設計は [docs/architecture.md](docs/architecture.md) を読む。

@AGENTS.md

## コマンド

| 目的                                   | コマンド                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------- |
| 開発サーバー                           | `pnpm dev`                                                                |
| まとめて確認（lint・型・整形・テスト） | `pnpm check`                                                              |
| テストだけ                             | `pnpm test`（特定ファイルは `pnpm exec vitest run src/features/ranking`） |
| 整形                                   | `pnpm format`                                                             |
| 本番ビルド                             | `pnpm build`                                                              |

作業を終える前に `pnpm check` を通す。CI（`.github/workflows/ci.yml`）も同じ内容に `pnpm build` を加えて実行する。

## 構成

```
src/
  app/            Next.js App Router の画面・Route Handler。薄く保ち、ロジックは features へ
  features/<名前>/ 機能ごとのロジック・UI・テスト（例：ranking）
  lib/ai/         Claude API の窓口（NovelGenerator）とプロンプト
  lib/supabase/   Supabase クライアント（server.ts / client.ts）
  lib/env.ts      環境変数の読み取り（zodで検証）
supabase/migrations/  DBスキーマ。追記のみ
docs/             プロダクト・設計・決定記録
```

## 作業ルール

- **テストを先に書くか、同時に書く。** ロジックは純粋関数に切り出して `*.test.ts` を隣に置く。
- **テストで Claude API を呼ばない。** `FakeNovelGenerator`（`src/lib/ai/fake.ts`）を使う。AIを使う処理は `NovelGenerator` を引数で受け取る形にする。
- **プロンプトは `src/lib/ai/prompts.ts` に集める。** 変えたらテストの期待値も見直す。
- **DBの変更は新しいマイグレーションファイルで行う。** 既存のファイルは書き換えない。新しいテーブルには必ずRLSを有効にしてポリシーを書く。
- **秘密情報をコードやログに出さない。** `.env.local` は読まない。新しい環境変数は `.env.example` と `src/lib/env.ts` に追加する。
- **サーバー専用のコード（`serverEnv()`、`ClaudeNovelGenerator`）をクライアントコンポーネントから import しない。**
- MVP範囲外（課金・送金・翻訳・漫画連携）は、頼まれない限り実装しない。
- 大きな方針を決めたら `docs/decisions/` に短い記録を追加する。
- UIの文言は日本語。コード中の識別子は英語、コメントは日本語。

## 用語

| 用語           | 意味                                     | コード上の名前       |
| -------------- | ---------------------------------------- | -------------------- |
| 冒頭文         | 好みを知るために見せる短い書き出し       | `openings`           |
| 展開リクエスト | 読者が章ごとに出す「次はこうしてほしい」 | `plot_request`       |
| 作品 / 章      | 公開単位 / 生成単位                      | `works` / `chapters` |
| 行動学習       | 読了・離脱位置などから好みを推定すること | `reading_events`     |
