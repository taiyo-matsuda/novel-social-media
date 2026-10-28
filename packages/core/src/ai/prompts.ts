import type { ChapterRequest } from "./types";

export const SYSTEM_PROMPT = `あなたは日本語の小説家兼編集者です。
読者一人ひとりの好みに合わせて、続きが読みたくなる章を書きます。
実在の作品の文章や固有の設定をそのまま使わないでください。

出力は次の形式に従ってください。
1行目：章タイトルのみ
2行目：空行
3行目以降：本文`;

function bullets(items: string[]): string {
  return items.length === 0
    ? "（なし）"
    : items.map((s) => `- ${s}`).join("\n");
}

/** 章生成のユーザープロンプトを組み立てる。純粋関数なのでテストしやすい。 */
export function buildChapterPrompt(req: ChapterRequest): string {
  const { preference, previousChapters, plotRequest } = req;
  const parts = [
    `## 読者が「読みたい」と選んだ冒頭文\n${bullets(preference.likedOpenings)}`,
    `## 読者が「読みたくない」と選んだ冒頭文\n${bullets(preference.dislikedOpenings)}`,
    `## 行動から分かった読者の傾向\n${bullets(preference.learnedTraits)}`,
  ];
  if (previousChapters.length > 0) {
    parts.push(
      `## これまでの章\n${previousChapters
        .map((c, i) => `### 第${i + 1}章\n${c}`)
        .join("\n\n")}`,
    );
  }
  if (plotRequest) {
    // 第1章では「どんな話を読みたいか」、2章目以降では「次はこうしてほしい」として渡す
    parts.push(
      previousChapters.length === 0
        ? `## 読者が読みたい話\n${plotRequest}`
        : `## 読者からの展開リクエスト\n${plotRequest}`,
    );
  }
  parts.push(
    previousChapters.length === 0
      ? "この読者のために、新しい小説の第1章を書いてください。"
      : `この続きとして第${previousChapters.length + 1}章を書いてください。`,
  );
  return parts.join("\n\n");
}

/** モデル出力を「タイトル + 本文」に分ける。 */
export function parseChapter(text: string): { title: string; body: string } {
  const trimmed = text.trim();
  const newline = trimmed.indexOf("\n");
  if (newline === -1) return { title: "無題", body: trimmed };
  return {
    title:
      trimmed
        .slice(0, newline)
        .replace(/^#+\s*/, "")
        .trim() || "無題",
    body: trimmed.slice(newline + 1).trim(),
  };
}
