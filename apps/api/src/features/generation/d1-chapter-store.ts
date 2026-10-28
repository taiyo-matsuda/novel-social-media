import { inferLearnedTraits } from "@novel/core/learning";

import { loadReadingHistories } from "../learning/d1-reading-histories";
import type { ChapterStore } from "./generate-next-chapter";

/** ChapterStore の D1 実装。D1 には RLS がないので、本人の作品かどうかをここで必ず確かめる */
export function d1ChapterStore(db: D1Database): ChapterStore {
  return {
    async loadPreference(userId) {
      const [{ results }, histories] = await Promise.all([
        db
          .prepare(
            `select o."text", c."wants_to_read"
             from "opening_choices" c join "openings" o on o."id" = c."opening_id"
             where c."user_id" = ?
             order by o."sort_order", o."id"`,
          )
          .bind(userId)
          .all<{ text: string; wants_to_read: number }>(),
        loadReadingHistories(db, userId),
      ]);
      const texts = (wants: number) =>
        results.filter((r) => r.wants_to_read === wants).map((r) => r.text);
      return {
        likedOpenings: texts(1),
        dislikedOpenings: texts(0),
        learnedTraits: inferLearnedTraits(histories),
      };
    },

    async loadOwnChapters(userId, workId) {
      const work = await db
        .prepare(`select 1 from "works" where "id" = ? and "author_id" = ?`)
        .bind(workId, userId)
        .first();
      if (!work) return null;
      const { results } = await db
        .prepare(
          `select "body" from "chapters" where "work_id" = ? order by "position"`,
        )
        .bind(workId)
        .all<{ body: string }>();
      return results.map((c) => c.body);
    },

    async createWork(userId, title) {
      const id = crypto.randomUUID();
      await db
        .prepare(
          `insert into "works" ("id", "author_id", "title") values (?, ?, ?)`,
        )
        .bind(id, userId, title)
        .run();
      return id;
    },

    async addChapter({ workId, position, title, body, plotRequest }) {
      await db
        .prepare(
          `insert into "chapters" ("id", "work_id", "position", "title", "body", "plot_request")
           values (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          workId,
          position,
          title,
          body,
          plotRequest ?? null,
        )
        .run();
    },
  };
}
