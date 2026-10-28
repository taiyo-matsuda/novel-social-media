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
