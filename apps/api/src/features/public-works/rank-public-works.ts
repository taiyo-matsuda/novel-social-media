import type { PublicWorkSummary } from "@novel/core/api";
import { ageHours, rankWorks } from "@novel/core/ranking";

/** ランキングに使う数字も持った公開作品 */
export type PublicWorkWithStats = PublicWorkSummary & {
  /** 最後の章まで読み終えた人数（作者本人は数えない） */
  completions: number;
};

/** 集計用の数字を落として、一覧に出す形にする */
export function toPublicSummary(w: PublicWorkWithStats): PublicWorkSummary {
  return {
    id: w.id,
    title: w.title,
    authorId: w.authorId,
    authorName: w.authorName,
    chapterCount: w.chapterCount,
    publishedAt: w.publishedAt,
    readers: w.readers,
    likes: w.likes,
  };
}

/** D1 の datetime('now')（"2026-10-28 01:00:00"、UTC）と ISO 形式のどちらも読む */
export function parseDbTime(value: string): Date {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

/**
 * 公開作品をランキング順に並べ、上位 [limit] 件を一覧の形にして返す。
 * 入力は新しい順に並んでいる前提（同点なら新しい作品が先に残る）。
 */
export function rankPublicWorks(
  works: PublicWorkWithStats[],
  now: Date,
  limit: number,
): PublicWorkSummary[] {
  const byId = new Map(works.map((w) => [w.id, w]));
  const ranked = rankWorks(
    works.map((w) => ({
      workId: w.id,
      readers: w.readers,
      completions: w.completions,
      likes: w.likes,
      ageHours: ageHours(parseDbTime(w.publishedAt), now),
    })),
  );
  return ranked
    .slice(0, limit)
    .map(({ workId }) => toPublicSummary(byId.get(workId)!));
}
