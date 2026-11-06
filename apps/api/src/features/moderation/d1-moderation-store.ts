import type { RightsClaimRequest, WorkModeration } from "@novel/core/api";

import { shouldAutoHide, shouldSuspend, type OpenReportCounts } from "./policy";

/** 運営が作品にできること */
export type ModerationAction = "restore" | "hide" | "remove";

export type ModerationResult = {
  moderation: WorkModeration;
  /** 作者の取り下げの回数 */
  strikes: number;
  /** この操作でアカウントを止めたか */
  suspended: boolean;
  authorId: string;
};

/** 管理画面の一覧の1行。作者は名前と ID だけ（メールアドレスは出さない） */
export type QueueItem = {
  workId: string;
  title: string;
  authorId: string;
  authorName: string;
  status: string;
  moderation: WorkModeration;
  openReports: number;
  rightsReports: number;
  openAppeals: number;
  lastAt: string;
};

export type RightsClaimRow = {
  id: number;
  workId: string | null;
  claimantName: string;
  claimantEmail: string;
  target: string;
  original: string;
  detail: string | null;
  status: string;
  createdAt: string;
};

/**
 * 通報・非表示・取り下げ・停止・異議・権利者の申し立ての読み書き。
 * 作者向けの操作（appeal）は本人の作品だけ。admin で始まる操作は運営の管理画面からだけ呼ぶ
 */
