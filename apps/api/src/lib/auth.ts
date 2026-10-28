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
    // アプリ内の退会（POST /api/auth/delete-user）。アプリは必ずパスワードを送る。
    // 作品・章・読んだ記録・高評価・ブロックは DB の on delete cascade で消え、通報は通報者を空にして残る
    user: { deleteUser: { enabled: true } },
    // スマホアプリは Origin を付けないので、ブラウザで試すときの開発サーバーだけ
    trustedOrigins: webOrigins(env),
    plugins: [bearer()],
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
