import type {
  ChapterView,
  GetOwnWorkResponse,
  UpdateWorkRequest,
  WorkStatus,
  WorkSummary,
} from "@novel/core/api";

type WorkRow = {
  id: string;
  title: string;
  status: WorkStatus;
  published_at: string | null;
  created_at: string;
  chapter_count: number;
  updated_at: string | null;
};

// 章の数と最後に章が増えた日時もまとめて取る
const SELECT_WORK = `
  select w."id", w."title", w."status", w."published_at", w."created_at",
    count(c."id") as "chapter_count", max(c."created_at") as "updated_at"
  from "works" w left join "chapters" c on c."work_id" = w."id"`;

function toSummary(row: WorkRow): WorkSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    chapterCount: row.chapter_count,
    publishedAt: row.published_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

/** 本人の作品の読み書き。D1 には RLS がないので、どのクエリも author_id = userId で絞る */
export function d1WorksStore(db: D1Database) {
  async function findOwn(userId: string, workId: string) {
    const row = await db
      .prepare(
        `${SELECT_WORK} where w."id" = ? and w."author_id" = ? group by w."id"`,
      )
      .bind(workId, userId)
      .first<WorkRow>();
    return row ? toSummary(row) : null;
  }

  return {
    async listOwn(userId: string): Promise<WorkSummary[]> {
      const { results } = await db
        .prepare(
          `${SELECT_WORK} where w."author_id" = ? group by w."id"
           order by coalesce(max(c."created_at"), w."created_at") desc, w."rowid" desc`,
        )
        .bind(userId)
        .all<WorkRow>();
      return results.map(toSummary);
    },

    /** 本人の作品と全章。本人の作品でなければ null */
    async getOwn(
      userId: string,
      workId: string,
    ): Promise<GetOwnWorkResponse["work"] | null> {
      const work = await findOwn(userId, workId);
      if (!work) return null;
      const { results } = await db
        .prepare(
          `select "position", "title", "body", "plot_request" from "chapters"
           where "work_id" = ? order by "position"`,
        )
        .bind(workId)
        .all<{
          position: number;
          title: string;
          body: string;
          plot_request: string | null;
        }>();
      const chapters: ChapterView[] = results.map((c) => ({
        position: c.position,
        title: c.title,
        body: c.body,
        plotRequest: c.plot_request,
      }));
      return { ...work, chapters };
    },

    /** 題名の変更と公開・非公開。本人の作品でなければ null */
    async updateOwn(
      userId: string,
      workId: string,
      change: UpdateWorkRequest,
    ): Promise<WorkSummary | null> {
      if (change.title !== undefined) {
        await db
          .prepare(
            `update "works" set "title" = ? where "id" = ? and "author_id" = ?`,
          )
          .bind(change.title, workId, userId)
          .run();
      }
      if (change.published === true) {
        // 公開中の作品をもう一度公開しても、公開日時は変えない
        await db
          .prepare(
            `update "works" set "status" = 'published',
               "published_at" = coalesce("published_at", datetime('now'))
             where "id" = ? and "author_id" = ?`,
          )
          .bind(workId, userId)
          .run();
      } else if (change.published === false) {
        await db
          .prepare(
            `update "works" set "status" = 'draft', "published_at" = null
             where "id" = ? and "author_id" = ?`,
          )
          .bind(workId, userId)
          .run();
      }
      return findOwn(userId, workId);
    },
  };
}
