import { defineConfig } from "nitro/config";

// Opções do servidor Nitro. Rotas em server/ (padrão); o client (Vite) e o
// fallback SPA (index.html) são servidos automaticamente pelo plugin nitro/vite.
export default defineConfig({
  compatibilityDate: "2026-06-17",
  // habilita o scan de handlers em server/ (api/, routes/, plugins/) — default é false
  serverDir: "./server",
  // camada de banco nativa do Nitro (db0) — connector node:sqlite (Node nativo)
  experimental: { database: true },
  database: {
    default: {
      // path resolvido em runtime relativo ao cwd; em Docker monte o volume em /app/.data
      connector: "node-sqlite",
      options: { path: "./.data/data.sqlite" },
    },
  },
});
