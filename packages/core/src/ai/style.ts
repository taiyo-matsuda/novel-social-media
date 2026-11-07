import { SCENE_BREAK } from "./prompts";

/** 章の本文の書きぶりを数で表したもの。docs/writing-standard.md の目安と見比べる */
export type StyleMetrics = {
  /** 本文の字数（改行を除く） */
  chars: number;
  paragraphs: number;
  /** 段落の平均の字数 */
  averageParagraph: number;
  /** 「」の中の字数が本文に占める割合（0〜1） */
  dialogueRatio: number;
  /** 会話だけの段落が3つ以上続いた回数（台本のような書き方） */
  dialogueRuns: number;
  /** 「！」「？」「…」「―」の千字あたりの数 */
  marksPer1000: number;
};

/** 本文の書きぶりを数える。段落は1行1段落、「＊」の行は場面転換として数えない */
export function measureStyle(body: string): StyleMetrics {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && l !== SCENE_BREAK);
  const chars = lines.join("").length;

  let dialogue = 0;
  for (const match of body.matchAll(/「([^「」]*)」/g)) {
    dialogue += match[1].length;
  }

  let dialogueRuns = 0;
  let run = 0;
  for (const line of lines) {
    const onlyDialogue = /^「[^」]*」$/.test(line);
    run = onlyDialogue ? run + 1 : 0;
    if (run === 3) dialogueRuns += 1;
  }

  const marks = (body.match(/[！？!?…―]/g) ?? []).length;
  return {
    chars,
    paragraphs: lines.length,
    averageParagraph: lines.length === 0 ? 0 : Math.round(chars / lines.length),
    dialogueRatio: chars === 0 ? 0 : Math.round((dialogue / chars) * 100) / 100,
    dialogueRuns,
    marksPer1000: chars === 0 ? 0 : Math.round((marks / chars) * 10000) / 10,
  };
}
