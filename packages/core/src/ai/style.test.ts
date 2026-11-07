import { describe, expect, it } from "vitest";

import { measureStyle } from "./style";

describe("measureStyle", () => {
  it("字数・段落・会話の割合を数える", () => {
    const m = measureStyle(
      "雨が降っていた。\n「傘は」\n＊\n彼女は首を振った。",
    );
    expect(m.chars).toBe(8 + 4 + 9);
    expect(m.paragraphs).toBe(3);
    expect(m.averageParagraph).toBe(7);
    expect(m.dialogueRatio).toBe(0.1);
    expect(m.dialogueRuns).toBe(0);
  });

  it("会話だけの段落が3つ続くたびに数える", () => {
    const m = measureStyle(
      [
        "「おはよう」",
        "「おう」",
        "「今日は？」",
        "「さあ」",
        "地の文。",
        "「あ」",
        "「い」",
        "「う」",
      ].join("\n"),
    );
    expect(m.dialogueRuns).toBe(2);
  });

  it("感嘆符や三点リーダーの多さを千字あたりで出す", () => {
    expect(measureStyle("あ！".repeat(50)).marksPer1000).toBe(500);
    expect(measureStyle("").marksPer1000).toBe(0);
  });
});
