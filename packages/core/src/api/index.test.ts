import { describe, expect, it } from "vitest";

import {
  generateChapterRequestSchema,
  openingIdSchema,
  saveOpeningChoiceRequestSchema,
} from "./index";

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

describe("saveOpeningChoiceRequestSchema", () => {
  it("真偽値だけ受け付ける", () => {
    expect(
      saveOpeningChoiceRequestSchema.safeParse({ wantsToRead: true }).success,
    ).toBe(true);
    expect(
      saveOpeningChoiceRequestSchema.safeParse({ wantsToRead: "yes" }).success,
    ).toBe(false);
  });
});

describe("openingIdSchema", () => {
  it("正の整数だけ受け付ける", () => {
    expect(openingIdSchema.parse("3")).toBe(3);
    expect(openingIdSchema.safeParse("0").success).toBe(false);
    expect(openingIdSchema.safeParse("abc").success).toBe(false);
  });
});
