import { MIN_PASSWORD_LENGTH } from "@novel/core/auth";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";

import { webOrigins, type Env } from "../env";
import { hashPassword, verifyPassword } from "./password";

/** テストで Google の署名確認を差し替えるためのもの */
export type AuthDeps = {
  verifyGoogleIdToken?: (token: string, nonce?: string) => Promise<boolean>;
};

/**
 * ログイン（Better Auth）。Google でのログインと、メールアドレス＋パスワード（確認メールなし）を受け付ける。
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
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    // GOOGLE_CLIENT_IDS が空なら Google ログインは無効
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
