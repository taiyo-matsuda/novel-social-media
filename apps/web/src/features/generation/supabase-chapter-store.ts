import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChapterStore } from "./generate-next-chapter";

/** ChapterStore の Supabase 実装。RLS が効くよう、利用者本人のトークンで作ったクライアントを渡す。 */
export function supabaseChapterStore(db: SupabaseClient): ChapterStore {
  return {
    async loadPreference(userId) {
      const { data, error } = await db
        .from("opening_choices")
        .select("wants_to_read, openings(text)")
        .eq("user_id", userId);
      if (error) throw error;
      const texts = (wants: boolean) =>
        (data ?? [])
          .filter((c) => c.wants_to_read === wants)
          .flatMap((c) => {
            const o = c.openings as
              { text: string } | { text: string }[] | null;
            return Array.isArray(o) ? o.map((x) => x.text) : o ? [o.text] : [];
          });
      // TODO: reading_events から傾向を推定して learnedTraits に入れる
      return {
        likedOpenings: texts(true),
        dislikedOpenings: texts(false),
        learnedTraits: [],
      };
    },

    async loadOwnChapters(userId, workId) {
      const { data: work, error } = await db
        .from("works")
        .select("id")
        .eq("id", workId)
        .eq("author_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!work) return null;
      const { data: chapters, error: chError } = await db
        .from("chapters")
        .select("body")
        .eq("work_id", workId)
        .order("position");
      if (chError) throw chError;
      return (chapters ?? []).map((c) => c.body as string);
    },

    async createWork(userId, title) {
      const { data, error } = await db
        .from("works")
        .insert({ author_id: userId, title })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },

    async addChapter({ workId, position, title, body, plotRequest }) {
      const { error } = await db.from("chapters").insert({
        work_id: workId,
        position,
        title,
        body,
        plot_request: plotRequest ?? null,
      });
      if (error) throw error;
    },
  };
}
