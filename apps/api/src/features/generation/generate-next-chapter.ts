import type { NovelGenerator, ReaderPreference } from "@novel/core/ai";
import type {
  GenerateChapterRequest,
  GenerateChapterResponse,
} from "@novel/core/api";

/** 生成に必要なDB操作。本番は D1、テストはメモリ上の実装を使う。 */
export interface ChapterStore {
  loadPreference(userId: string): Promise<ReaderPreference>;
  /** 本人の作品の章を古い順に返す。本人の作品でなければ null */
  loadOwnChapters(userId: string, workId: string): Promise<string[] | null>;
  createWork(userId: string, title: string): Promise<string>;
  addChapter(input: {
    workId: string;
    position: number;
    title: string;
    body: string;
    plotRequest?: string;
  }): Promise<void>;
}

export class WorkNotFoundError extends Error {}

/** 好みと過去の章から次の章を生成して保存する。workId がなければ新しい作品を作る。 */
export async function generateNextChapter(
  deps: { store: ChapterStore; generator: NovelGenerator },
  userId: string,
  req: GenerateChapterRequest,
): Promise<GenerateChapterResponse> {
  const { store, generator } = deps;
  const preference = await store.loadPreference(userId);

  let previousChapters: string[] = [];
  if (req.workId) {
    const chapters = await store.loadOwnChapters(userId, req.workId);
    if (chapters === null) throw new WorkNotFoundError();
    previousChapters = chapters;
  }

  const chapter = await generator.generateChapter({
    preference,
    previousChapters,
    plotRequest: req.plotRequest,
  });

  const workId = req.workId ?? (await store.createWork(userId, chapter.title));
  const position = previousChapters.length + 1;
  await store.addChapter({
    workId,
    position,
    ...chapter,
    plotRequest: req.plotRequest,
  });
  return { workId, chapter: { position, ...chapter } };
}
