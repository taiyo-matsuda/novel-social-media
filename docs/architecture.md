# 設計

## 構成

| 層            | 採用                              | 理由                                                        |
| ------------- | --------------------------------- | ----------------------------------------------------------- |
| フロント・API | Next.js（App Router）+ TypeScript | 画面とサーバー処理を1リポジトリで書ける                     |
| スタイル      | Tailwind CSS                      | 初期の画面づくりが速い                                      |
| DB・認証      | Supabase（PostgreSQL + Auth）     | RLSで「本人だけ書ける・ログイン者だけ読める」をDB側で守れる |
| AI            | Claude API（`@anthropic-ai/sdk`） | 日本語の長文生成。モデルは `ANTHROPIC_MODEL` で切り替え     |
| テスト        | Vitest + Testing Library          | 速く、TypeScriptそのままで書ける                            |
| ホスティング  | Vercel（予定）                    | Next.js と相性がよい                                        |

## 小説生成の流れ

1. 画面（Server Action）が読者の好みと過去の章を集める
2. `createNovelGenerator()` で `NovelGenerator` を取得する（APIキーがなければフェイク）
3. `buildChapterPrompt()` がプロンプトを組み立て、Claude がストリーミングで章を書く
4. `parseChapter()` でタイトルと本文に分け、`chapters` に保存する

生成は数十秒かかることがある。画面には進行中であることを表示する。

## AI呼び出しの方針

- 既定モデルは `claude-opus-5-5`、effort は `medium`。コストを見て `ANTHROPIC_MODEL` で調整する
- システムプロンプトはキャッシュ対象（`cache_control`）にして、毎回の入力コストを下げる
- 安全分類器で断られた場合はサーバー側フォールバック（`fallbacks: "default"`）で別モデルが続行する。それでも断られたら `AiRefusalError`

## 今後決めること

- ランキング集計：`reading_events` は本人しか読めないので、集計はサーバー側（service role または集計ビュー）で行う
- 生成のジョブ化：生成が長くなったら、キューに入れて完了を通知する形に変える
