import type { Opening } from "@novel/core/openings";

/** 冒頭文と、その答えの読み書き。どの利用者の答えかは必ず userId で絞る */
export function d1OpeningsStore(db: D1Database) {
  return {
    async listOpenings(): Promise<Opening[]> {
      const { results } = await db
        .prepare(
          `select "id", "text", "genre" from "openings" order by "sort_order", "id"`,
        )
        .all<Opening>();
      return results;
    },

    async listChoices(
      userId: string,
    ): Promise<{ openingId: number; wantsToRead: boolean }[]> {
      const { results } = await db
        .prepare(
          `select "opening_id", "wants_to_read" from "opening_choices" where "user_id" = ?`,
        )
        .bind(userId)
        .all<{ opening_id: number; wants_to_read: number }>();
      return results.map((r) => ({
        openingId: r.opening_id,
        wantsToRead: r.wants_to_read === 1,
      }));
    },

    /** 答えを保存する（答え直したら上書き）。冒頭文がなければ false */
    async saveChoice(
      userId: string,
      openingId: number,
      wantsToRead: boolean,
    ): Promise<boolean> {
      const opening = await db
        .prepare(`select 1 from "openings" where "id" = ?`)
        .bind(openingId)
        .first();
      if (!opening) return false;
      await db
        .prepare(
          `insert into "opening_choices" ("user_id", "opening_id", "wants_to_read") values (?, ?, ?)
           on conflict ("user_id", "opening_id") do update set "wants_to_read" = excluded."wants_to_read"`,
        )
        .bind(userId, openingId, wantsToRead ? 1 : 0)
        .run();
      return true;
    },

    async clearChoices(userId: string): Promise<void> {
      await db
        .prepare(`delete from "opening_choices" where "user_id" = ?`)
        .bind(userId)
        .run();
    },
  };
}