export function d1ModerationStore(db: D1Database) {
  async function openReportCounts(workId: string): Promise<OpenReportCounts> {
    const row = await db
      .prepare(
        `select count(*) as "total",
           coalesce(sum(case when "reason" = 'rights' then 1 else 0 end), 0) as "rights"
         from "reports" where "work_id" = ? and "status" = 'open'`,
      )
      .bind(workId)
      .first<OpenReportCounts>();
    return row ?? { rights: 0, total: 0 };
  }

  async function resolveAll(workId: string) {
    await db.batch([
      db
        .prepare(
          `update "reports" set "status" = 'resolved' where "work_id" = ? and "status" = 'open'`,
        )
        .bind(workId),
      db
        .prepare(
          `update "appeals" set "status" = 'resolved' where "work_id" = ? and "status" = 'open'`,
        )
        .bind(workId),
      db
        .prepare(
          `update "rights_claims" set "status" = 'resolved' where "work_id" = ? and "status" = 'open'`,
        )
        .bind(workId),
    ]);
  }

  async function strikeCount(userId: string): Promise<number> {
    const row = await db
      .prepare(`select count(*) as "n" from "strikes" where "user_id" = ?`)
      .bind(userId)
      .first<{ n: number }>();
    return row?.n ?? 0;
  }

  /** アカウントを止め、いまのログインもすべて切る。すでに止めていれば false */
  async function suspend(userId: string, reason: string): Promise<boolean> {
    const { meta } = await db
      .prepare(
        `insert into "suspensions" ("user_id", "reason") values (?, ?) on conflict do nothing`,
      )
      .bind(userId, reason)
      .run();
    await db
      .prepare(`delete from "session" where "userId" = ?`)
      .bind(userId)
      .run();
    return meta.changes > 0;
  }

  return {
    /**
     * 通報を受けた後に呼ぶ。未対応の通報が決まりの数に達し、まだ問題なしの状態なら仮で隠す。
     * 隠したら true
     */
    async hideIfReported(workId: string): Promise<boolean> {
      if (!shouldAutoHide(await openReportCounts(workId))) return false;
      const { meta } = await db
        .prepare(
          `update "works" set "moderation" = 'hidden' where "id" = ? and "moderation" = 'ok'`,
        )
        .bind(workId)
        .run();
      return meta.changes > 0;
    },

    /** 作品の題名（通知に使う） */
    async titleOf(workId: string): Promise<string | null> {
      return db
        .prepare(`select "title" from "works" where "id" = ?`)
        .bind(workId)
        .first<string>("title");
    },

    /**
     * 非表示・取り下げられた自分の作品に異議を出す。
     * 本人の作品でなければ "not_found"、問題なしの作品は "not_moderated"、確認待ちの異議があれば "pending"
     */
    async appeal(
      userId: string,
      workId: string,
      body: string,
    ): Promise<"ok" | "not_found" | "not_moderated" | "pending"> {
      const work = await db
        .prepare(
          `select "moderation",
             exists (select 1 from "appeals" a where a."work_id" = w."id" and a."status" = 'open') as "pending"
           from "works" w where w."id" = ? and w."author_id" = ?`,
        )
        .bind(workId, userId)
        .first<{ moderation: WorkModeration; pending: number }>();
      if (!work) return "not_found";
      if (work.moderation === "ok") return "not_moderated";
      if (work.pending) return "pending";
      await db
        .prepare(
          `insert into "appeals" ("work_id", "author_id", "body") values (?, ?, ?)`,
        )
        .bind(workId, userId, body)
        .run();
      return "ok";
    },

    /** Web のフォームからの権利者の申し立てを貯める */
    async createRightsClaim(claim: RightsClaimRequest): Promise<void> {
      await db
        .prepare(
          `insert into "rights_claims" ("claimant_name", "claimant_email", "target", "original", "detail")
           values (?, ?, ?, ?, ?)`,
        )
        .bind(
          claim.name,
          claim.email,
          claim.target,
          claim.original,
          claim.detail ?? null,
        )
        .run();
    },

    /** 止めたアカウントか（ログインを断るのに使う） */
    async isSuspended(userId: string): Promise<boolean> {
      const row = await db
        .prepare(`select 1 from "suspensions" where "user_id" = ?`)
        .bind(userId)
        .first();
      return row !== null;
    },

    // ---- ここから運営の管理画面用 ----

    /** 確認が必要な作品：未対応の通報か異議がある作品と、仮で隠している作品。古い順 */
    async adminQueue(): Promise<QueueItem[]> {
      const { results } = await db
        .prepare(
          `select * from (
             select w."id" as "workId", w."title", w."author_id" as "authorId", u."name" as "authorName",
               w."status", w."moderation",
               (select count(*) from "reports" r where r."work_id" = w."id" and r."status" = 'open') as "openReports",
               (select count(*) from "reports" r where r."work_id" = w."id" and r."status" = 'open' and r."reason" = 'rights') as "rightsReports",
               (select count(*) from "appeals" a where a."work_id" = w."id" and a."status" = 'open') as "openAppeals",
               coalesce(
                 (select min(r."created_at") from "reports" r where r."work_id" = w."id" and r."status" = 'open'),
                 (select min(a."created_at") from "appeals" a where a."work_id" = w."id" and a."status" = 'open'),
                 w."created_at") as "lastAt"
             from "works" w join "user" u on u."id" = w."author_id"
           ) where "openReports" > 0 or "openAppeals" > 0 or "moderation" = 'hidden'
           order by "rightsReports" > 0 desc, "lastAt" asc`,
        )
        .all<QueueItem>();
      return results;
    },

    /** 管理画面で作品を確かめるための全部：作品・全章・通報・異議・取り下げの回数 */
    async adminWork(workId: string) {
      const work = await db
        .prepare(
          `select w."id", w."title", w."status", w."moderation", w."author_id" as "authorId",
             u."name" as "authorName", w."published_at" as "publishedAt",
             (select count(*) from "strikes" s where s."user_id" = w."author_id") as "strikes",
             exists (select 1 from "suspensions" s where s."user_id" = w."author_id") as "suspended"
           from "works" w join "user" u on u."id" = w."author_id" where w."id" = ?`,
        )
        .bind(workId)
        .first();
      if (!work) return null;
      const [chapters, reports, appeals] = await db.batch([
        db
          .prepare(
            `select "position", "title", "body", "plot_request" as "plotRequest", "created_at" as "createdAt"
             from "chapters" where "work_id" = ? order by "position"`,
          )
          .bind(workId),
        db
          .prepare(
            `select "id", "reason", "detail", "status", "created_at" as "createdAt"
             from "reports" where "work_id" = ? order by "created_at" desc`,
          )
          .bind(workId),
        db
          .prepare(
            `select "id", "body", "status", "created_at" as "createdAt"
             from "appeals" where "work_id" = ? order by "created_at" desc`,
          )
          .bind(workId),
      ]);
      return {
        ...work,
        chapters: chapters.results,
        reports: reports.results,
        appeals: appeals.results,
      };
    },

    /**
     * 作品を戻す・仮で隠す・取り下げる。作品がなければ null。
     * - restore：問題なしに戻し、通報・異議を対応済みにする。取り下げていたなら、その違反も取り消す
     * - hide：確認まで仮で隠す
     * - remove：取り下げて違反を1回数え、通報・異議・申し立てを対応済みにする。決まりの回数でアカウントを止める
     */
    async adminAct(
      workId: string,
      action: ModerationAction,
    ): Promise<ModerationResult | null> {
      const work = await db
        .prepare(`select "author_id" from "works" where "id" = ?`)
        .bind(workId)
        .first<{ author_id: string }>();
      if (!work) return null;
      const authorId = work.author_id;
      const moderation: WorkModeration =
        action === "restore" ? "ok" : action === "hide" ? "hidden" : "removed";
      await db
        .prepare(`update "works" set "moderation" = ? where "id" = ?`)
        .bind(moderation, workId)
        .run();

      let suspended = false;
      if (action === "restore") {
        await db
          .prepare(
            `delete from "strikes" where "user_id" = ? and "work_id" = ?`,
          )
          .bind(authorId, workId)
          .run();
        await resolveAll(workId);
      } else if (action === "remove") {
        await db
          .prepare(
            `insert into "strikes" ("user_id", "work_id", "reason") values (?, ?, 'removed') on conflict do nothing`,
          )
          .bind(authorId, workId)
          .run();
        await resolveAll(workId);
        if (shouldSuspend(await strikeCount(authorId))) {
          suspended = await suspend(authorId, "取り下げが規定の回数に達した");
        }
      }
      return {
        moderation,
        strikes: await strikeCount(authorId),
        suspended,
        authorId,
      };
    },

    /** アカウントを止め、いまのログインもすべて切る。すでに止めていれば false */
    adminSuspend: suspend,

    /** 停止を解く（取り下げの記録は残る） */
    async adminUnsuspend(userId: string): Promise<void> {
      await db
        .prepare(`delete from "suspensions" where "user_id" = ?`)
        .bind(userId)
        .run();
    },

    /** 権利者の申し立て。未対応を先に、古い順 */
    async adminRightsClaims(): Promise<RightsClaimRow[]> {
      const { results } = await db
        .prepare(
          `select "id", "work_id" as "workId", "claimant_name" as "claimantName",
             "claimant_email" as "claimantEmail", "target", "original", "detail", "status",
             "created_at" as "createdAt"
           from "rights_claims" order by "status" = 'open' desc, "created_at" asc limit 100`,
        )
        .all<RightsClaimRow>();
      return results;
    },

    /**
     * 申し立てを作品に結びつけ（workId があれば）、対応済みにするか未対応のままにする。
     * 申し立てがなければ false
     */
    async adminUpdateRightsClaim(
      id: number,
      change: { workId?: string | null; resolved?: boolean },
    ): Promise<boolean> {
      const row = await db
        .prepare(`select 1 from "rights_claims" where "id" = ?`)
        .bind(id)
        .first();
      if (!row) return false;
      if (change.workId !== undefined) {
        await db
          .prepare(`update "rights_claims" set "work_id" = ? where "id" = ?`)
          .bind(change.workId, id)
          .run();
      }
      if (change.resolved !== undefined) {
        await db
          .prepare(`update "rights_claims" set "status" = ? where "id" = ?`)
          .bind(change.resolved ? "resolved" : "open", id)
          .run();
      }
      return true;
    },
  };
}
