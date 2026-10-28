import { describe, expect, it } from "vitest";

import { buildChapterPrompt, parseChapter } from "./prompts";

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
    expect(prompt).not.toContain("展開リクエスト");
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
});

describe("parseChapter", () => {
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
