# 設計

## 構成

```
スマホアプリ (apps/mobile, Expo)
   │  Better Auth でログイン（クッキーを端末の安全な保存領域に保存）
   │  すべての読み書き・AI生成：Cookie ヘッダー付きで API を呼ぶ
   ▼
サーバー (apps/api, Cloudflare Workers + Hono) ──► Claude API
   │  ログイン中の利用者IDで絞って読み書きする
   ▼
Cloudflare D1 (SQLite)
```

| 層           | 採用                                                        | 理由                                                                    |
| ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| スマホアプリ | Expo（React Native）+ Expo Router                           | iOS / Android を1つのコードで作れる。ビルドと申請はEASでクラウド実行    |
| サーバー     | Cloudflare Workers + Hono + TypeScript                      | AIのAPIキーを安全に持てる。世界中で近い場所から応答でき、無料枠が大きい |
| 共有ロジック | packages/core（TypeScript）                                 | 型・プロンプト・ランキングをアプリとサーバーで共有                      |
| DB           | Cloudflare D1（SQLite）                                     | Workers から設定なしで使える                                            |
| 認証         | Better Auth（メールアドレス＋パスワード）                   | D1 に直接つながり、Expo 用のクライアントがある                          |
| AI           | Claude API（`@anthropic-ai/sdk`）                           | 日本語の長文生成。モデルは `ANTHROPIC_MODEL` で切り替え                 |
| テスト       | Vitest                                                      | 速く、TypeScriptそのままで書ける                                        |
| ホスティング | Cloudflare Workers（サーバー）、EAS（アプリのビルド・配信） |                                                                         |

D1 には PostgreSQL の RLS のような仕組みがないので、「本人だけ書ける・ログイン者だけ読める」は API のコードで守る。アプリが DB に直接触ることはない。

## ログインと最初の画面

1. 未ログインならログイン画面（`apps/mobile/src/app/sign-in.tsx`）。メールアドレスとパスワードで登録・ログインする。確認メールは送らない（[決定記録](decisions/0003-cloudflare-better-auth.md)）
2. 好みが未入力なら冒頭文の画面（`openings.tsx`）。1つずつ「読みたい／読みたくない」を選び、`PUT /api/opening-choices/:id` で保存する
3. 好みを伝え終えたらホーム。どの画面を見せるかはルートの `_layout.tsx` が `Stack.Protected` で切り替える

## 小説生成の流れ

1. アプリが `POST /api/chapters` を呼ぶ（`apps/mobile/src/lib/api.ts`）
2. サーバーがログインを確かめ、入力を `generateChapterRequestSchema` で検証する
3. `generateNextChapter()` が好みと過去の章を集め、`NovelGenerator` に章を書かせる（APIキーがなければフェイク）
4. 生成した章を `chapters` に保存して返す

生成は数十秒かかることがある。アプリには進行中であることを表示する。

## AI呼び出しの方針

- 既定モデルは `claude-opus-5-5`、effort は `medium`。コストを見て `ANTHROPIC_MODEL` で調整する
- システムプロンプトはキャッシュ対象（`cache_control`）にして、毎回の入力コストを下げる
- 安全分類器で断られた場合はサーバー側フォールバック（`fallbacks: "default"`）で別モデルが続行する。それでも断られたら `AiRefusalError`（422）

## 今後決めること

- ランキング集計：`reading_events` を集計する API と、重い集計を定期実行（Cron Triggers）にするか
- 生成のジョブ化：Workers の1リクエストの時間に収まらなくなったら、Queues に入れて完了を通知する形に変える
- パスワードを忘れた人への対応（再設定メールを送るか）
