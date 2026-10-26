/** 読者の好み。冒頭文の選択・行動学習・展開リクエストから組み立てる。 */
export type ReaderPreference = {
  /** 「読みたい」を選んだ冒頭文 */
  likedOpenings: string[];
  /** 「読みたくない」を選んだ冒頭文 */
  dislikedOpenings: string[];
  /** 行動から推定した傾向（例：「短い章を最後まで読む」） */
  learnedTraits: string[];
};

export type ChapterRequest = {
  preference: ReaderPreference;
  /** これまでの章の本文（初回は空） */
  previousChapters: string[];
  /** 読者からの「次はこういう展開がいい」（任意） */
  plotRequest?: string;
};

export type GeneratedChapter = {
  title: string;
  body: string;
};

/**
 * 小説を生成するAIの窓口。
 * 本番は ClaudeNovelGenerator、テストは FakeNovelGenerator を使う。
 */
export interface NovelGenerator {
  generateChapter(request: ChapterRequest): Promise<GeneratedChapter>;
}
