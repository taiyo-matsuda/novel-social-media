# 設計

## 構成

```
スマホアプリ (apps/mobile, Expo)
   │  Supabase Auth でログイン
   │  読み取り：Supabase に直接（RLSで保護）
   │  AI生成：Bearer トークン付きで API を呼ぶ
   ▼
サーバー (apps/web, Next.js Route Handler) ──► Claude API
   │  利用者本人のトークンで DB に書く
   ▼
Supabase (PostgreSQL + Auth)
```

| 層           | 採用                                                  | 理由                                                                 |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------- |
| スマホアプリ | Expo（React Native）+ Expo Router                     | iOS / Android を1つのコードで作れる。ビルドと申請はEASでクラウド実行 |
| サーバー     | Next.js（Route Handler）+ TypeScript                  | AIのAPIキーを安全に持てる。将来のWeb版もここに作れる                 |
| 共有ロジック | packages/core（TypeScript）                           | 型・プロンプト・ランキングをアプリとサーバーで共有                   |
| DB・認証     | Supabase（PostgreSQL + Auth）                         | RLSで「本人だけ書ける・ログイン者だけ読める」をDB側で守れる          |
| AI           | Claude API（`@anthropic-ai/sdk`）                     | 日本語の長文生成。モデルは `ANTHROPIC_MODEL` で切り替え              |
| テスト       | Vitest                                                | 速く、TypeScriptそのままで書ける                                     |
| ホスティング | Vercel（サーバー、予定）、EAS（アプリのビルド・配信） |                                                                      |

## 小説生成の流れ

1. アプリが `POST /api/chapters` を呼ぶ（`apps/mobile/src/lib/api.ts`）
2. サーバーがトークンを検証し、入力を `generateChapterRequestSchema` で検証する
3. `generateNextChapter()` が好みと過去の章を集め、`NovelGenerator` に章を書かせる（APIキーがなければフェイク）
4. 生成した章を `chapters` に保存して返す

生成は数十秒かかることがある。アプリには進行中であることを表示する。

## AI呼び出しの方針

- 既定モデルは `claude-opus-5-5`、effort は `medium`。コストを見て `ANTHROPIC_MODEL` で調整する
- システムプロンプトはキャッシュ対象（`cache_control`）にして、毎回の入力コストを下げる
- 安全分類器で断られた場合はサーバー側フォールバック（`fallbacks: "default"`）で別モデルが続行する。それでも断られたら `AiRefusalError`（422）

## ログインと最初の画面

1. 未ログインならログイン画面（`apps/mobile/src/app/sign-in.tsx`）。メールに届く6桁のコードでログインする（[決定記録](decisions/0002-login.md)）
2. 好みが未入力なら冒頭文の画面（`openings.tsx`）。1つずつ「読みたい／読みたくない」を選び、`opening_choices` に保存する
3. 好みを伝え終えたらホーム。どの画面を見せるかはルートの `_layout.tsx` が `Stack.Protected` で切り替える

## 今後決めること

- ランキング集計：`reading_events` は本人しか読めないので、集計はサーバー側（service role または集計ビュー）で行う
- 生成のジョブ化：生成が長くなったら、キューに入れて完了を通知する形に変える
