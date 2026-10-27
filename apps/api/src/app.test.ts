import { FakeNovelGenerator } from "@novel/core/ai";
import type {
  GenerateChapterResponse,
  ListOpeningChoicesResponse,
  ListOpeningsResponse,
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
async function signUp(email = "taro@example.com", password = "password123") {
  const res = await request(
    "/api/auth/sign-up/email",
    json("POST", { email, password, name: "読者" }),
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

describe("Google でログイン", () => {
  const WEB_CLIENT_ID = "web.apps.googleusercontent.com";

  /** 署名は確かめない（verifyGoogleIdToken で差し替える）ので、中身だけの ID トークンを作る */
  function fakeIdToken(claims: Record<string, unknown>) {
    const encode = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    return `${encode({ alg: "RS256", kid: "test" })}.${encode(claims)}.sig`;
  }

  const hanakoToken = fakeIdToken({
    iss: "https://accounts.google.com",
    aud: WEB_CLIENT_ID,
    sub: "google-user-1",
    email: "hanako@gmail.com",
    email_verified: true,
    name: "花子",
    picture: "https://example.com/a.png",
  });

  function googleApp(valid: boolean) {
    env.GOOGLE_CLIENT_IDS = `${WEB_CLIENT_ID}, ios.apps.googleusercontent.com`;
    return createApp({
      createGenerator: () => generator,
      auth: { verifyGoogleIdToken: async () => valid },
    });
  }

  function signInWithGoogle(
    target: ReturnType<typeof createApp>,
    token: string,
  ) {
    return target.request(
      `${BASE}/api/auth/sign-in/social`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", idToken: { token } }),
      },
      env,
    );
  }

  it("アプリが送った ID トークンでログインでき、トークンで API を使える", async () => {
    const target = googleApp(true);
    const res = await signInWithGoogle(target, hanakoToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { email: string; name: string };
    };
    expect(body.user).toMatchObject({
      email: "hanako@gmail.com",
      name: "花子",
    });

    const token = res.headers.get("set-auth-token");
    expect(token).toBeTruthy();
    const choices = await target.request(
      `${BASE}/api/opening-choices`,
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    expect(choices.status).toBe(200);
  });

  it("2回目のログインでは同じ利用者になる", async () => {
    const target = googleApp(true);
    const first = (await (
      await signInWithGoogle(target, hanakoToken)
    ).json()) as {
      user: { id: string };
    };
    const second = (await (
      await signInWithGoogle(target, hanakoToken)
    ).json()) as { user: { id: string } };
    expect(second.user.id).toBe(first.user.id);
  });

  it("署名が確かめられない ID トークンは弾く", async () => {
    const res = await signInWithGoogle(googleApp(false), hanakoToken);
    expect(res.status).toBe(401);
    expect(res.headers.get("set-auth-token")).toBeNull();
  });

  it("GOOGLE_CLIENT_IDS が空なら Google ログインは使えない", async () => {
    const res = await signInWithGoogle(app, hanakoToken);
    expect(res.status).toBeGreaterThanOrEqual(400);
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
