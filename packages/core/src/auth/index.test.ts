import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  isValidOtp,
  normalizeEmail,
  normalizeOtp,
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

describe("ワンタイムコード", () => {
  it("空白・ハイフン・全角数字を吸収する", () => {
    expect(normalizeOtp("123 456")).toBe("123456");
    expect(normalizeOtp("123-456")).toBe("123456");
    expect(normalizeOtp("１２３４５６")).toBe("123456");
  });

  it("6桁のときだけ通す", () => {
    expect(isValidOtp("123456")).toBe(true);
    expect(isValidOtp("12345")).toBe(false);
    expect(isValidOtp("1234567")).toBe(false);
  });
});
