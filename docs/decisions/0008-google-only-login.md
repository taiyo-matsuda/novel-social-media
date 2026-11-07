# 0008 ログインを Google だけにする

2026-11-07

## 決めたこと

- メールアドレス＋パスワードでの登録とログインをなくし、ログインは **Google だけ** にする。サーバーは Better Auth の `emailAndPassword` を無効にし、`/api/auth/sign-up/email` と `/api/auth/sign-in/email` は使えない
- アプリのログイン画面は「Googleで続ける」だけ。退会は、Google でログインし直してからパスワードなしで `POST /api/auth/delete-user` を呼ぶ（[0005](0005-google-login.md) の Google の人向けの流れ）
- 運営の管理画面（`/admin`）も Google でログインする。ページに Google のボタン（Google Identity Services）を置き、受け取った ID トークンをアプリと同じ `/api/auth/sign-in/social` に送る。権限はアカウントの役割（`user.role = 'admin'`）で決める
- パスワードのハッシュ（PBKDF2）と、メールアドレス・パスワードの入力チェックは消した

## 理由

- 確認メールを送らないので、他人のメールアドレスでも登録できてしまっていた。Google なら本人のメールアドレスであることを Google が保証する
- パスワードを忘れた人への対応（再設定メール）を作らなくてよい
- 本番にはメールアドレスで登録したアカウントが1件もなかったので、移行は要らない

## 気をつけること

- App Store に出す前に「Sign in with Apple」を足す（ほかのサービスのログインだけを出すアプリには Apple が求める）
- 管理画面の Google ボタンには、Google Cloud の Web クライアントIDの「承認済みの JavaScript 生成元」に本番の URL が入っている必要がある（[deploy.md](../deploy.md)）
- `account` 表の `password` 列は残っている（Better Auth の表なので消さない）
