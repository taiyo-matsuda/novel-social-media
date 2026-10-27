import { describe, expect, it } from "vitest";

import {
  authErrorMessage,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from "./index";

describe("メールアドレス", () => {
  it("前後の空白を除き小文字にそろえる", () => {
    expect(normalizeEmail("  Taro@Example.COM ")).toBe("taro@example.com");
  });

  it("形式が正しいものだけ通す", () => {
    expect(isValidEmail("taro@example.com")).toBe(true);
    expect(isValidEmail(" taro@example.com ")).toBe(true);
    expect(isValidEmail("taro@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("パスワード", () => {
  it("8文字以上128文字以下だけ通す", () => {
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("a".repeat(128))).toBe(true);
    expect(isValidPassword("a".repeat(129))).toBe(false);
  });
});

describe("authErrorMessage", () => {
  it("よくあるエラーを日本語にする", () => {
    expect(authErrorMessage({ code: "USER_ALREADY_EXISTS" })).toContain(
      "すでに登録",
    );
    expect(
      authErrorMessage({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }),
    ).toContain("すでに登録");
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toContain(
      "違います",
    );
    expect(authErrorMessage({ status: 429 })).toContain("時間をおいて");
  });

  it("知らないエラーは汎用の案内にする", () => {
    expect(authErrorMessage({})).toContain("もう一度");
  });
});
