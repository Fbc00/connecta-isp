import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Nitro como plugin do Vite: build único (client + API) e SPA servida pelo Nitro.
// Opções do servidor (db, etc.) ficam em nitro.config.ts.
export default defineConfig({
  plugins: [react(), nitro()],
});
