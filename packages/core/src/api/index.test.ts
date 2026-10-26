import { describe, expect, it } from "vitest";

import { generateChapterRequestSchema } from "./index";

describe("generateChapterRequestSchema", () => {
  it("新規作品の依頼は空でよい", () => {
    expect(generateChapterRequestSchema.parse({})).toEqual({});
  });

  it("長すぎる展開リクエストは弾く", () => {
    const result = generateChapterRequestSchema.safeParse({
      plotRequest: "あ".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
