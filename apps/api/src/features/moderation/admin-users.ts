/**
 * 管理画面に入れる運営アカウントの利用者ID（ADMIN_USER_IDS、カンマ区切り）を配列にする。
 * メールアドレスは確認メールなしで登録できるので使わず、アカウントに固有の利用者IDで決める
 */
export function adminUserIdsOf(env: { ADMIN_USER_IDS?: string }): string[] {
  return (env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** ログイン中の利用者が運営か。ADMIN_USER_IDS が空なら誰も運営ではない */
export function isAdminUser(
  userId: string,
  env: { ADMIN_USER_IDS?: string },
): boolean {
  return adminUserIdsOf(env).includes(userId);
}
