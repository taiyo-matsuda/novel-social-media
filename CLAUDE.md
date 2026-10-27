# AI小説SNS

読者が好みを伝えると、AIが自分専用の小説を書き、それを公開してユーザー同士で読み合うSNS。**主役はスマホアプリ**。
プロダクトの前提とMVP範囲は [docs/product.md](docs/product.md)、設計は [docs/architecture.md](docs/architecture.md) を読む。

## 構成（pnpm ワークスペースのモノレポ）

```
apps/mobile/    スマホアプリ（Expo + Expo Router）。画面はここに作る
apps/api/       サーバー（Cloudflare Workers + Hono）。ログイン・DB・AI生成のAPI
packages/core/  アプリとサーバーで共有するロジック（型・プロンプト・ランキング・APIの入出力）
apps/api/migrations/  DBスキーマ（Cloudflare D1）。追記のみ
docs/           プロダクト・設計・決定記録
```

各アプリ固有の注意は `apps/mobile/CLAUDE.md` と `apps/api/CLAUDE.md` にある。

## コマンド（リポジトリのルートで実行）

| 目的                                   | コマンド                              |
| -------------------------------------- | ------------------------------------- |
| まとめて確認（lint・型・整形・テスト） | `pnpm check`                          |
| スマホアプリの開発サーバー             | `pnpm dev:mobile`                     |
| サーバーの開発サーバー                 | `pnpm dev:api`                        |
| 1パッケージだけ                        | `pnpm --filter @novel/core test` など |
| 整形                                   | `pnpm format`                         |
| ビルド                                 | `pnpm build`                          |

作業を終える前に `pnpm check` を通す。CI（`.github/workflows/ci.yml`）も同じ内容に `pnpm build` を加えて実行する。

## 作業ルール

- **ロジックは `packages/core` か各アプリの `features/` に純粋関数として切り出し、`*.test.ts` を隣に置く。** テストを先に書くか、同時に書く。
- **アプリとサーバーでやり取りするデータの型とスキーマは `packages/core/src/api` に置く。** サーバーは受け取ったら必ず zod で検証する。
- **AIのAPIキーはアプリに入れない。** AI呼び出しは必ずサーバー（apps/api）経由。
- **テストで Claude API を呼ばない。** `FakeNovelGenerator`（`@novel/core/ai`）を使う。AIやDBを使う処理は依存を引数で受け取る形にする（例：`apps/api/src/features/generation`）。
- **プロンプトは `packages/core/src/ai/prompts.ts` に集める。** 変えたらテストの期待値も見直す。
- **DBの変更は新しいマイグレーションファイルで行う。** 既存のファイルは書き換えない。
- **アプリはDBに直接触らない。** 読み書きは必ず apps/api 経由。D1 には RLS がないので、利用者のデータを扱うクエリは必ずログイン中の利用者IDで絞る。`user` 表のメールアドレスを他人向けの API で返さない。
- **ログインは Better Auth（メールアドレス＋パスワード、確認メールなし）。** 方式を変えるときは `docs/decisions/` を更新する。
- **秘密情報をコードやログに出さない。** `.env.local` は読まない。新しい環境変数は各アプリの `.env.example` に追加する。
- MVP範囲外（課金・送金・翻訳・漫画連携）は、頼まれない限り実装しない。
- 大きな方針を決めたら `docs/decisions/` に短い記録を追加する。
- UIの文言は日本語。コード中の識別子は英語、コメントは日本語。

## 用語

| 用語           | 意味                                     | コード上の名前                 |
| -------------- | ---------------------------------------- | ------------------------------ |
| 冒頭文         | 好みを知るために見せる短い書き出し       | `openings`                     |
| 展開リクエスト | 読者が章ごとに出す「次はこうしてほしい」 | `plotRequest` / `plot_request` |
| 作品 / 章      | 公開単位 / 生成単位                      | `works` / `chapters`           |
| 行動学習       | 読了・離脱位置などから好みを推定すること | `reading_events`               |
