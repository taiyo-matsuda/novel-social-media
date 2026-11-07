import type { ChapterRequest, GeneratedChapter } from "./types";

/** 1章のおおよその長さ（字数）。長編の1章として読みごたえがあり、スマホでも1回で読み切れる長さ */
export const CHAPTER_LENGTH = { min: 5000, max: 8000 } as const;

/** 創作メモがあるとき、本文をそのまま渡す直近の章の数。それより前は創作メモのあらすじで把握させる */
export const RECENT_CHAPTERS = 2;

/** 本文と創作メモの区切りの行 */
export const NOTES_MARKER = "【創作メモ】";

/** 場面転換を表す行。アプリはこの行を中央に小さく表示する */
export const SCENE_BREAK = "＊";

/**
 * 文章の基準は docs/writing-standard.md。ここを変えたら文書も直す。
 * 作品ごとに変わる内容は入れない（プロンプトキャッシュが効くように固定の文にする）
 */
export const SYSTEM_PROMPT = `あなたは日本語で文芸作品を書く小説家です。一人の読者のために、文芸誌や書店の文芸棚に並んでも見劣りしない長編小説を、一章ずつ書きます。読者は、読みたいものを読み尽くした大人の本読みです。

## 目指す文章
- 地の文で語る小説にする。地の文が全体のおよそ七割以上を占めるようにし、会話は場面を動かすところに絞る。会話の行だけが何行も続く、台本やチャットのような書き方はしない。
- 感情や性格を説明しない。「悲しかった」「彼は優しい人だった」と書く代わりに、しぐさ、間、言いよどみ、物、光や音で読者に感じ取らせる。説明は、読者が迷う最小限にとどめる。
- 具体的に書く。土地、季節、天気、食べ物、仕事の手順、手ざわりなど、その場にしかない細部を選ぶ。決まり文句（「時が止まったようだった」「胸が締めつけられた」など）は使わない。
- 文の長さと段落の長さに緩急をつける。短い一文ずつを改行で並べる書き方はしない。
- 人物には、欲しいもの、隠していること、その人らしい話し方、矛盾を持たせる。善人と悪人に分けない。脇役にも、物語の外にある暮らしを感じさせる。
- 視点を決めて守る。一つの場面の中で視点人物を変えない。視点人物が知りえないことは書かない。
- 文体（だ・である調かです・ます調か、一人称か三人称か、人物の呼び方）は第1章で決め、最後まで変えない。
- 急がない。毎章で大事件を起こしたり、章の終わりを無理な引きにしたりしない。章は、余韻や静かな問いで閉じてよい。
- 謎や伏線は、回収の見通しを持って置く。置いたものは忘れない。
- どのジャンルでも、この書き方で書く。ファンタジーや SF でも、世界の決まりごとを解説で並べず、人物の暮らしと行動の中で見せる。

## 書かないもの
- ライトノベルやネット小説の定型：チャットのような会話の羅列、ステータスやスキルの表示、過剰な擬音、「！？」「……」「――」の多用、笑いの記号や顔文字、語尾で人物を描き分けるキャラクター付け
- 見出し、太字、箇条書きなどの装飾。読者への語りかけ、あとがき、章の要約
- 実在の作品の文章や、固有の人物・設定の流用

## 体裁
- 段落ごとに改行する。段落の頭に字下げの空白は入れない（アプリが入れる）。段落の間に空行は入れない。
- 場面が変わるところには「${SCENE_BREAK}」だけの行を入れる。
- 会話は「」で囲む。話している人物の動作や表情は、前後の地の文で書く。
- 一章はおよそ${CHAPTER_LENGTH.min}〜${CHAPTER_LENGTH.max}字にする。

## 出力の形式
1行目：章のタイトルだけ（「第一章」などの番号は付けない）
2行目：空行
3行目から：本文
本文のあとに「${NOTES_MARKER}」だけの行を置き、その下に創作メモを書く。創作メモは読者には見せない、次の章を書く自分のための覚え書きで、作品全体の最新の状態を表す。毎章、前のメモで変わらない部分も含めて全部を書き直す。次の見出しで、合わせて2000字以内にまとめる。
### 作品の芯（主題、視点と文体、トーン）
### 登場人物（名前、年齢、立場、欲しいもの、隠していること、話し方）
### 舞台と決まりごと
### これまでのあらすじ（章ごとに二、三文）
### 置いた伏線と、まだ答えていない問い
### この先の見通し（結末の方向と、次の章でやること）`;

/** 冒頭文の選択の使い方 */
export const OPENINGS_GUIDE =
  "冒頭文は、この読者が惹かれる題材・雰囲気・語り口の手がかりです。どれかの冒頭文をそのまま使う必要はなく、文章もまねしないでください。「読みたくない」を選んだものに近い題材や語り口は避けてください。";

