import type { NovelGenerator } from "@novel/core/ai";
import {
  generateChapterRequestSchema,
  openingIdSchema,
  saveOpeningChoiceRequestSchema,
  type ListOpeningChoicesResponse,
  type ListOpeningsResponse,
} from "@novel/core/api";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";

import { webOrigins, type Env } from "./env";
import { d1ChapterStore } from "./features/generation/d1-chapter-store";
import {
  generateNextChapter,
  WorkNotFoundError,
} from "./features/generation/generate-next-chapter";
import { d1OpeningsStore } from "./features/openings/d1-openings-store";
import { createNovelGenerator } from "./lib/ai";
import { AiRefusalError } from "./lib/ai/claude";
import { createAuth, type AuthDeps } from "./lib/auth";

type AppEnv = { Bindings: Env; Variables: { userId: string } };

/**
 * API の入口。ここには認証・入力検証・エラー変換だけを書き、処理は features/ に置く。
 * テストでは createGenerator を差し替えて Claude API を呼ばないようにする。
 */
export function createApp(
  deps: {
    createGenerator?: (env: Env) => NovelGenerator;
    auth?: AuthDeps;
  } = {},
) {
  const createGenerator = deps.createGenerator ?? createNovelGenerator;
  const app = new Hono<AppEnv>();

  // スマホアプリはオリジンを持たないので CORS は関係ない。ブラウザで試すときの開発サーバーだけ許可する
  app.use(
    "/api/*",
    cors({
      origin: (origin, c) =>
        webOrigins(c.env).includes(origin) ? origin : null,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["set-auth-token"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.on(["GET", "POST"], "/api/auth/*", (c) =>
    createAuth(c.env, deps.auth).handler(c.req.raw),
  );

  const requireUser = createMiddleware<AppEnv>(async (c, next) => {
    const session = await createAuth(c.env, deps.auth).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session) return c.json({ error: "ログインが必要です" }, 401);
    c.set("userId", session.user.id);
    await next();
  });

  app.get("/api/openings", async (c) => {
    const openings = await d1OpeningsStore(c.env.DB).listOpenings();
    return c.json<ListOpeningsResponse>({ openings });
  });

  app.get("/api/opening-choices", requireUser, async (c) => {
    const choices = await d1OpeningsStore(c.env.DB).listChoices(
      c.get("userId"),
    );
    return c.json<ListOpeningChoicesResponse>({ choices });
  });

  app.put("/api/opening-choices/:openingId", requireUser, async (c) => {
    const openingId = openingIdSchema.safeParse(c.req.param("openingId"));
    const body = saveOpeningChoiceRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!openingId.success || !body.success) {
      return c.json({ error: "リクエストが不正です" }, 400);
    }
    const saved = await d1OpeningsStore(c.env.DB).saveChoice(
      c.get("userId"),
      openingId.data,
      body.data.wantsToRead,
    );
    if (!saved) return c.json({ error: "冒頭文が見つかりません" }, 404);
    return c.body(null, 204);
  });

  app.delete("/api/opening-choices", requireUser, async (c) => {
    await d1OpeningsStore(c.env.DB).clearChoices(c.get("userId"));
    return c.body(null, 204);
  });

  app.post("/api/chapters", requireUser, async (c) => {
    const parsed = generateChapterRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ error: "リクエストが不正です" }, 400);
    }
    try {
      const result = await generateNextChapter(
        {
          store: d1ChapterStore(c.env.DB),
          generator: createGenerator(c.env),
        },
        c.get("userId"),
        parsed.data,
      );
      return c.json(result);
    } catch (e) {
      if (e instanceof WorkNotFoundError) {
        return c.json({ error: "作品が見つかりません" }, 404);
      }
      if (e instanceof AiRefusalError) {
        return c.json({ error: e.message }, 422);
      }
      throw e;
    }
  });

  return app;
}
