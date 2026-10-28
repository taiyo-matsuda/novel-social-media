export type WorkStats = {
  workId: string;
  /** 読み始めた人数 */
  readers: number;
  /** 最後まで読んだ人数 */
  completions: number;
  /** 高評価の数 */
  likes: number;
  /** 公開からの経過時間（時間） */
  ageHours: number;
};

/**
 * ランキングのスコア。読了と高評価を重く見て、古い作品ほど少しずつ下げる。
 * まだ誰にも読まれていない作品も新しい順に並ぶよう、反応には 1 を足しておく。
 * 重みはMVPの仮置き。調整したら docs/product.md も更新する。
 */
export function rankingScore(s: WorkStats): number {
  const engagement = 1 + s.readers + 3 * s.completions + 5 * s.likes;
  const decay = Math.pow(s.ageHours + 2, 1.5);
  return engagement / decay;
}

/** スコアの高い順に並べる。同点なら読者数の多い順。 */
export function rankWorks(stats: WorkStats[]): WorkStats[] {
  return [...stats].sort(
    (a, b) => rankingScore(b) - rankingScore(a) || b.readers - a.readers,
  );
}

/** 公開日時から今までの経過時間（時間）。未来の日時は 0 にする */
export function ageHours(publishedAt: Date, now: Date): number {
  return Math.max(0, (now.getTime() - publishedAt.getTime()) / 3_600_000);
}
