import { describe, expect, it } from "vitest";

import {
  generateChapterRequestSchema,
  openingIdSchema,
  saveOpeningChoiceRequestSchema,
  updateWorkRequestSchema,
  workIdSchema,
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

describe("updateWorkRequestSchema", () => {
  it("題名と公開状態を受け付け、題名の前後の空白は取る", () => {
    expect(
      updateWorkRequestSchema.parse({ title: " 古書店 ", published: true }),
    ).toEqual({ title: "古書店", published: true });
  });

  it("空の題名や、何も変えないリクエストは弾く", () => {
    expect(updateWorkRequestSchema.safeParse({ title: "  " }).success).toBe(
      false,
    );
    expect(updateWorkRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("workIdSchema", () => {
  it("UUID だけ受け付ける", () => {
    expect(
      workIdSchema.safeParse("6f1c2b1e-3d4a-4c5b-8e9f-0a1b2c3d4e5f").success,
    ).toBe(true);
    expect(workIdSchema.safeParse("1").success).toBe(false);
  });
});
