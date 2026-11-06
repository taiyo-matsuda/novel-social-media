import type { Env } from "../env";

/** 運営に文面を知らせる。失敗しても利用者の操作は止めない */
export type Notifier = (text: string) => Promise<void>;

/** Slack の Incoming Webhook に送る。OPS_WEBHOOK_URL が空なら何もしない */
export function createNotifier(env: Env): Notifier {
  const url = env.OPS_WEBHOOK_URL;
  if (!url) return async () => {};
  return async (text) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      // URL は秘密なのでログに出さない
      if (!res.ok) console.error(`運営への通知に失敗しました（${res.status}）`);
    } catch {
      console.error("運営への通知に失敗しました");
    }
  };
}
