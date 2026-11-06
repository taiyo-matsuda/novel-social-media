import { describe, expect, it } from "vitest";

import { isAdminAuthorized } from "./admin-token";

describe("isAdminAuthorized", () => {
  it("Bearer の合言葉が一致すれば通す", () => {
    expect(isAdminAuthorized("Bearer s3cret-token", "s3cret-token")).toBe(true);
  });

  it("違う・長さが違う・形式が違う合言葉は通さない", () => {
    expect(isAdminAuthorized("Bearer s3cret-tokeN", "s3cret-token")).toBe(
      false,
    );
    expect(isAdminAuthorized("Bearer s3cret", "s3cret-token")).toBe(false);
    expect(isAdminAuthorized("Bearer s3cret-token-x", "s3cret-token")).toBe(
      false,
    );
    expect(isAdminAuthorized("s3cret-token", "s3cret-token")).toBe(false);
    expect(isAdminAuthorized(undefined, "s3cret-token")).toBe(false);
  });

  it("合言葉が設定されていなければ誰も通さない", () => {
    expect(isAdminAuthorized("Bearer ", "")).toBe(false);
    expect(isAdminAuthorized("Bearer x", undefined)).toBe(false);
  });
});
