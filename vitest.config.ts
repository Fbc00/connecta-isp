import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // usa SQLite em memória durante os testes
    env: { DB_PATH: ":memory:" },
    include: ["server/**/*.test.ts"],
  },
});
