import type {
  GenerateChapterRequest,
  GenerateChapterResponse,
  ListOpeningChoicesResponse,
  ListOpeningsResponse,
  SaveOpeningChoiceRequest,
} from "@novel/core/api";
import type { Opening } from "@novel/core/openings";

import { authRequestInit } from "./auth-client";
import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * サーバー（apps/api）を呼ぶ。ログイン状態は自動で付ける。
 * AIのAPIキーはアプリに入れず、AI生成も必ずサーバー経由で呼ぶ。
 */
async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const auth = await authRequestInit();
  const res = await fetch(`${API_URL}${path}`, {
    ...auth,
    method: init.method ?? "GET",
    headers: {
      ...(auth.headers as Record<string, string> | undefined),
      ...(init.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new ApiError(res.status, json.error ?? "エラーが発生しました");
  return json as T;
}

/** 冒頭文を表示順に取得する。 */
export async function fetchOpenings(): Promise<Opening[]> {
  return (await request<ListOpeningsResponse>("/api/openings")).openings;
}

/** 本人がこれまでに答えた「読みたい／読みたくない」。 */
export async function fetchOwnChoices(): Promise<Map<number, boolean>> {
  const { choices } = await request<ListOpeningChoicesResponse>(
    "/api/opening-choices",
  );
  return new Map(choices.map((c) => [c.openingId, c.wantsToRead]));
}

/** 1つの冒頭文への答えを保存する（答え直したら上書き）。 */
export async function saveChoice(
  openingId: number,
  wantsToRead: boolean,
): Promise<void> {
  await request(`/api/opening-choices/${openingId}`, {
    method: "PUT",
    body: { wantsToRead } satisfies SaveOpeningChoiceRequest,
  });
}

/** 選び直すときに、これまでの答えを消す。 */
export async function clearChoices(): Promise<void> {
  await request("/api/opening-choices", { method: "DELETE" });
}

/** 次の章の生成を頼む。数十秒かかることがある。 */
export async function generateChapter(
  req: GenerateChapterRequest,
): Promise<GenerateChapterResponse> {
  return request("/api/chapters", { method: "POST", body: req });
}
