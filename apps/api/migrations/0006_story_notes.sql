-- 長編の一貫性を保つための創作メモ（登場人物・あらすじ・伏線など）。章を生成するたびにAIが書き直す。
-- 作者本人の生成にだけ使い、ほかの利用者に見せる API では返さない
alter table "works" add column "story_notes" text;
