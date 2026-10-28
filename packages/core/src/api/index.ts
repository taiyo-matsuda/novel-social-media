import { z } from "zod";

import type { Opening } from "../openings/deck";

/**
 * アプリ → サーバーの「次の章を生成して」リクエスト。
 * サーバー側で必ずこのスキーマで検証する。
 */
export const generateChapterRequestSchema = z.object({
  workId: z.uuid().optional(),
  plotRequest: z.string().trim().max(500).optional(),
});
export type GenerateChapterRequest = z.infer<
  typeof generateChapterRequestSchema
>;

export type GenerateChapterResponse = {
  workId: string;
  chapter: { position: number; title: string; body: string };
};

/** GET /api/openings */
export type ListOpeningsResponse = { openings: Opening[] };

/** GET /api/opening-choices：本人の答え */
export type ListOpeningChoicesResponse = {
  choices: { openingId: number; wantsToRead: boolean }[];
};

/** PUT /api/opening-choices/:openingId */
export const saveOpeningChoiceRequestSchema = z.object({
  wantsToRead: z.boolean(),
});
export type SaveOpeningChoiceRequest = z.infer<
  typeof saveOpeningChoiceRequestSchema
>;

/** URL の :openingId を検証する */
export const openingIdSchema = z.coerce.number().int().positive();

// ---- 自分の作品 ----

/** URL の :workId を検証する */
export const workIdSchema = z.uuid();

export type WorkStatus = "draft" | "published";

/** 作品一覧の1行 */
export type WorkSummary = {
  id: string;
  title: string;
  status: WorkStatus;
  chapterCount: number;
  /** 公開した日時（未公開なら null） */
  publishedAt: string | null;
  /** 最後に章が増えた日時 */
  updatedAt: string;
};

/** GET /api/works：本人の作品を新しい順に */
export type ListOwnWorksResponse = { works: WorkSummary[] };

export type ChapterView = {
  position: number;
  title: string;
  body: string;
  /** この章を書いてもらうときに出した展開リクエスト */
  plotRequest: string | null;
};

/** GET /api/works/:workId：本人の作品と全章 */
export type GetOwnWorkResponse = {
  work: WorkSummary & { chapters: ChapterView[] };
};

/** PATCH /api/works/:workId：題名の変更と公開・非公開 */
export const updateWorkRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    published: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.published !== undefined, {
    message: "変更する項目がありません",
  });
export type UpdateWorkRequest = z.infer<typeof updateWorkRequestSchema>;

// ---- みんなの作品（他人の公開作品を読む） ----

/** ランキング一覧の1行。作者はメールアドレスを出さず名前だけ */
export type PublicWorkSummary = {
  id: string;
  title: string;
  authorName: string;
  chapterCount: number;
  publishedAt: string;
  /** 読み始めた人数（作者本人は数えない） */
  readers: number;
  /** 高評価の数 */
  likes: number;
};

/** GET /api/public-works：公開作品をランキング順に */
export type ListPublicWorksResponse = { works: PublicWorkSummary[] };

/** 他人が読む章。展開リクエストは作者の個人的なメモなので出さない */
export type PublicChapterView = {
  position: number;
  title: string;
  body: string;
};

/** GET /api/public-works/:workId：公開作品と全章（ログイン必須） */
export type GetPublicWorkResponse = {
  work: PublicWorkSummary & {
    /** 自分の作品か（自分の作品には高評価を付けられない） */
    isMine: boolean;
    /** 自分が高評価を付けているか */
    likedByMe: boolean;
    chapters: PublicChapterView[];
  };
};

/**
 * POST /api/public-works/:workId/reads：章を読み始めた・読み終えた・読み終えずに離れた。
 * 離れたとき（leave）は、どこまで読んだかを読了率（0〜1）で送る
 */
export const recordReadRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    position: z.number().int().positive(),
    kind: z.enum(["start", "complete"]),
  }),
  z.object({
    position: z.number().int().positive(),
    kind: z.literal("leave"),
    progress: z.number().min(0).max(1),
  }),
]);
export type RecordReadRequest = z.infer<typeof recordReadRequestSchema>;

/** PUT /api/public-works/:workId/like：高評価を付ける・外す */
export const setLikeRequestSchema = z.object({ liked: z.boolean() });
export type SetLikeRequest = z.infer<typeof setLikeRequestSchema>;
export type SetLikeResponse = { liked: boolean; likes: number };
