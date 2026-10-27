import { expo } from "@better-auth/expo";
import { MIN_PASSWORD_LENGTH } from "@novel/core/auth";
import { betterAuth } from "better-auth";

import { webOrigins, type Env } from "../env";
import { hashPassword, verifyPassword } from "./password";

/**
 * ログイン（Better Auth）。メールアドレスとパスワードで登録・ログインし、確認メールは送らない。
 * スマホアプリはクッキーを端末に保存して送ってくる（@better-auth/expo）。
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
    // アプリ（novelsns://）と、ブラウザで試すときの開発サーバー
    trustedOrigins: ["novelsns://", ...webOrigins(env)],
    plugins: [expo()],
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
