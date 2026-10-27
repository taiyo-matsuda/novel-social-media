/** Worker に渡される設定と D1。値は wrangler.jsonc・.dev.vars・`wrangler secret` から入る */
export type Env = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  /** ブラウザから呼んでよい開発用オリジン（カンマ区切り） */
  TRUSTED_ORIGINS?: string;
  /** 空ならAIはフェイクで動く */
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
};

/** TRUSTED_ORIGINS をオリジンの配列にする */
export function webOrigins(env: Pick<Env, "TRUSTED_ORIGINS">): string[] {
  return (env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
