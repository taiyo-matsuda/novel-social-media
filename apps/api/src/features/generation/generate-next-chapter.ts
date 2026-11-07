import type { NovelGenerator, ReaderPreference } from "@novel/core/ai";
import type {
  GenerateChapterRequest,
  GenerateChapterResponse,
} from "@novel/core/api";

/** 生成に必要なDB操作。本番は D1、テストはメモリ上の実装を使う。 */
export interface ChapterStore {
  loadPreference(userId: string): Promise<ReaderPreference>;
  /** 本人の作品の章（古い順）と創作メモを返す。本人の作品でなければ null */
  loadOwnWork(
    userId: string,
    workId: string,
  ): Promise<{ chapters: string[]; storyNotes: string | null } | null>;
  createWork(userId: string, title: string): Promise<string>;
  /** 章を足す。創作メモがあれば作品のメモも書き換える */
  addChapter(input: {
    workId: string;
    position: number;
    title: string;
    body: string;
    plotRequest?: string;
    storyNotes?: string;
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
  let storyNotes: string | undefined;
  if (req.workId) {
    const work = await store.loadOwnWork(userId, req.workId);
    if (work === null) throw new WorkNotFoundError();
    previousChapters = work.chapters;
    storyNotes = work.storyNotes ?? undefined;
  }

  const generated = await generator.generateChapter({
    preference,
    previousChapters,
    plotRequest: req.plotRequest,
    storyNotes,
  });
  const { title, body } = generated;

  const workId = req.workId ?? (await store.createWork(userId, title));
  const position = previousChapters.length + 1;
  await store.addChapter({
    workId,
    position,
    title,
    body,
    plotRequest: req.plotRequest,
    // メモが出てこなかったときは前のメモを残す
    storyNotes: generated.storyNotes,
  });
  // 創作メモは読者に見せないので応答に含めない
  return { workId, chapter: { position, title, body } };
}
