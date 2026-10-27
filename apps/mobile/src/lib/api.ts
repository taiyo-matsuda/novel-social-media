import type {
  GenerateChapterRequest,
  GenerateChapterResponse,
} from "@novel/core/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * サーバー（apps/web）に次の章の生成を頼む。
 * AIのAPIキーはアプリに入れず、必ずサーバー経由で呼ぶ。
 */
export async function generateChapter(
  accessToken: string,
  req: GenerateChapterRequest,
): Promise<GenerateChapterResponse> {
  const res = await fetch(`${API_URL}/api/chapters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(req),
  });
  const json = await res.json();
  if (!res.ok)
    throw new ApiError(res.status, json.error ?? "エラーが発生しました");
  return json as GenerateChapterResponse;
}
