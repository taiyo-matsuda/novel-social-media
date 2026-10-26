import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // テストで本物のAPIを叩かないように、キーを空にしておく
    env: { ANTHROPIC_API_KEY: "" },
  },
});
