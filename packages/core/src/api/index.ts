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
