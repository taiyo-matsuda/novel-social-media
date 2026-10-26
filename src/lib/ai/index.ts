import { ClaudeNovelGenerator } from "./claude";
import { FakeNovelGenerator } from "./fake";
import type { NovelGenerator } from "./types";

export type * from "./types";

/** APIキーがなければフェイクを返す。キー未設定のローカル開発でも画面を動かせる。 */
export function createNovelGenerator(): NovelGenerator {
  return process.env.ANTHROPIC_API_KEY
    ? new ClaudeNovelGenerator()
    : new FakeNovelGenerator();
}
