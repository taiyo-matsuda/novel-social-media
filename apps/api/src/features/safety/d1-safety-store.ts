import type { BlockedUser, ReportWorkRequest } from "@novel/core/api";

import { d1PublicWorksStore } from "../public-works/d1-public-works-store";

/**
 * 通報とブロックの読み書き。どれもログイン中の利用者（[userId]）の分だけを読み書きする。
 * 通報やブロックで見えなくする処理は d1PublicWorksStore のクエリ側で行う
 */
export function d1SafetyStore(db: D1Database) {
  return {
    /**
     * 作品を通報する。同じ作品を通報し直したら理由と補足を上書きし、未対応に戻す。
     * 見えない作品なら "not_found"、自分の作品は "own_work"
     */
    async reportWork(
      userId: string,
      workId: string,
      report: ReportWorkRequest,
    ): Promise<"ok" | "not_found" | "own_work"> {
      const work = await d1PublicWorksStore(db).get(userId, workId);
      if (!work) return "not_found";
      if (work.isMine) return "own_work";
      await db
        .prepare(
          `insert into "reports" ("reporter_id", "work_id", "reason", "detail") values (?, ?, ?, ?)
           on conflict ("reporter_id", "work_id") do update set
             "reason" = excluded."reason", "detail" = excluded."detail",
             "status" = 'open', "created_at" = datetime('now')`,
        )
        .bind(userId, workId, report.reason, report.detail ?? null)
        .run();
      return "ok";
    },

    /** [blockedId] をブロックする（し直しても1件）。相手がいなければ false */
    async block(userId: string, blockedId: string): Promise<boolean> {
      const exists = await db
        .prepare(`select 1 from "user" where "id" = ?`)
        .bind(blockedId)
        .first();
      if (!exists) return false;
      await db
        .prepare(
          `insert into "blocks" ("blocker_id", "blocked_id") values (?, ?) on conflict do nothing`,
        )
        .bind(userId, blockedId)
        .run();
      return true;
    },

    /** ブロックを解除する（していなくても何もしない） */
    async unblock(userId: string, blockedId: string): Promise<void> {
      await db
        .prepare(
          `delete from "blocks" where "blocker_id" = ? and "blocked_id" = ?`,
        )
        .bind(userId, blockedId)
        .run();
    },

    /** ブロックした人を新しい順に。名前だけ返し、メールアドレスは出さない */
    async listBlocks(userId: string): Promise<BlockedUser[]> {
      const { results } = await db
        .prepare(
          `select b."blocked_id" as "userId", u."name", b."created_at" as "blockedAt"
           from "blocks" b join "user" u on u."id" = b."blocked_id"
           where b."blocker_id" = ? order by b."created_at" desc, b."rowid" desc`,
        )
        .bind(userId)
        .all<BlockedUser>();
      return results;
    },
  };
}
