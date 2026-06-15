# Backend: API Express rodando sobre o Bun (TypeScript executado direto)
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# distroless: imagem final mínima (sem shell); entrypoint já é "bun"
FROM oven/bun:1.2-distroless
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/data.sqlite

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server

# /data é criado pelo volume montado (compose) — guarda o SQLite
EXPOSE 3000
CMD ["server/index.ts"]
