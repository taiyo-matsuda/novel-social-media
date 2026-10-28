import { FakeNovelGenerator } from "@novel/core/ai";
import type {
  GenerateChapterResponse,
  GetOwnWorkResponse,
  GetPublicWorkResponse,
  ListOpeningChoicesResponse,
  ListOpeningsResponse,
  ListOwnWorksResponse,
  ListPublicWorksResponse,
  SetLikeResponse,
  WorkSummary,
} from "@novel/core/api";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app";
import type { Env } from "./env";
import { createFakeD1 } from "./test/fake-d1";

const BASE = "http://localhost:8787";

let env: Env;
let generator: FakeNovelGenerator;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  env = {
    DB: createFakeD1(),
    BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
    BETTER_AUTH_URL: BASE,
    TRUSTED_ORIGINS: "http://localhost:8081",
  };
  generator = new FakeNovelGenerator();
  app = createApp({ createGenerator: () => generator });
});

function request(path: string, init: RequestInit = {}) {
  return app.request(`${BASE}${path}`, init, env);
}

function json(method: string, body: unknown, cookie?: string): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  };
}

/** 登録して、ログイン状態のクッキーを返す */
async function signUp(
  email = "taro@example.com",
  password = "password123",
  name = "読者",
) {
  const res = await request(
    "/api/auth/sign-up/email",
    json("POST", { email, password, name }),
  );
  expect(res.status).toBe(200);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  expect(cookie).toBeTruthy();
  return cookie!;
}

