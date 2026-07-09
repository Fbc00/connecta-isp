# Connecta ISP — Fases 1-5 — Design

**Data:** 2026-07-02
**Base:** roadmap `2026-06-17-connecta-isp-roadmap-design.pdf`. Fase 0 (auth + multi-tenancy) já entregue.
**Stack:** Nitro (Node) + React/Vite (SPA) + SQLite (`node:sqlite` via `db0`) + Chakra UI v3 + react-router.

## Princípio guia

Estender as convenções da Fase 0, **não reescrever**. Serviços mantêm a assinatura
`(db, companyId, ...)` → o isolamento por tenant continua válido. `super_admin` escapa do filtro.

## Decisões (confirmadas)

- **Schema fork:** construir sobre o código existente (mantém `customers`, papéis `owner/admin/member`);
  adicionar `super_admin` como papel de topo + `status` em `companies`; estender NPS com surveys/invites.
- **Escopo:** todas as fases 1-5.
- **Providers (Fase 3):** apenas `MockProvider`; adapters reais (Resend/SendGrid/Twilio) ficam como stubs plugáveis via env.
- **Testes FE:** harness leve (jsdom + testing-library) se instalável; caso contrário, testes só no servidor.
- **Nav:** shell com sidebar.

## Cross-cutting

- **Papéis:** `ROLES = ["member","admin","owner","super_admin"]`. `hasRole`/`roleRank` inalterados.
  `requireRole(event, "super_admin")` protege endpoints de admin.
- **`users.company_id` nullable** (super_admin não tem empresa). `migrateSchema()` roda dentro de
  `initSchema`: detecta `NOT NULL` antigo via `PRAGMA table_info` e reconstrói a tabela uma vez;
  `ALTER TABLE ADD COLUMN` para colunas novas. Idempotente.
- **Seed** na subida: cria 1 `super_admin` (env `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD`, default dev)
  se nenhum existir; em dev, empresa demo + contatos.
- **Front shell:** `App.tsx` com rotas aninhadas sob `Root`. `RoleRoute` (estende `ProtectedRoute`).
  Página **Register** finalmente conectada. Sidebar com links por papel. Estética preservada
  (`#059669` accent, `#1A1A1E` ink, cards rounded-xl, animação `fadeUp`).

## Fase 1 — Painel Admin (super_admin)

- Schema: `companies + status` ('active'/'inactive').
- `services/admin/companies.ts`: `listCompanies` (com contagem de contatos/usuários), `createCompany`
  (empresa + usuário owner inicial), `setCompanyStatus`.
- API `api/admin/companies/`: `index.get`, `index.post`, `[id].patch` — guard super_admin.
- Login bloqueado para usuário de empresa `inactive`.
- Front: `pages/admin/Companies.tsx` (lista + toggle status + form criar empresa), `adminApi.ts`.
- **Entregável:** super-admin cadastra empresa e seu admin.

## Fase 2 — Dashboard Empresa + CRM

- `customers + tags` (texto, csv). Import em massa (`api/crm/import.post`, aceita array; CSV parseado no client).
- `api/dashboard/summary.get`: contadores (contatos, campanhas enviadas, NPS).
- Front: `pages/Contacts.tsx` (CRUD + tags + import), contadores reais no `Home.tsx`.
- **Entregável:** empresa gerencia sua base de contatos.

## Fase 3 — Disparo Email/SMS

- Schema: `templates(id,company_id,channel,subject,body,created_at)`,
  `messages(id,company_id,customer_id,channel,status,provider_id,subject,body,sent_at,created_at)`.
- `services/messaging/provider.ts`: interface `MessageProvider` + `MockProvider` (grava `messages`).
  `getProvider(channel)` env-gated; Resend/SendGrid/Twilio = stubs.
- `templates.ts` CRUD; `campaigns.ts` dispatch (contatos + template → envia → linhas rastreadas, síncrono).
- API: `api/templates/`, `api/messages/index.get`, `api/campaigns/index.post`.
- Front: página Templates, compositor de Campanha, lista de Mensagens com status.
- **Entregável:** empresa dispara email/SMS para contatos.

## Fase 4 — NPS

- Schema: `nps_surveys(id,company_id,title,question,status,created_at)`,
  `nps_invites(id,company_id,survey_id,customer_id,token,channel,status,sent_at,created_at)`;
  `nps_responses + survey_id, invite_id`.
- `services/nps`: surveys CRUD, invites (gera token único + envia via Fase 3),
  **resposta pública por token (sem auth)**, scoring por survey (`NPS = %prom − %detr`).
- API: `api/nps/surveys/` CRUD, `.../[id]/invites.post`, público `api/nps/public/[token]` get+post (sem auth).
- Front: página Surveys (CRUD + enviar + gráfico de score com barras CSS, sem nova dep),
  rota pública `/nps/:token` (sem auth).
- **Entregável:** ciclo NPS completo (criar → enviar → coletar → medir).

## Fase 5 — Polish & Deploy

- `audit_log(id, user_id, company_id, action, detail, created_at)` + `logAudit()`; registra
  login / criação de empresa / dispatch.
- **Rate limiter** em memória no login/register (por IP).
- Seed de dados demo (dev). Página **analytics** do super_admin (totais da plataforma). Revisão Docker.

## Testes

- Servidor: vitest por serviço (sqlite in-memory, padrão existente) — isolamento por tenant, RBAC,
  scoring NPS, MockProvider, campanhas, rate limiter, migrações.
- Front (se harness): `api.ts` + 1 página; lógica de negócio mantida fina (testada no servidor).

## Dependências entre fases

`Fase 1 → Fase 2 → Fase 3 → Fase 4`. Fase 4 depende de Fase 2 (contatos) e Fase 3 (disparo).
Fase 5 transversal.
