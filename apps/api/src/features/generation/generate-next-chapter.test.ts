import { FakeNovelGenerator } from "@novel/core/ai";
import { describe, expect, it } from "vitest";

import {
  type ChapterStore,
  generateNextChapter,
  WorkNotFoundError,
} from "./generate-next-chapter";

type MemoryWork = {
  userId: string;
  chapters: string[];
  storyNotes: string | null;
};

function memoryStore(): ChapterStore & { works: Map<string, MemoryWork> } {
  const works = new Map<string, MemoryWork>();
  return {
    works,
    loadPreference: async () => ({
      likedOpenings: ["雨の夜、古書店の扉が開いた。"],
      dislikedOpenings: [],
      learnedTraits: [],
    }),
    loadOwnWork: async (userId, workId) => {
      const work = works.get(workId);
      return work && work.userId === userId
        ? { chapters: [...work.chapters], storyNotes: work.storyNotes }
        : null;
    },
    createWork: async (userId) => {
      const id = `work-${works.size + 1}`;
      works.set(id, { userId, chapters: [], storyNotes: null });
      return id;
    },
    addChapter: async ({ workId, body, storyNotes }) => {
      const work = works.get(workId)!;
      work.chapters.push(body);
      if (storyNotes) work.storyNotes = storyNotes;
    },
  };
}

describe("generateNextChapter", () => {
  it("workId がなければ新しい作品の第1章を作る", async () => {
    const store = memoryStore();
    const generator = new FakeNovelGenerator();
    const res = await generateNextChapter({ store, generator }, "u1", {});

    expect(res.chapter.position).toBe(1);
    expect(store.works.get(res.workId)?.chapters).toHaveLength(1);
    expect(generator.requests[0].preference.likedOpenings).toHaveLength(1);
  });

  it("続きの章には過去の章と展開リクエストを渡す", async () => {
    const store = memoryStore();
    const generator = new FakeNovelGenerator();
    const first = await generateNextChapter({ store, generator }, "u1", {});
    const second = await generateNextChapter({ store, generator }, "u1", {
      workId: first.workId,
      plotRequest: "店主の秘密を明かして",
    });

    expect(second.chapter.position).toBe(2);
    // 前の章で残した創作メモを次の章に渡し、応答には含めない
    expect(generator.requests[1].storyNotes).toBe(
      "テスト用の創作メモ（第1章まで）",
    );
    expect(store.works.get(first.workId)?.storyNotes).toBe(
      "テスト用の創作メモ（第2章まで）",
    );
    expect(second.chapter).not.toHaveProperty("storyNotes");
    expect(generator.requests[1].previousChapters).toHaveLength(1);
    expect(generator.requests[1].plotRequest).toBe("店主の秘密を明かして");
  });

  it("他人の作品には続きを書けない", async () => {
    const store = memoryStore();
    const generator = new FakeNovelGenerator();
    const first = await generateNextChapter({ store, generator }, "u1", {});

    await expect(
      generateNextChapter({ store, generator }, "u2", { workId: first.workId }),
    ).rejects.toBeInstanceOf(WorkNotFoundError);
  });
});
