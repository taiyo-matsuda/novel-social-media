/**
 * Authorization ヘッダーの合言葉が ADMIN_TOKEN と一致するか。
 * 合言葉が空なら管理画面は使えない。かかる時間で中身を推測されないよう、最後まで比べる
 */
export function isAdminAuthorized(
  header: string | undefined,
  adminToken: string | undefined,
): boolean {
  if (!adminToken || !header?.startsWith("Bearer ")) return false;
  const given = new TextEncoder().encode(header.slice("Bearer ".length));
  const expected = new TextEncoder().encode(adminToken);
  let diff = given.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) {
    diff |= (given[i] ?? 0) ^ expected[i]!;
  }
  return diff === 0;
}
