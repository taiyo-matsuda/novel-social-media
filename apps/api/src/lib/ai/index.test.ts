import { FakeNovelGenerator } from "@novel/core/ai";
import { describe, expect, it } from "vitest";

import { ClaudeNovelGenerator } from "./claude";
import { createNovelGenerator } from "./index";

describe("createNovelGenerator", () => {
  it("APIキーがないときはフェイクを使う", () => {
    expect(createNovelGenerator({ ANTHROPIC_API_KEY: "" })).toBeInstanceOf(
      FakeNovelGenerator,
    );
  });

  it("APIキーがあれば Claude を使う", () => {
    expect(
      createNovelGenerator({ ANTHROPIC_API_KEY: "sk-test" }),
    ).toBeInstanceOf(ClaudeNovelGenerator);
  });
});
