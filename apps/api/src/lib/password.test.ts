import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("パスワードのハッシュ", () => {
  it("同じパスワードなら通り、違えば通らない", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword({ hash, password: "correct horse" })).toBe(
      true,
    );
    expect(await verifyPassword({ hash, password: "wrong horse" })).toBe(false);
  });

  it("同じパスワードでも毎回違うハッシュになる", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("形式が違うハッシュは通さない", async () => {
    expect(await verifyPassword({ hash: "scrypt:abc", password: "x" })).toBe(
      false,
    );
  });
});
