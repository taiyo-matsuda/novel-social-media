# 設計

## 構成

```
スマホアプリ (apps/mobile, Flutter)
   │  Better Auth でログイン（トークンを端末の安全な保存領域に保存）
   │  すべての読み書き・AI生成：Authorization: Bearer 付きで API を呼ぶ
   ▼
サーバー (apps/api, Cloudflare Workers + Hono) ──► Claude API
   │  ログイン中の利用者IDで絞って読み書きする
   ▼
Cloudflare D1 (SQLite)
```

| 層           | 採用                                                              | 理由                                                                    |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| スマホアプリ | Flutter（Dart）                                                   | iOS / Android を1つのコードで作れる。Mac の Xcode でビルドする          |
| サーバー     | Cloudflare Workers + Hono + TypeScript                            | AIのAPIキーを安全に持てる。世界中で近い場所から応答でき、無料枠が大きい |
| 共有ロジック | packages/core（TypeScript）                                       | サーバー側の型・プロンプト・ランキング。アプリは Dart で書き写す        |
| DB           | Cloudflare D1（SQLite）                                           | Workers から設定なしで使える                                            |
| 認証         | Better Auth（メールアドレス＋パスワード、bearer プラグイン）      | D1 に直接つながる。アプリはトークンを Bearer で送る                     |
| AI           | Claude API（`@anthropic-ai/sdk`）                                 | 日本語の長文生成。モデルは `ANTHROPIC_MODEL` で切り替え                 |
| テスト       | Vitest（サーバー）、flutter test（アプリ）                        |                                                                         |
| ホスティング | Cloudflare Workers（サーバー）、App Store / Google Play（アプリ） |                                                                         |

D1 には PostgreSQL の RLS のような仕組みがないので、「本人だけ書ける・ログイン者だけ読める」は API のコードで守る。アプリが DB に直接触ることはない。

## ログインと最初の画面

1. 未ログインならログイン画面（`apps/mobile/lib/features/auth/sign_in_screen.dart`）。メールアドレスとパスワードで登録・ログインする。確認メールは送らない（[決定記録](decisions/0003-cloudflare-better-auth.md)）
2. 好みが未入力なら冒頭文の画面（`lib/features/openings/openings_screen.dart`）。1つずつ「読みたい／読みたくない」を選び、`PUT /api/opening-choices/:id` で保存する
3. 好みを伝え終えたらホーム。どの画面を見せるかは `lib/main.dart` が `AuthController` の状態を見て切り替える

## 小説生成の流れ

1. アプリが `POST /api/chapters` を呼ぶ。第1章は「新しい小説」画面（`lib/features/writing/new_work_screen.dart`）から「どんな話を読みたいか」を、続きは作品の画面（`work_screen.dart`）から「次はこうしてほしい」を、どちらも任意で `plotRequest` として送る
2. サーバーがログインを確かめ、入力を `generateChapterRequestSchema` で検証する
3. `generateNextChapter()` が好みと過去の章を集め、`NovelGenerator` に章を書かせる（APIキーがなければフェイク）
4. 生成した章を `chapters` に保存して返す

生成は数十秒かかることがある。アプリには進行中であることを表示する。

## 自分の作品

| API                        | 内容                                                   |
| -------------------------- | ------------------------------------------------------ |
| `GET /api/works`           | 本人の作品を、最後に章が増えた順に返す（ホームの一覧） |
| `GET /api/works/:workId`   | 本人の作品と全章、各章の展開リクエスト                 |
| `PATCH /api/works/:workId` | 題名の変更（`title`）と公開・非公開（`published`）     |

どれも `author_id` をログイン中の利用者IDで絞る（`apps/api/src/features/works/d1-works-store.ts`）。他人の作品は 404 にする。

## みんなの作品（他人の公開作品を読む）

ログイン後の画面は下のタブで「みんなの作品」（`lib/features/reading/public_works_screen.dart`）と「書く」（ホーム）を切り替える（`lib/features/home/main_shell.dart`）。

| API                                    | 内容                                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/public-works`                | 公開作品をランキング順に50件。題名・作者名・章の数・読んだ人数・高評価の数                                                                                                  |
| `GET /api/public-works/:workId`        | 公開作品と全章（ログイン必須）。展開リクエストは作者のメモなので返さない                                                                                                    |
| `POST /api/public-works/:workId/reads` | 章を読み始めた（`start`）・読み終えた（`complete`）・読み終えずに離れた（`leave` と読了率 `progress`）。同じ人・章・種類は1回だけで、離脱はいちばん先まで読んだ読了率を残す |
| `PUT /api/public-works/:workId/like`   | 高評価を付ける・外す（`liked`）。自分の作品には付けられない（403）                                                                                                          |

- 下書きに戻した作品はどの API でも 404。作者は `user.name` だけ返し、メールアドレスは返さない
- ランキングは新しく公開された200件を `rankWorks()`（`packages/core/src/ranking/score.ts`）で並べる（`apps/api/src/features/public-works/rank-public-works.ts`）。読者数・読了数は作者本人を数えず、読了は最後の章を読み終えた人
- 読む画面（`lib/features/reading/reading_screen.dart`）は1章ずつ表示し、章を開いたら `start`、終わりまで送ったら `complete`、読み終えずに別の章へ移るか画面を閉じたら `leave` とどこまで読んだか（`readProgress()`）を送る。自分の作品の読み返しは送らない

## 行動学習（読み方を次の生成に反映する）

章を生成するとき、`d1ChapterStore().loadPreference()` が冒頭文の選択に加えて、その人が他人の作品をどう読んだかを集め（`apps/api/src/features/learning/d1-reading-histories.ts`、最近触れた20作品）、`inferLearnedTraits()`（`packages/core/src/learning/traits.ts`）で「読者の傾向」の文に変えてプロンプトに入れる。

- 好きな作品：高評価した、または最後の章まで読み終えた作品
- 合わなかった作品：読み終えずに離れた作品（離れた章と読了率付き）。高評価した作品や、離れた章より先を読み終えた作品は含めない
- どちらも新しい順に3件まで、題名と第1章の書き出しを添える。プロンプトでは「雰囲気は取り入れ、文章はまねしない」と指示する
- 自分の作品の読み返しは使わない。非公開に戻った作品も、読んだ事実は好みとして使う

アプリが強制終了されたときは `leave` が送られないことがある（読み始めだけ残り、何も推定しない）。

## AI呼び出しの方針

- 既定モデルは `claude-opus-5-5`、effort は `medium`。コストを見て `ANTHROPIC_MODEL` で調整する
- システムプロンプトはキャッシュ対象（`cache_control`）にして、毎回の入力コストを下げる
- 安全分類器で断られた場合はサーバー側フォールバック（`fallbacks: "default"`）で別モデルが続行する。それでも断られたら `AiRefusalError`（422）

## 今後決めること

- ランキング集計：いまはリクエストごとに集計している。作品が増えたら定期実行（Cron Triggers）で集計して保存する形に変える
- 行動学習の精度：いまは題名と書き出しを渡すだけ。データが増えたら、ジャンルや章の長さの傾向も推定する
- 生成のジョブ化：Workers の1リクエストの時間に収まらなくなったら、Queues に入れて完了を通知する形に変える
- パスワードを忘れた人への対応（再設定メールを送るか）
