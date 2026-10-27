# 0001 技術スタック

- 日付：2026-10-26
- 状態：決定（サーバー・DB・認証は [0003](0003-cloudflare-better-auth.md)、スマホアプリは [0004](0004-flutter.md) で変更）

## 決定

スマホアプリを主役にし、次のモノレポで作る。

- `apps/mobile`：Expo（React Native）でiOS / Androidアプリ
- `apps/web`：Next.js でAI生成などのAPIサーバー（将来のWeb版も）
- `packages/core`：共有ロジック
- DB・認証は Supabase、AIは Claude API

## 理由

- taiyo が「スマホアプリにしたい」と決めた
- AIのAPIキーはアプリに入れられないので、サーバーが別に必要。サーバーとアプリで型やプロンプトを共有するため、1つのリポジトリにまとめた
- Expo なら1つのコードで iOS / Android を作れ、Xcode なしでクラウドビルドできる

## 代わりに検討したもの

- Web先行（Next.js のみ）：最初に作ったが、スマホアプリが目標なので変更
- Expo だけ（API も Expo Router の API Routes で書く）：構成は一番小さいが、サーバー部分の実績と情報量で Next.js を選んだ
