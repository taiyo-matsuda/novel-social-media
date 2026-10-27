# 0003 Supabase をやめて Cloudflare と Better Auth にする

- 日付：2026-10-27
- 状態：決定（[0001](0001-tech-stack.md) のサーバー・DB・認証と、[0002](0002-login.md) を置き換える）

## 決定

- サーバーは Next.js から **Cloudflare Workers + Hono** に変える（`apps/web` → `apps/api`）
- DB は Supabase（PostgreSQL）から **Cloudflare D1（SQLite）** に変える。マイグレーションは `apps/api/migrations/`
- ログインは **Better Auth** の **メールアドレス＋パスワード**。**確認メールは送らない**（登録するとすぐ使える）
- スマホアプリは `@better-auth/expo` でログイン状態のクッキーを `expo-secure-store`（Keychain / Keystore）に保存し、API を呼ぶときに付ける
- アプリは DB に直接触らない。読み書きはすべて API 経由で、API が利用者IDで絞る

## 理由

- taiyo が「Supabase ではなく Cloudflare、認証は Better Auth、メール認証はしない」と決めた
- Better Auth は D1 にそのままつながり、Expo 用のクライアントがある
- Next.js を Workers で動かすには追加の仕組み（OpenNext）が要る。当面のサーバーの役割は API だけなので、Workers 向けに作られた軽い Hono にした

## 注意

- **パスワードのハッシュは PBKDF2（Web Crypto）にした。** Better Auth 標準の scrypt は Workers 無料枠のCPU時間（1リクエスト10ms）を超えて失敗するため。Workers の上限に合わせ10万回にしている
- 確認メールがないので、他人のメールアドレスでも登録できてしまう。パスワード再設定や通知メールを送るようになったら、送る前にメールアドレスの確認を入れる
- パスワードを忘れた人を救う手段はまだない（再設定メールを送るなら、メール送信の仕組みが要る）
- Google・Apple でのログインは Better Auth に後から足せる（App Store では他社ログインを入れるなら Apple ログインも必須）

## 代わりに検討したもの

- Next.js のまま Workers に載せる（OpenNext）：将来の Web 版をまとめて作れるが、今は API しかなく、構成が重くなる
- Cloudflare 上で Supabase Auth を使い続ける：taiyo が Better Auth を選んだ
- Drizzle などの ORM：表が少ないうちは D1 の SQL を直接書くほうが依存が少ない。複雑になったら検討する
