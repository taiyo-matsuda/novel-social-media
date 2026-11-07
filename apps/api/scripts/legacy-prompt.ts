// 比べるためだけに残している、2026年11月の改善前のプロンプト（packages/core/src/ai/prompts.ts の旧版）。本番では使わない
import type { ChapterRequest } from "@novel/core/ai";

export const LEGACY_SYSTEM_PROMPT = `あなたは日本語の小説家兼編集者です。
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

export function buildLegacyChapterPrompt(req: ChapterRequest): string {
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