/** 行動から分かった傾向があるときに添える、使い方の指示 */
export const LEARNED_TRAITS_GUIDE =
  "好んだ作品に近い雰囲気・題材・テンポは取り入れ、途中で読むのをやめた作品に近い書き方は避けてください。ほかの作品の題名や文章はまねしないでください。";

/** 展開リクエストの扱い方 */
export const PLOT_REQUEST_GUIDE =
  "読者の希望は、作品の芯・人物・文体を壊さない形で取り入れてください。一章で急いで片付けず、物語の流れの中で自然に向かっていけば十分です。希望をそのまま書き写したり、希望に応えたことを本文で説明したりしないでください。";

function bullets(items: string[]): string {
  return items.length === 0
    ? "（なし）"
    : items.map((s) => `- ${s}`).join("\n");
}

/** 章生成のユーザープロンプトを組み立てる。純粋関数なのでテストしやすい。 */
export function buildChapterPrompt(req: ChapterRequest): string {
  const { preference, previousChapters, plotRequest, storyNotes } = req;
  const next = previousChapters.length + 1;
  const parts = [
    `## 読者が「読みたい」と選んだ冒頭文\n${bullets(preference.likedOpenings)}`,
    `## 読者が「読みたくない」と選んだ冒頭文\n${bullets(preference.dislikedOpenings)}`,
    OPENINGS_GUIDE,
    `## 行動から分かった読者の傾向\n${bullets(preference.learnedTraits)}`,
  ];
  if (preference.learnedTraits.length > 0) {
    // 傾向は他人の作品の題名と書き出し。雰囲気だけ参考にさせ、文章をまねさせない
    parts.push(LEARNED_TRAITS_GUIDE);
  }
  if (storyNotes) {
    parts.push(
      `## 創作メモ（第${next - 1}章までを書いたあなた自身の覚え書き）\n${storyNotes}`,
    );
  }
  if (previousChapters.length > 0) {
    // 創作メモがあれば直近の章だけを渡し、長編でもプロンプトが際限なく伸びないようにする。
    // メモがない古い作品は、これまでどおり全部の章を渡す
    const from = storyNotes
      ? Math.max(0, previousChapters.length - RECENT_CHAPTERS)
      : 0;
    const heading =
      from === 0
        ? "## これまでの章"
        : `## 直近の章（第1〜${from}章は創作メモのあらすじで把握してください）`;
    parts.push(
      `${heading}\n${previousChapters
        .slice(from)
        .map((c, i) => `### 第${from + i + 1}章\n${c}`)
        .join("\n\n")}`,
    );
  }
  if (plotRequest) {
    // 第1章では「どんな話を読みたいか」、2章目以降では「次はこうしてほしい」として渡す
    parts.push(
      previousChapters.length === 0
        ? `## 読者が読みたい話\n${plotRequest}`
        : `## 読者からの展開リクエスト\n${plotRequest}`,
      PLOT_REQUEST_GUIDE,
    );
  }
  parts.push(
    previousChapters.length === 0
      ? "この読者のために、新しい長編小説の第1章を書いてください。長編の始まりとして、人物と舞台を急がずに立ち上げ、作品の芯を据えてください。最後に創作メモを書いてください。"
      : `この続きとして第${next}章を書いてください。創作メモの人物・視点・文体を守り、前の章の終わりから自然につなげてください。最後に、この章までを反映した創作メモを書き直してください。`,
  );
  return parts.join("\n\n");
}

/** 「第一章」「第3章：」のような番号をタイトルから外す（アプリが番号を付けるので二重になる） */
function stripChapterNumber(title: string): string {
  return title
    .replace(/^#+\s*/, "")
    .replace(/^第[0-9０-９一二三四五六七八九十百千]+章[\s　:：、・]*/, "")
    .trim();
}

/** 段落頭の字下げと、段落の間の空行を整える。字下げはアプリが入れる */
function normalizeBody(body: string): string {
  return body
    .split("\n")
    .map((line) => line.replace(/^[\s　]+/, "").trimEnd())
    .filter((line) => line !== "")
    .join("\n");
}

/** モデル出力を「タイトル + 本文 + 創作メモ」に分ける。 */
export function parseChapter(text: string): GeneratedChapter {
  const trimmed = text.trim();
  const markerAt = trimmed.indexOf(NOTES_MARKER);
  const story = markerAt === -1 ? trimmed : trimmed.slice(0, markerAt).trim();
  const notes =
    markerAt === -1 ? "" : trimmed.slice(markerAt + NOTES_MARKER.length).trim();

  const newline = story.indexOf("\n");
  const title =
    newline === -1 ? "" : stripChapterNumber(story.slice(0, newline));
  const body = normalizeBody(newline === -1 ? story : story.slice(newline + 1));
  return {
    title: title || "無題",
    body,
    ...(notes ? { storyNotes: notes } : {}),
  };
}
