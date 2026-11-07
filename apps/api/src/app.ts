import type { NovelGenerator } from "@novel/core/ai";
import {
  appealRequestSchema,
  generateChapterRequestSchema,
  openingIdSchema,
  recordReadRequestSchema,
  reportWorkRequestSchema,
  rightsClaimRequestSchema,
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
import { z } from "zod";

import { webOrigins, type Env } from "./env";
import { d1ChapterStore } from "./features/generation/d1-chapter-store";
import {
  generateNextChapter,
  WorkNotFoundError,
} from "./features/generation/generate-next-chapter";
import { isAdminUser } from "./features/moderation/admin-users";
import { d1ModerationStore } from "./features/moderation/d1-moderation-store";
import {
  ADMIN_PAGE,
  PAGE_HEADERS,
  RIGHTS_PAGE,
} from "./features/moderation/pages";
import { opsMessage, type OpsEvent } from "./features/moderation/policy";
import { d1OpeningsStore } from "./features/openings/d1-openings-store";
import { d1PublicWorksStore } from "./features/public-works/d1-public-works-store";
import { rankPublicWorks } from "./features/public-works/rank-public-works";
import { d1SafetyStore } from "./features/safety/d1-safety-store";
import { d1WorksStore } from "./features/works/d1-works-store";
import { createNovelGenerator } from "./lib/ai";
import { AiRefusalError } from "./lib/ai/claude";
import { createAuth, type AuthDeps } from "./lib/auth";
import { createNotifier, type Notifier } from "./lib/notify";

type AppEnv = { Bindings: Env; Variables: { userId: string } };
type OptionalUserEnv = { Bindings: Env; Variables: { userId: string | null } };

const moderationActionSchema = z.object({
  action: z.enum(["restore", "hide", "remove"]),
});
const rightsClaimIdSchema = z.coerce.number().int().positive();
const updateRightsClaimSchema = z
  .object({
    workId: workIdSchema.nullable().optional(),
    resolved: z.boolean().optional(),
  })
  .refine((v) => v.workId !== undefined || v.resolved !== undefined);

/**
 * API の入口。ここには認証・入力検証・エラー変換だけを書き、処理は features/ に置く。
 * テストでは createGenerator を差し替えて Claude API を呼ばないようにする。
 * createNotifier を差し替えると、運営への通知（Slack）を送らずに中身を確かめられる。
 */
export function createApp(
  deps: {
    createGenerator?: (env: Env) => NovelGenerator;
    auth?: AuthDeps;
    createNotifier?: (env: Env) => Notifier;
  } = {},
) {
  const createGenerator = deps.createGenerator ?? createNovelGenerator;
  const notifierOf = deps.createNotifier ?? createNotifier;
  const app = new Hono<AppEnv>();

  /** 運営に知らせる。応答を待たせないよう、Workers では返事の後に送る */
  async function notifyOps(
    c: {
      env: Env;
      req: { url: string };
      executionCtx: { waitUntil(promise: Promise<unknown>): void };
    },
    event: OpsEvent,
  ) {
    const adminUrl = new URL("/admin", c.req.url).toString();
    const sending = notifierOf(c.env)(opsMessage(event, adminUrl));
    try {
      c.executionCtx.waitUntil(sending);
    } catch {
      // テスト（executionCtx がない）では待つ
      await sending;
    }
  }

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

  // 非表示・取り下げられた自分の作品に異議を出す
  app.post("/api/works/:workId/appeals", requireUser, async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const body = appealRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!body.success) return c.json({ error: "リクエストが不正です" }, 400);
    const moderation = d1ModerationStore(c.env.DB);
    const result = await moderation.appeal(
      c.get("userId"),
      workId.data,
      body.data.body,
    );
    if (result === "not_found") {
      return c.json({ error: "作品が見つかりません" }, 404);
    }
    if (result === "not_moderated") {
      return c.json({ error: "この作品は非公開にされていません" }, 409);
    }
    if (result === "pending") {
      return c.json({ error: "異議はすでに確認待ちです" }, 409);
    }
    await notifyOps(c, {
      kind: "appeal",
      workId: workId.data,
      title: (await moderation.titleOf(workId.data)) ?? "",
    });
    return c.body(null, 204);
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
    const moderation = d1ModerationStore(c.env.DB);
    const autoHidden = await moderation.hideIfReported(workId.data);
    await notifyOps(c, {
      kind: "report",
      workId: workId.data,
      title: (await moderation.titleOf(workId.data)) ?? "",
      reason: body.data.reason,
      detail: body.data.detail,
      autoHidden,
    });
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

  // ---- 権利者の申し立て（Web のフォーム、ログイン不要） ----

  app.get("/rights", (c) => c.body(RIGHTS_PAGE, 200, PAGE_HEADERS));

  app.post("/api/rights-claims", async (c) => {
    const body = rightsClaimRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!body.success) return c.json({ error: "入力内容が不正です" }, 400);
    await d1ModerationStore(c.env.DB).createRightsClaim(body.data);
    await notifyOps(c, { kind: "rights_claim", target: body.data.target });
    return c.body(null, 204);
  });

  // ---- 運営の管理画面 ----
  // 画面は誰でも開けるが、中身（/admin/api/*）は ADMIN_USER_IDS にある運営アカウントでログインしたときだけ読み書きできる

  app.get("/admin", (c) => c.body(ADMIN_PAGE, 200, PAGE_HEADERS));

  const admin = new Hono<{ Bindings: Env; Variables: { userId: string } }>();
  admin.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    // 書き換えは管理画面のページ（同じオリジン）からだけ受け付ける
    if (
      c.req.method !== "GET" &&
      c.req.header("Origin") !== new URL(c.req.url).origin
    ) {
      return c.json({ error: "許可されていない操作です" }, 403);
    }
    const session = await createAuth(c.env, deps.auth).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session) return c.json({ error: "ログインが必要です" }, 401);
    if (!isAdminUser(session.user.id, c.env)) {
      // 運営アカウントを登録するときに ADMIN_USER_IDS に入れる値を、本人にだけ見せる
      return c.json(
        {
          error: "このアカウントには管理画面の権限がありません",
          userId: session.user.id,
        },
        403,
      );
    }
    c.set("userId", session.user.id);
    await next();
  });

  admin.get("/me", (c) => c.json({ userId: c.get("userId") }));

  admin.get("/queue", async (c) => {
    const items = await d1ModerationStore(c.env.DB).adminQueue();
    return c.json({ items });
  });

  admin.get("/works/:workId", async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const work = await d1ModerationStore(c.env.DB).adminWork(workId.data);
    if (!work) return c.json({ error: "作品が見つかりません" }, 404);
    return c.json({ work });
  });

  admin.post("/works/:workId/actions", async (c) => {
    const workId = workIdSchema.safeParse(c.req.param("workId"));
    if (!workId.success) return c.json({ error: "作品が見つかりません" }, 404);
    const body = moderationActionSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!body.success) return c.json({ error: "リクエストが不正です" }, 400);
    const result = await d1ModerationStore(c.env.DB).adminAct(
      workId.data,
      body.data.action,
    );
    if (!result) return c.json({ error: "作品が見つかりません" }, 404);
    if (result.suspended) {
      await notifyOps(c, {
        kind: "suspended",
        userId: result.authorId,
        strikes: result.strikes,
      });
    }
    return c.json(result);
  });

  admin.delete("/suspensions/:userId", async (c) => {
    const userId = userIdSchema.safeParse(c.req.param("userId"));
    if (!userId.success)
      return c.json({ error: "利用者が見つかりません" }, 404);
    await d1ModerationStore(c.env.DB).adminUnsuspend(userId.data);
    return c.body(null, 204);
  });

  admin.get("/rights-claims", async (c) => {
    const claims = await d1ModerationStore(c.env.DB).adminRightsClaims();
    return c.json({ claims });
  });

  admin.patch("/rights-claims/:id", async (c) => {
    const id = rightsClaimIdSchema.safeParse(c.req.param("id"));
    const body = updateRightsClaimSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!id.success || !body.success) {
      return c.json({ error: "リクエストが不正です" }, 400);
    }
    const store = d1ModerationStore(c.env.DB);
    if (body.data.workId && !(await store.titleOf(body.data.workId))) {
      return c.json({ error: "作品が見つかりません" }, 404);
    }
    const updated = await store.adminUpdateRightsClaim(id.data, body.data);
    if (!updated) return c.json({ error: "申し立てが見つかりません" }, 404);
    return c.body(null, 204);
  });

  app.route("/admin/api", admin);

  return app;
}
