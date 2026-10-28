import type { ReadingEventRecord, ReadingHistory } from "@novel/core/learning";

/** 行動学習に使う作品の数（最近触れた順） */
export const HISTORY_LIMIT = 20;

type WorkRow = {
  id: string;
  title: string;
  opening: string | null;
  chapter_count: number;
  liked: number;
};

type EventRow = ReadingEventRecord & { work_id: string };

/**
 * [userId] が他人の作品をどう読んだかを、最近触れた（読んだ・高評価した）順に集める。
 * 自分の作品の読み返しは好みの手がかりにならないので除く。
 * 非公開に戻された作品も、読んだ事実は好みとして使う（本文は返さず題名と書き出しだけ）
 */
export async function loadReadingHistories(
  db: D1Database,
  userId: string,
): Promise<ReadingHistory[]> {
  const { results: works } = await db
    .prepare(
      `with "touched" as (
         select c."work_id", e."created_at" as "at" from "reading_events" e
           join "chapters" c on c."id" = e."chapter_id"
           where e."user_id" = ?1
         union all
         select "work_id", "created_at" from "likes" where "user_id" = ?1
       )
       select w."id", w."title",
         (select substr("body", 1, 200) from "chapters"
            where "work_id" = w."id" order by "position" limit 1) as "opening",
         (select count(*) from "chapters" where "work_id" = w."id") as "chapter_count",
         exists (select 1 from "likes" where "user_id" = ?1 and "work_id" = w."id") as "liked"
       from "touched" t join "works" w on w."id" = t."work_id"
       where w."author_id" != ?1
       group by w."id"
       order by max(t."at") desc, w."id"
       limit ?2`,
    )
    .bind(userId, HISTORY_LIMIT)
    .all<WorkRow>();
  if (works.length === 0) return [];

  const { results: events } = await db
    .prepare(
      `select c."work_id", c."position", e."kind", e."progress"
       from "reading_events" e join "chapters" c on c."id" = e."chapter_id"
       where e."user_id" = ? and c."work_id" in (${works.map(() => "?").join(", ")})`,
    )
    .bind(userId, ...works.map((w) => w.id))
    .all<EventRow>();

  return works.map((w) => ({
    title: w.title,
    opening: w.opening ?? "",
    chapterCount: w.chapter_count,
    liked: w.liked === 1,
    events: events
      .filter((e) => e.work_id === w.id)
      .map(({ position, kind, progress }) => ({ position, kind, progress })),
  }));
}
