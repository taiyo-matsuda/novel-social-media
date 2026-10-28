import { describe, expect, it } from "vitest";

import { ageHours, rankingScore, rankWorks, type WorkStats } from "./score";

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

  it("まだ誰も読んでいない作品どうしは新しい順になる", () => {
    const zero = { ...base, readers: 0 };
    const input = [
      { ...zero, workId: "old", ageHours: 30 },
      { ...zero, workId: "new", ageHours: 1 },
    ];
    expect(rankWorks(input).map((w) => w.workId)).toEqual(["new", "old"]);
  });
});

describe("ageHours", () => {
  it("公開からの経過時間を返し、未来の日時は 0 にする", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    expect(ageHours(new Date("2026-10-28T09:00:00Z"), now)).toBe(3);
    expect(ageHours(new Date("2026-10-28T13:00:00Z"), now)).toBe(0);
  });
});
