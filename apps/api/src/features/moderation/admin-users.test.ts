import { describe, expect, it } from "vitest";

import { adminUserIdsOf, isAdminUser } from "./admin-users";

describe("adminUserIdsOf", () => {
  it("カンマ区切りの利用者IDを、空白と空の項目を除いて配列にする", () => {
    expect(adminUserIdsOf({ ADMIN_USER_IDS: " u1, u2 ,," })).toEqual([
      "u1",
      "u2",
    ]);
    expect(adminUserIdsOf({})).toEqual([]);
  });
});

describe("isAdminUser", () => {
  it("一覧にある利用者IDだけを運営とみなす", () => {
    const env = { ADMIN_USER_IDS: "u1,u2" };
    expect(isAdminUser("u1", env)).toBe(true);
    expect(isAdminUser("u3", env)).toBe(false);
    // 一部だけ一致するIDは通さない
    expect(isAdminUser("u", env)).toBe(false);
  });

  it("設定されていなければ誰も運営ではない", () => {
    expect(isAdminUser("u1", { ADMIN_USER_IDS: "" })).toBe(false);
    expect(isAdminUser("", {})).toBe(false);
  });
});
