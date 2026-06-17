# Connecta ISP

Monolito web acadêmico full-stack sobre **Nitro** (Node): o servidor Nitro expõe a **API** e serve o **client React + Vite (SPA)** — um único build, um único processo. Persistência em **SQLite** via o driver nativo `node:sqlite` (sem dependências nativas), usando a camada de banco do Nitro (`db0`).

`package.json` único na raiz; o client (`src/`, `index.html`) e o servidor (`server/`) convivem no mesmo projeto.

## Requisitos

- [Node](https://nodejs.org) **26.3.0** (ver `.nvmrc`) — `node:sqlite` requer Node ≥ 22.5
- [Docker](https://docs.docker.com/) + Compose — para rodar em produção

## Como funciona

- **Vite + plugin Nitro:** `vite.config.ts` carrega `nitro/vite`. O Vite cuida do client; o Nitro registra os handlers de `server/` e serve a SPA.
- **API:** handlers em `server/api/**` → rotas `/api/**` (file-based). Lógica de dados em `server/services/`.
- **Banco:** connector `node-sqlite` configurado em `nitro.config.ts` (`server/database/db.ts`); schema criado por um plugin Nitro na subida (`server/plugins/database.ts`).
- **SPA fallback:** o Nitro usa o `index.html` como template e o serve para qualquer rota não-API (client-side routing).
- **Dev:** um único `vite` serve client (HMR) + API na mesma porta (`3000`).
- **Produção:** `vite build` gera `.output/` (frontend + backend); roda com `node .output/server/index.mjs`.

## Desenvolvimento

```bash
npm install      # instala tudo (raiz única)
npm run dev      # client + API juntos em http://localhost:3000 (HMR)
npm run build    # build de produção → .output/
npm start        # roda o build de produção
npm test         # testes (Vitest, SQLite em memória)
```

## Qualidade (Biome)

```bash
npm run lint        # checa lint + formatação
npm run lint:fix    # corrige o que for automático
npm run format      # só formata
npm run typecheck   # checagem de tipos (server + client)
```

## Produção (Docker)

```bash
docker compose up --build    # acesse http://localhost:8080
```

O SQLite fica num volume persistente montado em `/app/.data`.
