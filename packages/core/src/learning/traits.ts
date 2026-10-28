/** 読者がある作品をどう読んだか。行動学習の元データを作品ごとにまとめたもの */
export type ReadingHistory = {
  title: string;
  /** 第1章の書き出し */
  opening: string;
  chapterCount: number;
  /** 高評価を付けているか */
  liked: boolean;
  /** reading_events のうち、この作品の章の分 */
  events: ReadingEventRecord[];
};

export type ReadingEventRecord = {
  position: number;
  kind: "start" | "complete" | "leave";
  /** 離脱時の読了率（0〜1）。leave 以外は null */
  progress: number | null;
};

/** 種類ごとに載せる作品の数。プロンプトが長くなりすぎないようにする */
export const TRAITS_PER_KIND = 3;

const OPENING_LENGTH = 60;
const TITLE_LENGTH = 40;

function clip(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function describe(h: ReadingHistory): string {
  return `「${clip(h.title, TITLE_LENGTH)}」（書き出し：${clip(h.opening, OPENING_LENGTH)}）`;
}

/** 最後の章まで読み終えたか */
function finished(h: ReadingHistory): boolean {
  return (
    h.chapterCount > 0 &&
    h.events.some((e) => e.kind === "complete" && e.position >= h.chapterCount)
  );
}

/** 読み終えずに離れた、いちばん先の位置。離れていなければ null */
function furthestLeave(
  h: ReadingHistory,
): { position: number; progress: number } | null {
  const completed = new Set(
    h.events.filter((e) => e.kind === "complete").map((e) => e.position),
  );
  let found: { position: number; progress: number } | null = null;
  for (const e of h.events) {
    if (e.kind !== "leave" || completed.has(e.position)) continue;
    const progress = e.progress ?? 0;
    if (
      !found ||
      e.position > found.position ||
      (e.position === found.position && progress > found.progress)
    ) {
      found = { position: e.position, progress };
    }
  }
  // 離れた章より先を読み終えていれば、途中でやめたとは言えない
  const lastCompleted = Math.max(0, ...completed);
  return found && found.position > lastCompleted ? found : null;
}

/**
 * 他人の作品の読み方から、次の章の生成に渡す「読者の傾向」を推定する。
 * [histories] は最近触れた順に渡す。高評価・最後まで読んだ作品を「好き」、
 * 読み終えずに離れた作品を「合わなかった」として、それぞれ新しい順に数件ずつ返す。
 */
export function inferLearnedTraits(histories: ReadingHistory[]): string[] {
  const liked: string[] = [];
  const disliked: string[] = [];
  for (const h of histories) {
    if (h.liked || finished(h)) {
      const how = [h.liked && "高評価した", finished(h) && "最後まで読んだ"]
        .filter(Boolean)
        .join("・");
      if (liked.length < TRAITS_PER_KIND) {
        liked.push(`${how}作品：${describe(h)}`);
      }
      continue;
    }
    const leave = furthestLeave(h);
    if (leave && disliked.length < TRAITS_PER_KIND) {
      const tenths = Math.round(leave.progress * 10);
      const where =
        tenths === 0
          ? `第${leave.position}章の冒頭`
          : `第${leave.position}章の${tenths}割ほど`;
      disliked.push(
        `途中で読むのをやめた作品（${where}で離脱）：${describe(h)}`,
      );
    }
  }
  return [...liked, ...disliked];
}
