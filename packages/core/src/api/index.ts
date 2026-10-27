import { z } from "zod";

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
