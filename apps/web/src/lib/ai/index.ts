import { FakeNovelGenerator, type NovelGenerator } from "@novel/core/ai";

import { ClaudeNovelGenerator } from "./claude";

/** APIキーがなければフェイクを返す。キー未設定のローカル開発でも画面を動かせる。 */
export function createNovelGenerator(): NovelGenerator {
  return process.env.ANTHROPIC_API_KEY
    ? new ClaudeNovelGenerator()
    : new FakeNovelGenerator();
}
