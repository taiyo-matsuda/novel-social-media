import Anthropic from "@anthropic-ai/sdk";

import {
  buildChapterPrompt,
  type ChapterRequest,
  type GeneratedChapter,
  type NovelGenerator,
  parseChapter,
  SYSTEM_PROMPT,
} from "@novel/core/ai";

export class AiRefusalError extends Error {}

export class ClaudeNovelGenerator implements NovelGenerator {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async generateChapter(req: ChapterRequest): Promise<GeneratedChapter> {
    // 章は長くなるのでストリーミングで受け取り、最後にまとめる
    const stream = this.client.beta.messages.stream({
      model: this.model,
      max_tokens: 64000,
      output_config: { effort: "medium" },
      // 安全分類器に断られたときは、サーバー側で別モデルに切り替えて続行する
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildChapterPrompt(req) }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new AiRefusalError("この内容では章を生成できませんでした");
    }
    const text = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("");
    return parseChapter(text);
  }
}
