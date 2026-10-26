# apps/mobile（スマホアプリ）

@AGENTS.md

## このアプリでのルール

- 画面は `src/app/`（Expo Router）。画面以外の部品やロジックは `src/` の別フォルダへ
- サーバーの呼び出しは `src/lib/api.ts` にまとめる。型は `@novel/core/api` から使う
- パッケージの追加は `pnpm --filter @novel/mobile exec expo install <名前>`（SDKに合うバージョンが入る）
- 確認は `pnpm --filter @novel/mobile lint` と `pnpm --filter @novel/mobile typecheck`
