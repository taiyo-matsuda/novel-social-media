import { describe, expect, it } from "vitest";

import {
  canFinish,
  isStuck,
  likedCount,
  nextOpening,
  type Opening,
} from "./deck";

const openings: Opening[] = [1, 2, 3, 4].map((id) => ({
  id,
  text: `冒頭文${id}`,
  genre: null,
}));

describe("nextOpening", () => {
  it("まだ答えていない最初の冒頭文を返す", () => {
    expect(nextOpening(openings, new Map())?.id).toBe(1);
    expect(nextOpening(openings, new Map([[1, true]]))?.id).toBe(2);
    expect(
      nextOpening(
        openings,
        new Map([
          [1, true],
          [3, false],
        ]),
      )?.id,
    ).toBe(2);
  });

  it("全部答えたら null", () => {
    const all = new Map(openings.map((o) => [o.id, true]));
    expect(nextOpening(openings, all)).toBeNull();
  });
});

describe("canFinish", () => {
  it("3つ以上答え、読みたいが1つ以上あれば始められる", () => {
    expect(
      canFinish(
        new Map([
          [1, true],
          [2, false],
          [3, false],
        ]),
      ),
    ).toBe(true);
  });

  it("答えが少なすぎると始められない", () => {
    expect(
      canFinish(
        new Map([
          [1, true],
          [2, true],
        ]),
      ),
    ).toBe(false);
  });

  it("全部読みたくないだと始められない", () => {
    const choices = new Map(openings.map((o) => [o.id, false]));
    expect(likedCount(choices)).toBe(0);
    expect(canFinish(choices)).toBe(false);
    expect(isStuck(openings, choices)).toBe(true);
  });
});
