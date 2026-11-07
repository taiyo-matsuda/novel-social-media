/** 運営の役割。user テーブルの role がこの値の利用者だけ管理画面を使える */
export const ADMIN_ROLE = "admin";

/** ログイン中の利用者が運営か（user.role が 'admin'） */
export async function isAdminUser(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  if (!userId) return false;
  const row = await db
    .prepare(`select "role" from "user" where "id" = ?`)
    .bind(userId)
    .first<{ role: string }>();
  return row?.role === ADMIN_ROLE;
}
