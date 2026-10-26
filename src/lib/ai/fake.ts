import type { ChapterRequest, GeneratedChapter, NovelGenerator } from "./types";

/** テスト・ローカル開発用。APIを呼ばずに決まった章を返し、受け取った依頼を記録する。 */
export class FakeNovelGenerator implements NovelGenerator {
  readonly requests: ChapterRequest[] = [];

  async generateChapter(req: ChapterRequest): Promise<GeneratedChapter> {
    this.requests.push(req);
    const n = req.previousChapters.length + 1;
    return { title: `第${n}章`, body: `これはテスト用の第${n}章です。` };
  }
}
