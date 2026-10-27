# apps/web（サーバー）

@AGENTS.md

## このアプリでのルール

- 当面の役割はスマホアプリ向けのAPI（`src/app/api/`）。Web版の画面は後のフェーズ
- Route Handler は薄く保つ。認証・入力検証・エラー変換だけを書き、処理は `src/features/` に置く
- アプリからの呼び出しは `Authorization: Bearer <Supabaseのトークン>` で認証する（`src/lib/supabase/bearer.ts`）。本人のトークンでDBに触るので RLS が効く
- サーバー専用のコード（`serverEnv()`、`ClaudeNovelGenerator`）をクライアントコンポーネントから import しない
