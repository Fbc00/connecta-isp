import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // SPA: renderização 100% no client, sem SSR (fallback para index.html)
  appType: "spa",
  server: {
    port: 5173,
    proxy: {
      // encaminha as chamadas /api para o Express, mantendo o hot reload
      "/api": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
