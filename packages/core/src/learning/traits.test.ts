import { describe, expect, it } from "vitest";

import {
  inferLearnedTraits,
  TRAITS_PER_KIND,
  type ReadingEventRecord,
  type ReadingHistory,
} from "./traits";

function history(
  title: string,
  events: ReadingEventRecord[],
  extra: Partial<ReadingHistory> = {},
): ReadingHistory {
  return {
    title,
    opening: `${title}の書き出し`,
    chapterCount: 2,
    liked: false,
    events,
    ...extra,
  };
}

const start = (position: number): ReadingEventRecord => ({
  position,
  kind: "start",
  progress: null,
});
const complete = (position: number): ReadingEventRecord => ({
  position,
  kind: "complete",
  progress: null,
});
const leave = (position: number, progress: number): ReadingEventRecord => ({
  position,
  kind: "leave",
  progress,
});

describe("inferLearnedTraits", () => {
  it("記録がなければ何も返さない", () => {
    expect(inferLearnedTraits([])).toEqual([]);
  });

  it("高評価した作品と最後まで読んだ作品を好きな作品として返す", () => {
    expect(
      inferLearnedTraits([
        history("古書店", [start(1)], { liked: true }),
        history("灯台", [start(1), complete(1), start(2), complete(2)]),
        history("雪国", [start(1), complete(1), start(2), complete(2)], {
          liked: true,
        }),
      ]),
    ).toEqual([
      "高評価した作品：「古書店」（書き出し：古書店の書き出し）",
      "最後まで読んだ作品：「灯台」（書き出し：灯台の書き出し）",
      "高評価した・最後まで読んだ作品：「雪国」（書き出し：雪国の書き出し）",
    ]);
  });

  it("読み終えずに離れた作品を、離れた位置付きで返す", () => {
    expect(
      inferLearnedTraits([
        history("迷宮", [start(1), complete(1), start(2), leave(2, 0.34)]),
        history("砂漠", [start(1), leave(1, 0.02)]),
      ]),
    ).toEqual([
      "途中で読むのをやめた作品（第2章の3割ほどで離脱）：「迷宮」（書き出し：迷宮の書き出し）",
      "途中で読むのをやめた作品（第1章の冒頭で離脱）：「砂漠」（書き出し：砂漠の書き出し）",
    ]);
  });

  it("好きな作品を先に並べる", () => {
    expect(
      inferLearnedTraits([
        history("砂漠", [start(1), leave(1, 0.5)]),
        history("古書店", [], { liked: true }),
      ]).map((t) => t.split("：")[0]),
    ).toEqual([
      "高評価した作品",
      "途中で読むのをやめた作品（第1章の5割ほどで離脱）",
    ]);
  });

  it("あとで読み終えた章の離脱は数えない", () => {
    expect(
      inferLearnedTraits([
        history("迷宮", [start(1), leave(1, 0.3), complete(1)], {
          chapterCount: 3,
        }),
        history("霧", [leave(1, 0.3), complete(2)], { chapterCount: 3 }),
      ]),
    ).toEqual([]);
  });

  it("読み始めただけで離脱の記録がない作品は何も言わない", () => {
    expect(inferLearnedTraits([history("迷宮", [start(1)])])).toEqual([]);
  });

  it("高評価した作品は途中でやめていても好きな作品として扱う", () => {
    expect(
      inferLearnedTraits([
        history("古書店", [start(1), leave(1, 0.5)], { liked: true }),
      ]),
    ).toEqual(["高評価した作品：「古書店」（書き出し：古書店の書き出し）"]);
  });

  it("種類ごとに新しいものから数件だけ返す", () => {
    const likedWorks = Array.from({ length: 5 }, (_, i) =>
      history(`好き${i}`, [], { liked: true }),
    );
    const leftWorks = Array.from({ length: 5 }, (_, i) =>
      history(`離脱${i}`, [leave(1, 0.5)]),
    );
    const traits = inferLearnedTraits([...likedWorks, ...leftWorks]);
    expect(traits).toHaveLength(TRAITS_PER_KIND * 2);
    expect(traits[0]).toContain("好き0");
    expect(traits[TRAITS_PER_KIND]).toContain("離脱0");
  });

  it("長い題名と書き出しは1行に縮めて切る", () => {
    const [trait] = inferLearnedTraits([
      history("あ".repeat(50), [], {
        liked: true,
        opening: `一行目\n\n二行目${"い".repeat(100)}`,
      }),
    ]);
    expect(trait).toBe(
      `高評価した作品：「${"あ".repeat(40)}…」（書き出し：一行目 二行目${"い".repeat(53)}…）`,
    );
  });
});
