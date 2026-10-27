import type { Opening } from "@novel/core/openings";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 冒頭文を表示順に取得する。 */
export async function fetchOpenings(db: SupabaseClient): Promise<Opening[]> {
  const { data, error } = await db
    .from("openings")
    .select("id, text, genre")
    .order("sort_order")
    .order("id");
  if (error) throw error;
  return data ?? [];
}

/** 本人がこれまでに答えた「読みたい／読みたくない」。 */
export async function fetchOwnChoices(
  db: SupabaseClient,
  userId: string,
): Promise<Map<number, boolean>> {
  const { data, error } = await db
    .from("opening_choices")
    .select("opening_id, wants_to_read")
    .eq("user_id", userId);
  if (error) throw error;
  return new Map(
    (data ?? []).map((c) => [c.opening_id as number, c.wants_to_read]),
  );
}

/** 1つの冒頭文への答えを保存する（答え直したら上書き）。 */
export async function saveChoice(
  db: SupabaseClient,
  userId: string,
  openingId: number,
  wantsToRead: boolean,
): Promise<void> {
  const { error } = await db
    .from("opening_choices")
    .upsert(
      { user_id: userId, opening_id: openingId, wants_to_read: wantsToRead },
      { onConflict: "user_id,opening_id" },
    );
  if (error) throw error;
}

/** 選び直すときに、これまでの答えを消す。 */
export async function clearChoices(
  db: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await db
    .from("opening_choices")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}
