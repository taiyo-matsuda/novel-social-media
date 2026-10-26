import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

/**
 * スマホアプリからの API 呼び出し用。
 * Authorization: Bearer <Supabaseのアクセストークン> を検証し、本人として振る舞うクライアントを返す。
 */
export async function authenticateBearer(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;

  const env = publicEnv();
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    },
  );
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { db, userId: data.user.id };
}
