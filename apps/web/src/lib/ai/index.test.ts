import { describe, expect, it } from "vitest";

import { FakeNovelGenerator } from "@novel/core/ai";
import { createNovelGenerator } from "./index";

describe("createNovelGenerator", () => {
  it("APIキーがないときはフェイクを使う", () => {
    expect(createNovelGenerator()).toBeInstanceOf(FakeNovelGenerator);
  });
});