describe("ログイン", () => {
  it("メールアドレスとパスワードで登録すると、確認メールなしでそのままログインできる", async () => {
    const cookie = await signUp();
    const res = await request("/api/auth/get-session", {
      headers: { Cookie: cookie },
    });
    const session = (await res.json()) as { user: { email: string } };
    expect(session.user.email).toBe("taro@example.com");
  });

  it("登録したパスワードでログインし直せ、違うパスワードは弾く", async () => {
    await signUp();
    const ok = await request(
      "/api/auth/sign-in/email",
      json("POST", { email: "taro@example.com", password: "password123" }),
    );
    expect(ok.status).toBe(200);
    const ng = await request(
      "/api/auth/sign-in/email",
      json("POST", { email: "taro@example.com", password: "wrong-password" }),
    );
    expect(ng.status).toBe(401);
  });

  it("スマホアプリは set-auth-token のトークンを Bearer で送ってログイン状態を使え、ログアウトで無効になる", async () => {
    // アプリは Origin もクッキーも付けずに送る
    const res = await request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "hanako@example.com",
        password: "password123",
        name: "読者",
      }),
    });
    const token = res.headers.get("set-auth-token");
    expect(token).toBeTruthy();
    const bearer = { Authorization: `Bearer ${token}` };

    expect(
      (await request("/api/opening-choices", { headers: bearer })).status,
    ).toBe(200);

    const signOut = await request("/api/auth/sign-out", {
      method: "POST",
      headers: bearer,
    });
    expect(signOut.status).toBe(200);
    expect(
      (await request("/api/opening-choices", { headers: bearer })).status,
    ).toBe(401);
  });

  it("短すぎるパスワードでは登録できない", async () => {
    const res = await request(
      "/api/auth/sign-up/email",
      json("POST", { email: "a@example.com", password: "short", name: "読者" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("冒頭文", () => {
  it("冒頭文は表示順に返る", async () => {
    const res = await request("/api/openings");
    const { openings } = (await res.json()) as ListOpeningsResponse;
    expect(openings).toHaveLength(12);
    expect(openings[0].genre).toBe("ミステリー");
  });

  it("ログインしていないと答えを読み書きできない", async () => {
    expect((await request("/api/opening-choices")).status).toBe(401);
    expect(
      (
        await request(
          "/api/opening-choices/1",
          json("PUT", { wantsToRead: true }),
        )
      ).status,
    ).toBe(401);
  });

  it("答えを保存・上書き・消去でき、他人の答えは見えない", async () => {
    const taro = await signUp("taro@example.com");
    const hanako = await signUp("hanako@example.com");

    await request(
      "/api/opening-choices/1",
      json("PUT", { wantsToRead: true }, taro),
    );
    await request(
      "/api/opening-choices/2",
      json("PUT", { wantsToRead: true }, taro),
    );
    await request(
      "/api/opening-choices/2",
      json("PUT", { wantsToRead: false }, taro),
    );

    const list = async (cookie: string) =>
      (
        (await (
          await request("/api/opening-choices", { headers: { Cookie: cookie } })
        ).json()) as ListOpeningChoicesResponse
      ).choices;

    expect(await list(taro)).toEqual([
      { openingId: 1, wantsToRead: true },
      { openingId: 2, wantsToRead: false },
    ]);
    expect(await list(hanako)).toEqual([]);

    const del = await request("/api/opening-choices", {
      method: "DELETE",
      headers: { Cookie: taro, Origin: BASE },
    });
    expect(del.status).toBe(204);
    expect(await list(taro)).toEqual([]);
  });

  it("存在しない冒頭文や不正な値は弾く", async () => {
    const cookie = await signUp();
    expect(
      (
        await request(
          "/api/opening-choices/999",
          json("PUT", { wantsToRead: true }, cookie),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          "/api/opening-choices/1",
          json("PUT", { wantsToRead: "yes" }, cookie),
        )
      ).status,
    ).toBe(400);
  });

  it("開発サーバーのオリジンにだけ CORS を許可する", async () => {
    const allowed = await request("/api/openings", {
      headers: { Origin: "http://localhost:8081" },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:8081",
    );
    const other = await request("/api/openings", {
      headers: { Origin: "https://evil.example" },
    });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("章の生成", () => {
  it("選んだ冒頭文をもとに第1章を作り、他人は続きを書けない", async () => {
    const taro = await signUp("taro@example.com");
    await request(
      "/api/opening-choices/1",
      json("PUT", { wantsToRead: true }, taro),
    );

    const res = await request("/api/chapters", json("POST", {}, taro));
    expect(res.status).toBe(200);
    const first = (await res.json()) as GenerateChapterResponse;
    expect(first.chapter.position).toBe(1);
    expect(generator.requests[0].preference.likedOpenings[0]).toContain(
      "古書店",
    );

    const hanako = await signUp("hanako@example.com");
    const other = await request(
      "/api/chapters",
      json("POST", { workId: first.workId }, hanako),
    );
    expect(other.status).toBe(404);
  });
});

describe("自分の作品", () => {
  async function generate(cookie: string, body: object = {}) {
    const res = await request("/api/chapters", json("POST", body, cookie));
    expect(res.status).toBe(200);
    return (await res.json()) as GenerateChapterResponse;
  }

  async function listWorks(cookie: string) {
    const res = await request("/api/works", { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    return ((await res.json()) as ListOwnWorksResponse).works;
  }

  it("ログインしていないと作品を読み書きできない", async () => {
    expect((await request("/api/works")).status).toBe(401);
  });

  it("書いてもらった作品が一覧に並び、全章と展開リクエストを読める", async () => {
    const taro = await signUp();
    const first = await generate(taro, { plotRequest: "猫が探偵役の話" });
    await generate(taro, {
      workId: first.workId,
      plotRequest: "犯人を明かして",
    });

    const works = await listWorks(taro);
    expect(works).toHaveLength(1);
    expect(works[0]).toMatchObject({
      id: first.workId,
      title: "第1章",
      status: "draft",
      chapterCount: 2,
      publishedAt: null,
    });

    const res = await request(`/api/works/${first.workId}`, {
      headers: { Cookie: taro },
    });
    const { work } = (await res.json()) as GetOwnWorkResponse;
    expect(work.chapters.map((c) => [c.position, c.plotRequest])).toEqual([
      [1, "猫が探偵役の話"],
      [2, "犯人を明かして"],
    ]);
  });

  it("題名を変えて公開・非公開にでき、他人は読むことも変えることもできない", async () => {
    const taro = await signUp("taro@example.com");
    const hanako = await signUp("hanako@example.com");
    const { workId } = await generate(taro);

    const patch = (cookie: string, body: object) =>
      request(`/api/works/${workId}`, json("PATCH", body, cookie));

    const published = await patch(taro, {
      title: "古書店の少女",
      published: true,
    });
    expect(published.status).toBe(200);
    const work = (await published.json()) as WorkSummary;
    expect(work).toMatchObject({ title: "古書店の少女", status: "published" });
    expect(work.publishedAt).toBeTruthy();

    const draft = (await (
      await patch(taro, { published: false })
    ).json()) as WorkSummary;
    expect(draft).toMatchObject({ status: "draft", publishedAt: null });

    expect((await patch(hanako, { published: true })).status).toBe(404);
    expect(
      (await request(`/api/works/${workId}`, { headers: { Cookie: hanako } }))
        .status,
    ).toBe(404);
    expect(await listWorks(hanako)).toEqual([]);
  });

  it("不正な作品IDや変更内容は弾く", async () => {
    const taro = await signUp();
    const { workId } = await generate(taro);
    expect(
      (await request("/api/works/abc", { headers: { Cookie: taro } })).status,
    ).toBe(404);
    expect(
      (
        await request(
          `/api/works/${workId}`,
          json("PATCH", { title: "" }, taro),
        )
      ).status,
    ).toBe(400);
  });
});

describe("みんなの作品", () => {
  /** 作品を書いてもらい（章は [chapters] 個）、題名を付けて公開する */
  async function publish(cookie: string, title: string, chapters = 1) {
    let workId: string | undefined;
    for (let i = 0; i < chapters; i++) {
      const res = await request(
        "/api/chapters",
        json("POST", workId ? { workId } : {}, cookie),
      );
      workId = ((await res.json()) as GenerateChapterResponse).workId;
    }
    const res = await request(
      `/api/works/${workId}`,
      json("PATCH", { title, published: true }, cookie),
    );
    expect(res.status).toBe(200);
    return workId!;
  }

  async function list() {
    const res = await request("/api/public-works");
    expect(res.status).toBe(200);
    return ((await res.json()) as ListPublicWorksResponse).works;
  }

  function get(workId: string, cookie: string) {
    return request(`/api/public-works/${workId}`, {
      headers: { Cookie: cookie },
    });
  }

  it("公開作品だけが作者名付きで並び、メールアドレスや下書きは出ない", async () => {
    const taro = await signUp("taro@example.com", "password123", "太郎");
    await publish(taro, "古書店の少女", 2);
    await request("/api/chapters", json("POST", {}, taro)); // 下書きのまま

    const works = await list();
    expect(works).toHaveLength(1);
    expect(works[0]).toMatchObject({
      title: "古書店の少女",
      authorName: "太郎",
      chapterCount: 2,
      readers: 0,
      likes: 0,
    });
    expect(JSON.stringify(works)).not.toContain("taro@example.com");
  });

  it("本文はログインしないと読めず、ログインすれば展開リクエスト抜きで全章を読める", async () => {
    const taro = await signUp("taro@example.com");
    const hanako = await signUp("hanako@example.com");
    const workId = await publish(taro, "古書店の少女", 2);

    expect((await request(`/api/public-works/${workId}`)).status).toBe(401);

    const res = await get(workId, hanako);
    expect(res.status).toBe(200);
    const { work } = (await res.json()) as GetPublicWorkResponse;
    expect(work).toMatchObject({ isMine: false, likedByMe: false });
    expect(work.chapters.map((c) => c.position)).toEqual([1, 2]);
    expect(work.chapters[0]).not.toHaveProperty("plotRequest");
  });

  it("非公開に戻した作品や存在しない作品は読めない", async () => {
    const taro = await signUp("taro@example.com");
    const hanako = await signUp("hanako@example.com");
    const workId = await publish(taro, "古書店の少女");
    await request(
      `/api/works/${workId}`,
      json("PATCH", { published: false }, taro),
    );

    expect((await get(workId, hanako)).status).toBe(404);
    expect((await get("abc", hanako)).status).toBe(404);
    expect(await list()).toEqual([]);
  });

  it("読んだ人数は一人一回だけ数え、作者本人の読み返しは数えない", async () => {
    const taro = await signUp("taro@example.com");
    const hanako = await signUp("hanako@example.com");
    const workId = await publish(taro, "古書店の少女");

    const read = (cookie: string, body: object) =>
      request(`/api/public-works/${workId}/reads`, json("POST", body, cookie));

    expect((await read(hanako, { position: 1, kind: "start" })).status).toBe(
      204,
    );
    await read(hanako, { position: 1, kind: "start" });
    await read(taro, { position: 1, kind: "start" });
    expect((await list())[0].readers).toBe(1);

    expect((await read(hanako, { position: 9, kind: "start" })).status).toBe(
      404,
    );
    expect((await read(hanako, { position: 1, kind: "leave" })).status).toBe(
      400,
    );
  });

  it("高評価を付け外しでき、自分の作品には付けられない", async () => {
    const taro = await signUp("taro@example.com");
    const hanako = await signUp("hanako@example.com");
    const workId = await publish(taro, "古書店の少女");

    const like = (cookie: string, liked: boolean) =>
      request(
        `/api/public-works/${workId}/like`,
        json("PUT", { liked }, cookie),
      );

    const res = await like(hanako, true);
    expect(res.status).toBe(200);
    expect((await res.json()) as SetLikeResponse).toEqual({
      liked: true,
      likes: 1,
    });
    await like(hanako, true);
    expect((await list())[0].likes).toBe(1);
    const { work } = (await (
      await get(workId, hanako)
    ).json()) as GetPublicWorkResponse;
    expect(work.likedByMe).toBe(true);

    expect(
      ((await (await like(hanako, false)).json()) as SetLikeResponse).likes,
    ).toBe(0);
    expect((await like(taro, true)).status).toBe(403);
  });

  it("高評価の多い作品がランキングの上に来る", async () => {
    const taro = await signUp("taro@example.com");
    const hanako = await signUp("hanako@example.com");
    const older = await publish(taro, "先に公開した作品");
    await publish(taro, "後で公開した作品");
    await request(
      `/api/public-works/${older}/like`,
      json("PUT", { liked: true }, hanako),
    );

    expect((await list()).map((w) => w.title)).toEqual([
      "先に公開した作品",
      "後で公開した作品",
    ]);
  });
});
