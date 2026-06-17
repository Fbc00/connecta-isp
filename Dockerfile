# Build único (client + API) via Vite/Nitro → .output; runtime Node com node:sqlite nativo

# --- build: instala deps e gera .output ---
FROM node:26.3.0-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime: só o .output e deps de produção não são necessárias (bundle self-contained) ---
FROM node:26.3.0-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
# node:sqlite é nativo do runtime; o banco fica em /app/.data (monte um volume)
CMD ["node", ".output/server/index.mjs"]
