import { generateChapterRequestSchema } from "@novel/core/api";

import {
  generateNextChapter,
  WorkNotFoundError,
} from "@/features/generation/generate-next-chapter";
import { supabaseChapterStore } from "@/features/generation/supabase-chapter-store";
import { AiRefusalError } from "@/lib/ai/claude";
import { createNovelGenerator } from "@/lib/ai";
import { authenticateBearer } from "@/lib/supabase/bearer";

/** 次の章を生成する。スマホアプリから呼ぶ。 */
export async function POST(request: Request) {
  const auth = await authenticateBearer(request);
  if (!auth) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const parsed = generateChapterRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  try {
    const result = await generateNextChapter(
      {
        store: supabaseChapterStore(auth.db),
        generator: createNovelGenerator(),
      },
      auth.userId,
      parsed.data,
    );
    return Response.json(result);
  } catch (e) {
    if (e instanceof WorkNotFoundError) {
      return Response.json({ error: "作品が見つかりません" }, { status: 404 });
    }
    if (e instanceof AiRefusalError) {
      return Response.json({ error: e.message }, { status: 422 });
    }
    throw e;
  }
}
