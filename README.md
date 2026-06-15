# Connecta ISP

Monolito web acadêmico: **React + Vite (TypeScript)** no front, **Express (TypeScript)** no back, persistência em **SQLite** (better-sqlite3). Um único `package.json` na raiz orquestra tudo.

## Como funciona

- **Desenvolvimento:** Vite (porta `5173`) e Express (porta `3000`) rodam separados. O Vite faz proxy de `/api` → Express, mantendo o hot reload do front.
- **Produção:** o Express serve o build do React (`client/dist`) e responde a API sob `/api`. Rotas não-API caem no `index.html` (client-side routing). Uma porta só (`3000`).

## Estrutura

```
server/                     # backend Express, organizado por feature
├── index.ts                # sobe o servidor
├── app.ts                  # middlewares + montagem das rotas
├── config/db.ts            # conexão SQLite + criação da tabela
├── middlewares/            # errorHandler centralizado
└── modules/tasks/          # CRUD de exemplo (route → controller → service)

client/                     # frontend React, organizado por tipo
└── src/
    ├── pages/              # uma tela por arquivo
    ├── components/         # componentes reutilizáveis
    └── services/api.ts     # todas as chamadas à API centralizadas
```

Fluxo backend: **route → controller → service** (o service tem regra de negócio + acesso ao banco juntos).

## Comandos

```bash
npm install      # instala tudo (front + back)
npm run dev      # Express + Vite em paralelo (dev, hot reload)
npm run build    # build do React em client/dist
npm start        # produção: Express servindo o build (http://localhost:3000)
```

Em dev, acesse **http://localhost:5173**.

## Lint & Format (Biome)

```bash
npm run lint        # checa lint + formatação
npm run lint:fix    # corrige o que for automático
npm run format      # só formata
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) roda em todo push/PR na `main`:
`npm ci` → lint (Biome) → typecheck → testes (Vitest) → build.

## API — `tasks`

| Método | Rota             | Descrição          |
|--------|------------------|--------------------|
| GET    | `/api/tasks`     | lista as tarefas   |
| POST   | `/api/tasks`     | cria (`{ title }`) |
| PUT    | `/api/tasks/:id` | edita (`{ title?, completed? }`) |
| DELETE | `/api/tasks/:id` | remove             |
