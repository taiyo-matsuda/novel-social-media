import type {
  GetPublicWorkResponse,
  PublicChapterView,
  RecordReadRequest,
} from "@novel/core/api";

import { toPublicSummary, type PublicWorkWithStats } from "./rank-public-works";

type PublicWorkRow = {
  id: string;
  author_id: string;
  title: string;
  author_name: string;
  published_at: string;
  chapter_count: number;
  readers: number;
  completions: number;
  likes: number;
};

// 公開作品と、ランキングに使う数字。作者は名前だけ取る（メールアドレスは出さない）。
// 読者数・読了数は作者本人の読み返しを数えない。読了は最後の章を読み終えた人
const SELECT_PUBLIC_WORK = `
  select w."id", w."author_id", w."title", u."name" as "author_name", w."published_at",
    (select count(*) from "chapters" c where c."work_id" = w."id") as "chapter_count",
    (select count(distinct e."user_id") from "reading_events" e
       join "chapters" c on c."id" = e."chapter_id"
       where c."work_id" = w."id" and e."kind" = 'start' and e."user_id" != w."author_id") as "readers",
    (select count(distinct e."user_id") from "reading_events" e
       join "chapters" c on c."id" = e."chapter_id"
       where c."work_id" = w."id" and e."kind" = 'complete' and e."user_id" != w."author_id"
         and c."position" = (select max("position") from "chapters" where "work_id" = w."id")) as "completions",
    (select count(*) from "likes" l where l."work_id" = w."id") as "likes"
  from "works" w join "user" u on u."id" = w."author_id"
  where w."status" = 'published'`;

function toStats(row: PublicWorkRow): PublicWorkWithStats {
  return {
    id: row.id,
    title: row.title,
    authorName: row.author_name,
    chapterCount: row.chapter_count,
    publishedAt: row.published_at,
    readers: row.readers,
    completions: row.completions,
    likes: row.likes,
  };
}

/**
 * 公開作品を他人が読むための読み書き。
 * 非公開（下書き）の作品はどのクエリでも見つからない扱いにする。書き込みはログイン中の利用者の分だけ。
 */
export function d1PublicWorksStore(db: D1Database) {
  async function findPublished(workId: string) {
    return db
      .prepare(`${SELECT_PUBLIC_WORK} and w."id" = ?`)
      .bind(workId)
      .first<PublicWorkRow>();
  }

  return {
    /** 新しく公開された順に [limit] 件。並べ替えは rankPublicWorks で行う */
    async listRecent(limit: number): Promise<PublicWorkWithStats[]> {
      const { results } = await db
        .prepare(
          `${SELECT_PUBLIC_WORK} order by w."published_at" desc, w."rowid" desc limit ?`,
        )
        .bind(limit)
        .all<PublicWorkRow>();
      return results.map(toStats);
    },

    /** 公開作品と全章。公開されていなければ null */
    async get(
      userId: string,
      workId: string,
    ): Promise<GetPublicWorkResponse["work"] | null> {
      const row = await findPublished(workId);
      if (!row) return null;
      const [chapters, liked] = await Promise.all([
        db
          .prepare(
            `select "position", "title", "body" from "chapters"
             where "work_id" = ? order by "position"`,
          )
          .bind(workId)
          .all<PublicChapterView>(),
        db
          .prepare(
            `select 1 from "likes" where "user_id" = ? and "work_id" = ?`,
          )
          .bind(userId, workId)
          .first(),
      ]);
      return {
        ...toPublicSummary(toStats(row)),
        isMine: row.author_id === userId,
        likedByMe: liked !== null,
        chapters: chapters.results,
      };
    },

    /**
     * 章を読み始めた・読み終えたことを記録する。同じ人の同じ章・同じ種類は一度だけ残す。
     * 公開作品のその章がなければ false
     */
    async recordRead(
      userId: string,
      workId: string,
      read: RecordReadRequest,
    ): Promise<boolean> {
      const chapter = await db
        .prepare(
          `select c."id" from "chapters" c join "works" w on w."id" = c."work_id"
           where w."id" = ? and w."status" = 'published' and c."position" = ?`,
        )
        .bind(workId, read.position)
        .first<{ id: string }>();
      if (!chapter) return false;
      await db
        .prepare(
          `insert into "reading_events" ("user_id", "chapter_id", "kind")
           select ?, ?, ? where not exists (
             select 1 from "reading_events"
             where "user_id" = ? and "chapter_id" = ? and "kind" = ?)`,
        )
        .bind(userId, chapter.id, read.kind, userId, chapter.id, read.kind)
        .run();
      return true;
    },

    /**
     * 高評価を付ける・外す。付け直しても数は増えない。
     * 公開作品でなければ "not_found"、自分の作品には付けられないので "own_work"
     */
    async setLike(
      userId: string,
      workId: string,
      liked: boolean,
    ): Promise<{ likes: number } | "not_found" | "own_work"> {
      const row = await findPublished(workId);
      if (!row) return "not_found";
      if (row.author_id === userId) return "own_work";
      await db
        .prepare(
          liked
            ? `insert into "likes" ("user_id", "work_id") values (?, ?) on conflict do nothing`
            : `delete from "likes" where "user_id" = ? and "work_id" = ?`,
        )
        .bind(userId, workId)
        .run();
      const count = await db
        .prepare(`select count(*) as "n" from "likes" where "work_id" = ?`)
        .bind(workId)
        .first<number>("n");
      return { likes: count ?? 0 };
    },
  };
}
