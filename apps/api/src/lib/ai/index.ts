import { FakeNovelGenerator, type NovelGenerator } from "@novel/core/ai";

import type { Env } from "../../env";
import { ClaudeNovelGenerator } from "./claude";

/** APIキーがなければフェイクを返す。キー未設定のローカル開発でも画面を動かせる。 */
export function createNovelGenerator(
  env: Pick<Env, "ANTHROPIC_API_KEY" | "ANTHROPIC_MODEL">,
): NovelGenerator {
  return env.ANTHROPIC_API_KEY
    ? new ClaudeNovelGenerator(
        env.ANTHROPIC_API_KEY,
        env.ANTHROPIC_MODEL || "claude-opus-5-5",
      )
    : new FakeNovelGenerator();
}
