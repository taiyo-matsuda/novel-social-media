# 0004 スマホアプリを Flutter（Dart）で作り直し、Mac で開発する

- 日付：2026-10-27
- 状態：決定（[0001](0001-tech-stack.md) のスマホアプリと、[0003](0003-cloudflare-better-auth.md) のアプリ側のログイン方法を置き換える）

## 決定

- スマホアプリ（`apps/mobile`）を Expo（React Native / TypeScript）から **Flutter（Dart）** に作り直す
- 開発は **Mac** で行う。iOS は Xcode とシミュレーター、Android は Android Studio のエミュレーターで動かす
- サーバー（Cloudflare Workers + Hono + D1）とログイン（Better Auth、メールアドレス＋パスワード、確認メールなし）はそのまま使う
- ログイン状態の受け渡しはクッキーから **Better Auth の bearer プラグイン**に変える。登録・ログインの応答の `set-auth-token` ヘッダーのトークンを `flutter_secure_storage`（Keychain / Keystore）に保存し、`Authorization: Bearer` で送る
- `packages/core`（TypeScript）はサーバー側の共有ロジックとして残す。アプリが使う型・定数・小さなロジック（冒頭文の判定、入力チェック、エラー文）は Dart に書き写す

## 理由

- taiyo が「Mac で進めたい。言語は Dart・Flutter にする」と決めた
- Better Auth には公式の Dart クライアントがない。bearer プラグインならクッキーを扱わずに HTTP だけで使え、Flutter から素直に呼べる

## 注意

- 型やルールがアプリ（Dart）とサーバー（TypeScript）で二重になる。`MIN_CHOICES`（3）と `MIN_PASSWORD_LENGTH`（8）、API の入出力の形は両方そろえる
- Flutter の SDK は `brew install --cask flutter` で入れた。iOS のビルドには CocoaPods も使う
- macOS のデスクトップ版は作っていない（必要になったら `flutter create --platforms=macos .` で足せる）

## 代わりに検討したもの

- Expo のまま続ける：TypeScript でサーバーと型を共有できるが、taiyo が Flutter を選んだ
- アプリからクッキーを扱う：`Set-Cookie` を自前で解析・保存する必要があり、bearer より壊れやすい
