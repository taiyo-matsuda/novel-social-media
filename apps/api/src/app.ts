import type { NovelGenerator } from "@novel/core/ai";
import {
  generateChapterRequestSchema,
  openingIdSchema,
  recordReadRequestSchema,
  reportWorkRequestSchema,
  saveOpeningChoiceRequestSchema,
  setLikeRequestSchema,
  updateWorkRequestSchema,
  userIdSchema,
  workIdSchema,
  type GetOwnWorkResponse,
  type ListBlocksResponse,
  type GetPublicWorkResponse,
  type ListOpeningChoicesResponse,
  type ListOpeningsResponse,
  type ListOwnWorksResponse,
  type ListPublicWorksResponse,
  type SetLikeResponse,
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
import { d1PublicWorksStore } from "./features/public-works/d1-public-works-store";
import { rankPublicWorks } from "./features/public-works/rank-public-works";
import { d1SafetyStore } from "./features/safety/d1-safety-store";
import { d1WorksStore } from "./features/works/d1-works-store";
import { createNovelGenerator } from "./lib/ai";
import { AiRefusalError } from "./lib/ai/claude";
import { createAuth } from "./lib/auth";

type AppEnv = { Bindings: Env; Variables: { userId: string } };
type OptionalUserEnv = { Bindings: Env; Variables: { userId: string | null } };

/**
 * API の入口。ここには認証・入力検証・エラー変換だけを書き、処理は features/ に置く。
 * テストでは createGenerator を差し替えて Claude API を呼ばないようにする。
 */
export function createApp(
  deps: { createGenerator?: (env: Env) => NovelGenerator } = {},
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
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.on(["GET", "POST"], "/api/auth/*", (c) =>
    createAuth(c.env).handler(c.req.raw),
  );

  const requireUser = createMiddleware<AppEnv>(async (c, next) => {
    const session = await createAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session) return c.json({ error: "ログインが必要です" }, 401);
    c.set("userId", session.user.id);
    await next();
  });

  // ログインしていなくても使える API で、ログインしていれば本人のIDを使う
  const optionalUser = createMiddleware<OptionalUserEnv>(async (c, next) => {
    const session = await createAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });
    c.set("userId", session?.user.id ?? null);
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

  app.get("/api/works", requireUser, async (c) => {
    const works = await d1WorksStore(c.env.DB).listOwn(c.get("userId"));
    return c.json<ListOwnWorksResponse>({ works });
  });

  app.get("/api/works/:workId", requireUser, async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const work = await d1WorksStore(c.env.DB).getOwn(
      c.get("userId"),
      workId.data,
    );
    if (!work) return c.json({ error: "作品が見つかりません" }, 404);
    return c.json<GetOwnWorkResponse>({ work });
  });

  app.patch("/api/works/:workId", requireUser, async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const body = updateWorkRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!body.success) return c.json({ error: "リクエストが不正です" }, 400);
    const work = await d1WorksStore(c.env.DB).updateOwn(
      c.get("userId"),
      workId.data,
      body.data,
    );
    if (!work) return c.json({ error: "作品が見つかりません" }, 404);
    return c.json(work);
  });

  // ---- みんなの作品 ----
  // 一覧（題名・作者名・数字）はログインなしでも見られる。本文はログイン必須

  app.get("/api/public-works", optionalUser, async (c) => {
    // 新しい 200 件の中からランキング上位 50 件を出す（作品が増えたら集計を定期実行に変える）。
    // ログインしていれば、ブロックした・された相手の作品と通報した作品を除く
    const recent = await d1PublicWorksStore(c.env.DB).listRecent(
      c.get("userId"),
      200,
    );
    const works = rankPublicWorks(recent, new Date(), 50);
    return c.json<ListPublicWorksResponse>({ works });
  });

  app.get("/api/public-works/:workId", requireUser, async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const work = await d1PublicWorksStore(c.env.DB).get(
      c.get("userId"),
      workId.data,
    );
    if (!work) return c.json({ error: "作品が見つかりません" }, 404);
    return c.json<GetPublicWorkResponse>({ work });
  });

  app.post("/api/public-works/:workId/reads", requireUser, async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const body = recordReadRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!body.success) return c.json({ error: "リクエストが不正です" }, 400);
    const recorded = await d1PublicWorksStore(c.env.DB).recordRead(
      c.get("userId"),
      workId.data,
      body.data,
    );
    if (!recorded) return c.json({ error: "章が見つかりません" }, 404);
    return c.body(null, 204);
  });

  app.put("/api/public-works/:workId/like", requireUser, async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const body = setLikeRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!body.success) return c.json({ error: "リクエストが不正です" }, 400);
    const result = await d1PublicWorksStore(c.env.DB).setLike(
      c.get("userId"),
      workId.data,
      body.data.liked,
    );
    if (result === "not_found") {
      return c.json({ error: "作品が見つかりません" }, 404);
    }
    if (result === "own_work") {
      return c.json({ error: "自分の作品には高評価を付けられません" }, 403);
    }
    return c.json<SetLikeResponse>({ liked: body.data.liked, ...result });
  });

  // ---- 通報・ブロック ----
  // 退会は Better Auth の POST /api/auth/delete-user（src/lib/auth.ts）

  app.post("/api/public-works/:workId/reports", requireUser, async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const body = reportWorkRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!body.success) return c.json({ error: "リクエストが不正です" }, 400);
    const result = await d1SafetyStore(c.env.DB).reportWork(
      c.get("userId"),
      workId.data,
      body.data,
    );
    if (result === "not_found") {
      return c.json({ error: "作品が見つかりません" }, 404);
    }
    if (result === "own_work") {
      return c.json({ error: "自分の作品は通報できません" }, 403);
    }
    return c.body(null, 204);
  });

  app.get("/api/blocks", requireUser, async (c) => {
    const blocks = await d1SafetyStore(c.env.DB).listBlocks(c.get("userId"));
    return c.json<ListBlocksResponse>({ blocks });
  });

  app.put("/api/blocks/:userId", requireUser, async (c) => {
    const target = userIdSchema.safeParse(c.req.param("userId"));
    if (!target.success)
      return c.json({ error: "利用者が見つかりません" }, 404);
    if (target.data === c.get("userId")) {
      return c.json({ error: "自分はブロックできません" }, 400);
    }
    const blocked = await d1SafetyStore(c.env.DB).block(
      c.get("userId"),
      target.data,
    );
    if (!blocked) return c.json({ error: "利用者が見つかりません" }, 404);
    return c.body(null, 204);
  });

  app.delete("/api/blocks/:userId", requireUser, async (c) => {
    const target = userIdSchema.safeParse(c.req.param("userId"));
    if (!target.success)
      return c.json({ error: "利用者が見つかりません" }, 404);
    await d1SafetyStore(c.env.DB).unblock(c.get("userId"), target.data);
    return c.body(null, 204);
  });

  return app;
}
