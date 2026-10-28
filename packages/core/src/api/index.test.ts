import { describe, expect, it } from "vitest";

import {
  generateChapterRequestSchema,
  openingIdSchema,
  recordReadRequestSchema,
  reportWorkRequestSchema,
  saveOpeningChoiceRequestSchema,
  setLikeRequestSchema,
  updateWorkRequestSchema,
  userIdSchema,
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

describe("recordReadRequestSchema", () => {
  it("章の番号と、読み始め・読了を受け付ける", () => {
    expect(
      recordReadRequestSchema.safeParse({ position: 1, kind: "start" }).success,
    ).toBe(true);
    expect(
      recordReadRequestSchema.safeParse({ position: 0, kind: "start" }).success,
    ).toBe(false);
    expect(
      recordReadRequestSchema.safeParse({ position: 1, kind: "skip" }).success,
    ).toBe(false);
  });

  it("離脱は 0〜1 の読了率が必要", () => {
    const leave = (progress?: number) =>
      recordReadRequestSchema.safeParse({
        position: 1,
        kind: "leave",
        progress,
      }).success;
    expect(leave(0.4)).toBe(true);
    expect(leave(0)).toBe(true);
    expect(leave(undefined)).toBe(false);
    expect(leave(1.2)).toBe(false);
  });
});

describe("setLikeRequestSchema", () => {
  it("真偽値だけ受け付ける", () => {
    expect(setLikeRequestSchema.safeParse({ liked: true }).success).toBe(true);
    expect(setLikeRequestSchema.safeParse({ liked: 1 }).success).toBe(false);
  });
});

describe("reportWorkRequestSchema", () => {
  it("決まった理由と、前後の空白を除いた補足を受け付ける", () => {
    expect(
      reportWorkRequestSchema.parse({ reason: "spam", detail: "  宣伝です " }),
    ).toEqual({ reason: "spam", detail: "宣伝です" });
    expect(reportWorkRequestSchema.parse({ reason: "other" })).toEqual({
      reason: "other",
    });
  });

  it("知らない理由や長すぎる補足は弾く", () => {
    expect(
      reportWorkRequestSchema.safeParse({ reason: "boring" }).success,
    ).toBe(false);
    expect(
      reportWorkRequestSchema.safeParse({
        reason: "other",
        detail: "あ".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("userIdSchema", () => {
  it("英数字と - _ だけの ID を受け付ける", () => {
    expect(userIdSchema.safeParse("aB3_x-9").success).toBe(true);
    expect(userIdSchema.safeParse("").success).toBe(false);
    expect(userIdSchema.safeParse("a/b").success).toBe(false);
    expect(userIdSchema.safeParse("a".repeat(65)).success).toBe(false);
  });
});
