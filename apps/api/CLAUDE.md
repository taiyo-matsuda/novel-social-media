# apps/api（サーバー）

Cloudflare Workers で動く API。フレームワークは Hono、DB は Cloudflare D1（SQLite）、ログインは Better Auth。

## このアプリでのルール

- 入口は `src/app.ts`。ここには認証・入力検証・エラー変換だけを書き、処理は `src/features/` に置く
- ログインは `src/lib/auth.ts`（Better Auth）。`/api/auth/*` は Better Auth が処理する。ログインが必要な API には `requireUser` を付け、`c.get("userId")` で本人のIDを使う
- **D1 には RLS がない。** 利用者のデータを読む・書くクエリは必ず userId で絞る。他人向けの API で `user` 表のメールアドレスを返さない
- スマホアプリ（Flutter）は登録・ログインの応答の `set-auth-token` ヘッダーを保存し、`Authorization: Bearer <トークン>` で送ってくる（Better Auth の bearer プラグイン）。ブラウザで試すときは `TRUSTED_ORIGINS` のオリジンだけ CORS を許可する
- Google ログインは ID トークン方式（`/api/auth/sign-in/social`）。`GOOGLE_CLIENT_IDS` に Web・iOS・Android のクライアントIDをカンマ区切りで入れる。空なら無効。テストでは `createApp({ auth: { verifyGoogleIdToken } })` で署名確認を差し替える
- パスワードのハッシュは `src/lib/password.ts`（PBKDF2）。Better Auth 標準の scrypt は Workers の無料枠のCPU時間を超えるので使わない
- DBを使う処理のテストは `src/test/fake-d1.ts`（Node 標準の SQLite でマイグレーションを流した D1 の代わり）を使う。`src/app.test.ts` のように `app.request()` で API ごと試せる
- 秘密情報は `wrangler.jsonc` に書かない。ローカルは `.dev.vars`（`.dev.vars.example` をコピー）、本番は `wrangler secret put`
- Better Auth のバージョンを上げて表が変わったら、`pnpm dlx @better-auth/cli generate` で出るSQLを新しいマイグレーションにする

## コマンド（このフォルダで実行）

| 目的                         | コマンド                            |
| ---------------------------- | ----------------------------------- |
| 開発サーバー                 | `pnpm dev`（http://localhost:8787） |
| ローカルDBにマイグレーション | `pnpm db:migrate:local`             |
| 本番DBにマイグレーション     | `pnpm db:migrate:remote`            |
| 本番に出す                   | `pnpm deploy`                       |

## 本番に出す手順（初回）

1. `pnpm exec wrangler login`
2. `pnpm exec wrangler d1 create novel-db` を実行し、表示された `database_id` を `wrangler.jsonc` に書く
3. `pnpm db:migrate:remote`
4. `pnpm exec wrangler secret put BETTER_AUTH_SECRET`（`openssl rand -base64 32` で作った値）、同様に `BETTER_AUTH_URL`（Workers のURL）と `ANTHROPIC_API_KEY`
5. `pnpm deploy`。スマホアプリは `flutter build ios --dart-define=API_URL=<そのURL>` のように URL を渡してビルドする
