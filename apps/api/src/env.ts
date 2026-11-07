/** Worker に渡される設定と D1。値は wrangler.jsonc・.dev.vars・`wrangler secret` から入る */
export type Env = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  /** ブラウザから呼んでよい開発用オリジン（カンマ区切り） */
  TRUSTED_ORIGINS?: string;
  /** Google ログインで認めるクライアントID（Web・iOS・Android をカンマ区切り）。空なら Google ログインは無効 */
  GOOGLE_CLIENT_IDS?: string;
  /** Web クライアントのシークレット。ID トークンでのログインだけなら不要 */
  GOOGLE_CLIENT_SECRET?: string;
  /** 空ならAIはフェイクで動く */
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  /** 通報などを運営に知らせる Slack の Incoming Webhook の URL。空なら知らせない */
  OPS_WEBHOOK_URL?: string;
  /** 管理画面（/admin）に入れる運営アカウントの利用者ID（カンマ区切り）。空なら誰も入れない */
  ADMIN_USER_IDS?: string;
};

/** TRUSTED_ORIGINS をオリジンの配列にする */
export function webOrigins(env: Pick<Env, "TRUSTED_ORIGINS">): string[] {
  return (env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
