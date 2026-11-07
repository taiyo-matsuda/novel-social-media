import { describe, expect, it } from "vitest";

import {
  buildChapterPrompt,
  LEARNED_TRAITS_GUIDE,
  NOTES_MARKER,
  OPENINGS_GUIDE,
  parseChapter,
  PLOT_REQUEST_GUIDE,
  RECENT_CHAPTERS,
  SYSTEM_PROMPT,
} from "./prompts";

const preference = {
  likedOpenings: ["雨の夜、古書店の扉が開いた。"],
  dislikedOpenings: ["勇者は魔王城の前に立っていた。"],
  learnedTraits: [],
};

describe("buildChapterPrompt", () => {
  it("初回は第1章を依頼する", () => {
    const prompt = buildChapterPrompt({ preference, previousChapters: [] });
    expect(prompt).toContain("雨の夜、古書店の扉が開いた。");
    expect(prompt).toContain("第1章を書いてください");
    expect(prompt).not.toContain("これまでの章");
  });

  it("第1章への希望は「読みたい話」として渡す", () => {
    const prompt = buildChapterPrompt({
      preference,
      previousChapters: [],
      plotRequest: "猫が探偵役の話",
    });
    expect(prompt).toContain("## 読者が読みたい話\n猫が探偵役の話");
    expect(prompt).toContain(PLOT_REQUEST_GUIDE);
    expect(prompt).not.toContain("展開リクエスト");
  });

  it("冒頭文は手がかりとして使い、まねしないよう指示する", () => {
    const prompt = buildChapterPrompt({ preference, previousChapters: [] });
    expect(prompt).toContain(OPENINGS_GUIDE);
  });

  it("創作メモがあれば渡し、本文は直近の章だけにする", () => {
    const chapters = ["一章", "二章", "三章", "四章"];
    const prompt = buildChapterPrompt({
      preference,
      previousChapters: chapters,
      storyNotes: "### 登場人物\n- 澄江",
    });
    expect(prompt).toContain(
      "## 創作メモ（第4章までを書いたあなた自身の覚え書き）\n### 登場人物\n- 澄江",
    );
    expect(prompt).toContain(
      `## 直近の章（第1〜${chapters.length - RECENT_CHAPTERS}章は創作メモのあらすじで把握してください）`,
    );
    expect(prompt).not.toContain("### 第2章\n二章");
    expect(prompt).toContain("### 第3章\n三章");
    expect(prompt).toContain("### 第4章\n四章");
    expect(prompt).toContain("第5章を書いてください");
  });

  it("創作メモのない古い作品は、全部の章を渡す", () => {
    const prompt = buildChapterPrompt({
      preference,
      previousChapters: ["一章", "二章", "三章"],
    });
    expect(prompt).toContain("## これまでの章");
    expect(prompt).toContain("### 第1章\n一章");
    expect(prompt).not.toContain("創作メモ（");
  });

  it("続きの章では前の章と展開リクエストを含める", () => {
    const prompt = buildChapterPrompt({
      preference,
      previousChapters: ["一章の本文"],
      plotRequest: "店主の秘密を明かしてほしい",
    });
    expect(prompt).toContain("### 第1章\n一章の本文");
    expect(prompt).toContain(
      "## 読者からの展開リクエスト\n店主の秘密を明かしてほしい",
    );
    expect(prompt).toContain("第2章を書いてください");
  });

  it("行動から分かった傾向があれば、使い方の指示と一緒に渡す", () => {
    const prompt = buildChapterPrompt({
      preference: {
        ...preference,
        learnedTraits: ["高評価した作品：「灯台」（書き出し：霧の朝）"],
      },
      previousChapters: [],
    });
    expect(prompt).toContain(
      "## 行動から分かった読者の傾向\n- 高評価した作品：「灯台」（書き出し：霧の朝）",
    );
    expect(prompt).toContain(LEARNED_TRAITS_GUIDE);
  });

  it("傾向がまだなければ指示を付けない", () => {
    const prompt = buildChapterPrompt({ preference, previousChapters: [] });
    expect(prompt).toContain("## 行動から分かった読者の傾向\n（なし）");
    expect(prompt).not.toContain(LEARNED_TRAITS_GUIDE);
  });
});

describe("SYSTEM_PROMPT", () => {
  it("創作メモの区切りと、地の文を主にする方針を含む", () => {
    expect(SYSTEM_PROMPT).toContain(NOTES_MARKER);
    expect(SYSTEM_PROMPT).toContain("地の文");
    expect(SYSTEM_PROMPT).toContain("ライトノベル");
  });
});

describe("parseChapter", () => {
  it("本文のあとの創作メモを切り分ける", () => {
    expect(
      parseChapter(
        `雪の朝\n\n一段落目。\n二段落目。\n${NOTES_MARKER}\n### 登場人物\n- 澄江`,
      ),
    ).toEqual({
      title: "雪の朝",
      body: "一段落目。\n二段落目。",
      storyNotes: "### 登場人物\n- 澄江",
    });
  });

  it("タイトルの章番号と、段落頭の字下げ・空行を取り除く", () => {
    expect(
      parseChapter(
        "第一章　雪の朝\n\n　一段落目。\n\n　二段落目。\n＊\n「はい」",
      ),
    ).toEqual({
      title: "雪の朝",
      body: "一段落目。\n二段落目。\n＊\n「はい」",
    });
  });

  it("1行目をタイトル、残りを本文にする", () => {
    expect(parseChapter("# 古書店\n\n本文です。")).toEqual({
      title: "古書店",
      body: "本文です。",
    });
  });

  it("改行がなければ無題にする", () => {
    expect(parseChapter("本文だけ")).toEqual({
      title: "無題",
      body: "本文だけ",
    });
  });
});
