/** 冒頭文（運営が用意する短い書き出し） */
export type Opening = {
  id: number;
  text: string;
  genre: string | null;
};

/** 冒頭文への「読みたい（true）／読みたくない（false）」。キーは冒頭文のID */
export type OpeningChoices = ReadonlyMap<number, boolean>;

/** 好みを伝え終えたとみなす最小の回答数 */
export const MIN_CHOICES = 3;

/** まだ答えていない最初の冒頭文。全部答えたら null */
export function nextOpening(
  openings: readonly Opening[],
  choices: OpeningChoices,
): Opening | null {
  return openings.find((o) => !choices.has(o.id)) ?? null;
}

export function likedCount(choices: OpeningChoices): number {
  return [...choices.values()].filter(Boolean).length;
}

/**
 * 「この好みで始める」を押せるか。
 * 何も読みたくないままだとAIが手がかりを持てないので、「読みたい」が1つ以上必要。
 */
export function canFinish(choices: OpeningChoices): boolean {
  return choices.size >= MIN_CHOICES && likedCount(choices) >= 1;
}

/** 全部「読みたくない」で使い切ったときなど、もう選べるものがないのに始められない状態 */
export function isStuck(
  openings: readonly Opening[],
  choices: OpeningChoices,
): boolean {
  return nextOpening(openings, choices) === null && !canFinish(choices);
}
