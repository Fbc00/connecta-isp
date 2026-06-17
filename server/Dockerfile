# API Express rodando em Bun (build context = raiz do projeto)

# --- deps: instala só as dependências do server ---
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY server/package.json ./
RUN bun install --production

# --- runtime: imagem distroless com o Bun ---
FROM oven/bun:1.2-distroless
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/data.sqlite

COPY --from=deps /app/node_modules ./node_modules
COPY server/package.json ./package.json
COPY server ./server

EXPOSE 3000
# bun:sqlite é nativo do runtime, não precisa de build
CMD ["server/index.ts"]
