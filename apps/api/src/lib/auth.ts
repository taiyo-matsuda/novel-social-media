import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins";

import { webOrigins, type Env } from "../env";
import { d1ModerationStore } from "../features/moderation/d1-moderation-store";

/** テストで Google の署名確認を差し替えるためのもの */
export type AuthDeps = {
  verifyGoogleIdToken?: (token: string, nonce?: string) => Promise<boolean>;
};

/**
 * ログイン（Better Auth）。Google でのログインだけを受け付ける（メールアドレス＋パスワードの登録・ログインはない。
 * docs/decisions/0008-google-only-login.md）。
 * Google はアプリが端末上でログインして受け取った ID トークンを `POST /api/auth/sign-in/social` に送ってくる
 * （`{ provider: "google", idToken: { token } }`）。サーバーは Google の署名と宛先（クライアントID）を確かめる。
 * スマホアプリ（Flutter）はログイン時の `set-auth-token` ヘッダーのトークンを端末に保存し、
 * `Authorization: Bearer <トークン>` で送ってくる（bearer プラグイン）。
 */
export function createAuth(env: Env, deps: AuthDeps = {}) {
  const googleClientIds = googleClientIdsOf(env);
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    emailAndPassword: { enabled: false },
    // アプリ内の退会（POST /api/auth/delete-user）。アプリは Google でログインし直した直後に送る（パスワードはない）。
    // 作品・章・読んだ記録・高評価・ブロックは DB の on delete cascade で消え、通報は通報者を空にして残る
    user: { deleteUser: { enabled: true } },
    // GOOGLE_CLIENT_IDS が空なら Google ログインも無効になり、誰もログインできない
    socialProviders:
      googleClientIds.length > 0
        ? {
            google: {
              // ID トークンの宛先として認めるクライアントID（Web・iOS・Android）
              clientId: googleClientIds,
              // ID トークンでのログインだけなら使わない。ブラウザでの転送型ログインを足すときに設定する
              clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
              verifyIdToken: deps.verifyGoogleIdToken,
            },
          }
        : undefined,
    // 運営が止めたアカウントはログインさせない（止めたときに、それまでのログインも切っている）
    databaseHooks: {
      session: {
        create: {
          async before(session) {
            if (await d1ModerationStore(env.DB).isSuspended(session.userId)) {
              throw APIError.from("FORBIDDEN", {
                message:
                  "このアカウントは利用規約への違反により停止されています",
                code: "SUSPENDED_USER",
              });
            }
          },
        },
      },
    },
    // スマホアプリは Origin を付けないので、ブラウザで試すときの開発サーバーだけ
    trustedOrigins: webOrigins(env),
    plugins: [bearer()],
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** GOOGLE_CLIENT_IDS（カンマ区切り）をクライアントIDの配列にする */
export function googleClientIdsOf(
  env: Pick<Env, "GOOGLE_CLIENT_IDS">,
): string[] {
  return (env.GOOGLE_CLIENT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
