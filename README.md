# Connecta ISP

Monolito web acadêmico: **React + Vite (TypeScript)** no front, **Express (TypeScript)** no back, persistência em **SQLite**. Roda sobre o **Bun** (runtime + gerenciador de pacotes + test runner); o SQLite usa o driver nativo `bun:sqlite` (sem dependências).

O repositório é um **workspace Bun**: a raiz só orquestra (build, testes, lint); `client/` e `server/` têm suas próprias dependências.

## Requisitos

- [Bun](https://bun.sh) ≥ 1.2 — para desenvolvimento
- [Docker](https://docs.docker.com/) + Compose — para rodar em produção

## Como funciona

- **Runtime:** o backend é executado direto pelo Bun (`bun server/index.ts`), que roda TypeScript nativamente — sem passo de build no back. Em dev, `bun --watch` faz o hot reload.
- **Desenvolvimento:** Vite (porta `5173`) e Express (porta `3000`) rodam separados. O Vite faz proxy de `/api` → Express, mantendo o hot reload do front.
- **Produção (Docker):** o **nginx** serve o build do React e faz proxy de `/api` → o container do **server** (Express, API pura). O SQLite fica num volume persistente. Sobe tudo em `http://localhost:8080`.

## Desenvolvimento

```bash
bun install      # instala todo o workspace (raiz + client + server)
bun run dev      # Express + Vite em paralelo (hot reload)
bun run build    # build do React em client/dist
bun test         # testes (bun test, SQLite em memória)
```

Em dev, acesse **<http://localhost:5173>**.

## Qualidade (Biome)

```bash
bun run lint        # checa lint + formatação
bun run lint:fix    # corrige o que for automático
bun run format      # só formata
bun run typecheck   # checagem de tipos (server + client)
```

## Produção (Docker)

```bash
docker compose up --build    # nginx + server, acesse http://localhost:8080
```
