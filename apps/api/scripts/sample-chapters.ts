// 改善前と改善後のプロンプトで同じ読者の第1章・第2章を生成し、見比べられる Markdown に書き出す。
// Claude API を呼ぶので料金がかかる（3人×2章×2通りで12回）。テストでは使わない。
//
//   cd apps/api
//   ANTHROPIC_API_KEY=... pnpm sample:chapters ../../docs/samples/2026-11-literary.md
//
// キーは .dev.vars から読み込む（画面にもファイルにも出さない）。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import {
  buildChapterPrompt,
  type ChapterRequest,
  type GeneratedChapter,
  measureStyle,
  parseChapter,
  type ReaderPreference,
  SYSTEM_PROMPT,
} from "@novel/core/ai";

import {
  buildLegacyChapterPrompt,
  LEGACY_SYSTEM_PROMPT,
} from "./legacy-prompt";

type Reader = {
  name: string;
  preference: ReaderPreference;
  firstWish?: string;
  plotRequest: string;
};

// 冒頭文は apps/api/migrations の冒頭文から選んでいる
const READERS: Reader[] = [
  {
    name: "古書店のミステリーが好きな読者",
    preference: {
      likedOpenings: [
        "雨の夜、閉店したはずの古書店に灯りがともっていた。扉を押すと、カウンターの向こうで見知らぬ少女が、私の名前が書かれた本を読んでいた。",
        "事件の容疑者は七人。全員が同じ夢を見たと証言した。夢の中で、被害者は自分で自分を殺していた。",
      ],
      dislikedOpenings: [
        "うちの猫が、ある日しゃべった。第一声は「おまえ、明日の会議で失敗するぞ」だった。",
      ],
      learnedTraits: [],
    },
    plotRequest: "少女の正体に少しずつ近づいてほしい",
  },
  {
    name: "家族と土地の話が好きな読者",
    preference: {
      likedOpenings: [
        "定年まであと一年。三十八年勤めた町工場が、来月で閉鎖されると聞いた。妻にはまだ言えていない。",
        "十年ぶりに帰った港町で、幼なじみは漁師になっていた。あの夏、二人で海に沈めた箱のことを、彼はもう覚えていないふりをした。",
      ],
      dislikedOpenings: [
        "勇者が魔王を倒してから三百年。平和になりすぎた王国で、元魔王軍の四天王だった私は、今日もパン屋の開店準備をしている。",
        "目が覚めると、私は自分が書いた小説の悪役令嬢になっていた。しかも、断罪イベントは今夜だ。",
      ],
      learnedTraits: [],
    },
    firstWish: "大きな事件は起きなくていいので、人の暮らしがちゃんと書かれた話",
    plotRequest: "妻の側の気持ちも知りたい",
  },
  {
    name: "ファンタジーが好きな読者",
    preference: {
      likedOpenings: [
        "竜の背に乗れるのは、竜に選ばれた者だけ。選ばれなかった私は、竜の世話係として、今日も鱗を磨いている。",
        "火星行きの移民船が出発して四十年。船内で生まれた僕たちは、地球を一度も見たことがない。そして今朝、航路が書き換えられていることに気づいた。",
      ],
      dislikedOpenings: [
        "「好きです」と言うつもりだった。卒業式の朝、彼の下駄箱に入っていたのは、私が書いたはずのラブレターだった。",
      ],
      learnedTraits: [],
    },
    plotRequest: "竜と主人公の関係が変わるきっかけがほしい",
  },
];

type Variant = {
  label: string;
  system: string;
  build: (req: ChapterRequest) => string;
  effort: "medium" | "high";
};

const VARIANTS: Variant[] = [
  {
    label: "改善前",
    system: LEGACY_SYSTEM_PROMPT,
    build: buildLegacyChapterPrompt,
    effort: "medium",
  },
  {
    label: "改善後",
    system: SYSTEM_PROMPT,
    build: buildChapterPrompt,
    effort: "high",
  },
];

function loadApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const line = readFileSync(".dev.vars", "utf8")
      .split("\n")
      .find((l) => l.startsWith("ANTHROPIC_API_KEY="));
    const key = line?.slice("ANTHROPIC_API_KEY=".length).trim();
    if (key) return key;
  } catch {
    // .dev.vars がなければ下で止める
  }
  throw new Error(
    "ANTHROPIC_API_KEY がありません（.dev.vars か環境変数に入れる）",
  );
}

const client = new Anthropic({ apiKey: loadApiKey() });
const model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

async function generate(
  variant: Variant,
  req: ChapterRequest,
): Promise<GeneratedChapter> {
  const stream = client.beta.messages.stream({
    model,
    max_tokens: 64000,
    output_config: { effort: variant.effort },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: variant.system,
    messages: [{ role: "user", content: variant.build(req) }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    return { title: "（生成を断られた）", body: "" };
  }
  const text = message.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("");
  return parseChapter(text);
}

function metricsLine(body: string): string {
  const m = measureStyle(body);
  return `字数 ${m.chars}・段落 ${m.paragraphs}（平均 ${m.averageParagraph}字）・会話の割合 ${Math.round(m.dialogueRatio * 100)}%・会話だけの段落が3つ以上続いた回数 ${m.dialogueRuns}・記号（！？…―）千字あたり ${m.marksPer1000}`;
}

async function runReader(reader: Reader, variant: Variant): Promise<string> {
  const first = await generate(variant, {
    preference: reader.preference,
    previousChapters: [],
    plotRequest: reader.firstWish,
  });
  const second = await generate(variant, {
    preference: reader.preference,
    previousChapters: [first.body],
    plotRequest: reader.plotRequest,
    storyNotes: first.storyNotes,
  });
  return [
    `### ${variant.label}`,
    `#### 第1章　${first.title}`,
    `> ${metricsLine(first.body)}`,
    first.body,
    `#### 第2章　${second.title}（展開リクエスト：${reader.plotRequest}）`,
    `> ${metricsLine(second.body)}`,
    second.body,
    ...(second.storyNotes
      ? [
          "<details><summary>創作メモ（第2章まで）</summary>",
          "",
          second.storyNotes,
          "",
          "</details>",
        ]
      : []),
  ].join("\n\n");
}

const out = process.argv[2] ?? "sample-chapters.md";
mkdirSync(dirname(out), { recursive: true });
const sections: string[] = [
  `# 改善前と改善後の生成例\n\nモデル：${model}。${new Date().toISOString().slice(0, 10)} に apps/api/scripts/sample-chapters.ts で生成。`,
];
// 読者ごとに書き出す。途中で落ちても、それまでの分は残る
const save = () => writeFileSync(out, sections.join("\n\n") + "\n");
save();
for (const reader of READERS) {
  const results = await Promise.all(VARIANTS.map((v) => runReader(reader, v)));
  sections.push(`## ${reader.name}`, ...results);
  save();
  console.log(`生成した：${reader.name}`);
}
console.log(`書き出した：${out}`);
