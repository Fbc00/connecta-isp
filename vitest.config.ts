import { defineConfig } from "vitest/config";

// config própria de teste — não carrega o plugin nitro (evita o servidor pendurado)
export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
  },
});
