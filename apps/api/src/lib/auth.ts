import { MIN_PASSWORD_LENGTH } from "@novel/core/auth";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";

import { webOrigins, type Env } from "../env";
import { hashPassword, verifyPassword } from "./password";

/**
 * ログイン（Better Auth）。メールアドレスとパスワードで登録・ログインし、確認メールは送らない。
 * スマホアプリ（Flutter）はログイン時の `set-auth-token` ヘッダーのトークンを端末に保存し、
 * `Authorization: Bearer <トークン>` で送ってくる（bearer プラグイン）。
 */
export function createAuth(env: Env) {
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
    // スマホアプリは Origin を付けないので、ブラウザで試すときの開発サーバーだけ
    trustedOrigins: webOrigins(env),
    plugins: [bearer()],
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
