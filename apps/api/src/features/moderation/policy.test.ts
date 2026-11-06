import { describe, expect, it } from "vitest";

import { opsMessage, shouldAutoHide, shouldSuspend } from "./policy";

describe("shouldAutoHide", () => {
  it("権利侵害の通報は1件で隠す", () => {
    expect(shouldAutoHide({ rights: 1, total: 1 })).toBe(true);
  });

  it("それ以外の通報は3件たまったら隠す", () => {
    expect(shouldAutoHide({ rights: 0, total: 2 })).toBe(false);
    expect(shouldAutoHide({ rights: 0, total: 3 })).toBe(true);
  });

  it("通報がなければ隠さない", () => {
    expect(shouldAutoHide({ rights: 0, total: 0 })).toBe(false);
  });
});

describe("shouldSuspend", () => {
  it("取り下げが3回になったら止める", () => {
    expect(shouldSuspend(2)).toBe(false);
    expect(shouldSuspend(3)).toBe(true);
    expect(shouldSuspend(4)).toBe(true);
  });
});

describe("opsMessage", () => {
  const adminUrl = "https://api.example.com/admin";

  it("権利侵害の通報は目立たせ、自動で隠したことと管理画面を載せる", () => {
    const text = opsMessage(
      {
        kind: "report",
        workId: "w1",
        title: "古書店の少女",
        reason: "rights",
        detail: "私の小説の書き写しです",
        autoHidden: true,
      },
      adminUrl,
    );
    expect(text).toBe(
      [
        "【権利侵害】通報：『古書店の少女』（理由：権利侵害）",
        "補足：私の小説の書き写しです",
        "→ 確認まで自動で非表示にしました",
        "作品ID：w1",
        "管理画面：https://api.example.com/admin",
      ].join("\n"),
    );
  });

  it("ほかの理由の通報には印を付けず、長い補足は切る", () => {
    const text = opsMessage(
      {
        kind: "report",
        workId: "w1",
        title: "古書店の少女",
        reason: "spam",
        detail: "あ".repeat(300),
        autoHidden: false,
      },
      adminUrl,
    );
    expect(text.startsWith("通報：『古書店の少女』（理由：スパム）")).toBe(
      true,
    );
    expect(text).toContain(`補足：${"あ".repeat(200)}…`);
    expect(text).not.toContain("非表示");
  });

  it("異議・権利者の申し立て・停止も知らせる", () => {
    expect(
      opsMessage({ kind: "appeal", workId: "w1", title: "T" }, adminUrl),
    ).toContain("異議");
    expect(
      opsMessage({ kind: "rights_claim", target: "『T』" }, adminUrl),
    ).toContain("【権利侵害】Web から申し立て");
    expect(
      opsMessage({ kind: "suspended", userId: "u1", strikes: 3 }, adminUrl),
    ).toContain("取り下げが3回");
  });
});
