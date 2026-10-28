import { describe, expect, it } from "vitest";

import {
  parseDbTime,
  rankPublicWorks,
  type PublicWorkWithStats,
} from "./rank-public-works";

const now = new Date("2026-10-28T12:00:00Z");

function work(
  id: string,
  publishedAt: string,
  stats: Partial<PublicWorkWithStats> = {},
): PublicWorkWithStats {
  return {
    id,
    title: `題 ${id}`,
    authorId: "author",
    authorName: "作者",
    chapterCount: 1,
    publishedAt,
    readers: 0,
    likes: 0,
    completions: 0,
    ...stats,
  };
}

describe("parseDbTime", () => {
  it("D1 の日時は UTC として読み、ISO 形式もそのまま読む", () => {
    expect(parseDbTime("2026-10-28 01:00:00").toISOString()).toBe(
      "2026-10-28T01:00:00.000Z",
    );
    expect(parseDbTime("2026-10-28T01:00:00Z").toISOString()).toBe(
      "2026-10-28T01:00:00.000Z",
    );
  });
});

describe("rankPublicWorks", () => {
  it("高評価や読了の多い作品を上にし、集計用の数字は一覧に出さない", () => {
    const ranked = rankPublicWorks(
      [
        work("new", "2026-10-28 11:00:00"),
        work("liked", "2026-10-28 06:00:00", { likes: 3, readers: 4 }),
      ],
      now,
      10,
    );
    expect(ranked.map((w) => w.id)).toEqual(["liked", "new"]);
    expect(ranked[0]).not.toHaveProperty("completions");
  });

  it("反応が同じなら新しい作品が先で、件数を絞れる", () => {
    const ranked = rankPublicWorks(
      [
        work("a", "2026-10-28 11:00:00"),
        work("b", "2026-10-27 11:00:00"),
        work("c", "2026-10-26 11:00:00"),
      ],
      now,
      2,
    );
    expect(ranked.map((w) => w.id)).toEqual(["a", "b"]);
  });
});
