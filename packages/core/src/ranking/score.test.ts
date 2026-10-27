import { describe, expect, it } from "vitest";

import { rankingScore, rankWorks, type WorkStats } from "./score";

const base: WorkStats = {
  workId: "a",
  readers: 10,
  completions: 0,
  likes: 0,
  ageHours: 0,
};

describe("rankingScore", () => {
  it("読了と高評価が多いほど高い", () => {
    expect(rankingScore({ ...base, completions: 5 })).toBeGreaterThan(
      rankingScore(base),
    );
    expect(rankingScore({ ...base, likes: 1 })).toBeGreaterThan(
      rankingScore(base),
    );
  });

  it("同じ反応なら新しい作品ほど高い", () => {
    expect(rankingScore(base)).toBeGreaterThan(
      rankingScore({ ...base, ageHours: 48 }),
    );
  });
});

describe("rankWorks", () => {
  it("スコア順に並べ、元の配列は変えない", () => {
    const input = [
      { ...base, workId: "old", ageHours: 100 },
      { ...base, workId: "new" },
    ];
    expect(rankWorks(input).map((w) => w.workId)).toEqual(["new", "old"]);
    expect(input[0].workId).toBe("old");
  });
});
