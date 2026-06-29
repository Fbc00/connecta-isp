# Connecta ISP — Roadmap de Implementação

**Data:** 2026-06-17
**Status:** Aprovado (design de alto nível)
**Stack:** Nitro (Node) + React/Vite (SPA) + SQLite (`node:sqlite` via `db0`) + Chakra UI + react-router

---

## 1. Visão

Connecta ISP é um SaaS de CRM multi-tenant. Uma plataforma onde um
**super-admin** cadastra empresas (tenants), e cada empresa opera seu próprio
**dashboard** para gerenciar contatos, disparar campanhas de **email/SMS** e
rodar pesquisas de **NPS**.

## 2. Decisões de arquitetura

| Tema | Decisão | Justificativa |
|------|---------|---------------|
| Multi-tenancy | Único banco SQLite, coluna `company_id` em todas as tabelas de domínio + middleware que força o escopo | Casa com o monolito Nitro/db0 atual; simples e suficiente |
| Email/SMS | Interface `MessageProvider` com `MockProvider` no MVP; adapters reais (Resend/SendGrid, Twilio) plugáveis via env | Não bloqueia desenvolvimento; sem custo/chaves no início |
| Papéis | `super_admin` (plataforma) + `company_admin` / `member` (por empresa) | RBAC simples, cobre os casos de uso |
| Sessão | Cookie httpOnly + tabela `sessions`; hash de senha com `node:crypto` (scrypt) | Sem dependências nativas extras; alinhado ao "sem deps nativas" do projeto |

### Padrão de implementação (reutiliza a slice `tasks`)

Cada feature segue o padrão já existente no projeto:

- **Serviço:** `server/services/<dominio>/<dominio>.ts` + `<dominio>.test.ts`
- **API (file-based):** `server/api/<dominio>/index.get.ts`, `index.post.ts`, `[id].put.ts`, `[id].delete.ts`
- **Front:** página em `src/pages/`, componentes em `src/components/`, chamadas via `src/services/api.ts`
- **Schema:** expandir `server/database/db.ts` (`initSchema`), aplicado pelo plugin `server/plugins/database.ts` na subida

### Cross-cutting (vale para todas as fases)

- **Tenant guard:** middleware Nitro resolve `company_id` da sessão e injeta em
  `event.context`; todo serviço filtra por ele. `super_admin` escapa do filtro.
- **Auth utils:** `requireAuth` / `requireRole` em `server/utils/`.
- **Front:** `AuthContext` + `ProtectedRoute`; liga as páginas `Login`/`Register` já existentes.

## 3. Modelo de dados (núcleo)

```sql
companies(id, name, slug, status, created_at)
users(id, company_id NULL, email, password_hash, role, created_at)  -- super_admin: company_id NULL
sessions(id, user_id, token, expires_at)
contacts(id, company_id, name, email, phone, tags, created_at)       -- CRM
templates(id, company_id, channel, subject, body, created_at)
messages(id, company_id, contact_id, channel, status, provider_id, sent_at)
nps_surveys(id, company_id, title, question, status, created_at)
nps_invites(id, survey_id, contact_id, token, channel, sent_at)
nps_responses(id, invite_id, score, comment, created_at)
```

## 4. Fases

### Fase 0 — Fundação (auth + multi-tenancy) ⭐ MVP crítico

- Tabelas `companies`, `users`, `sessions`; migração de schema.
- Endpoints `auth/`: `register`, `login`, `logout`, `me`.
- Tenant guard + RBAC utils.
- Front: `AuthContext`, `ProtectedRoute`, ligar `Login`/`Register`.
- **Entregável:** login funciona; sessão isola dados por empresa.

### Fase 1 — Painel Admin (super-admin)

- CRUD `companies`; criar/desativar empresas.
- Criar `company_admin` inicial por empresa.
- Página admin: lista de empresas + status.
- **Entregável:** super-admin cadastra empresa e seu admin.

### Fase 2 — Dashboard Empresa + CRM

- CRUD `contacts` (escopo `company_id`) — preenche o diretório `crm/`.
- Import simples (CSV opcional); tags/segmentos.
- Dashboard home: contadores (contatos, campanhas, NPS).
- **Entregável:** empresa gerencia sua base de contatos.

### Fase 3 — Disparo Email/SMS

- `MessageProvider` interface; `MockProvider` grava em `messages`.
- CRUD `templates`; compositor de campanha (seleciona contatos + template).
- Dispatch + tracking de status; fila síncrona no MVP.
- Adapters reais (Resend/SendGrid, Twilio) plugáveis via env.
- **Entregável:** empresa dispara email/SMS para contatos.

### Fase 4 — NPS

- CRUD `nps_surveys` (pergunta + escala 0–10).
- Envio via Fase 3 (gera `nps_invites` com token único).
- Página pública de resposta (rota não-autenticada, tokenizada).
- Scoring: promotores/neutros/detratores, `NPS = %promotores − %detratores`; gráficos no dashboard.
- **Entregável:** ciclo NPS completo (criar → enviar → coletar → medir).

### Fase 5 — Polish & Deploy

- Analytics dashboard, audit log, rate limiting no auth, seed data.
- Revisar Docker/compose para produção.

## 5. Dependências entre fases

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4
```

- Fase 4 depende de Fase 2 (contatos) **e** Fase 3 (disparo).
- Fase 5 pode iniciar a qualquer momento após a Fase 3.

## 6. Fora de escopo (YAGNI por ora)

- RBAC granular por recurso.
- Banco por empresa / sharding.
- Filas assíncronas / workers dedicados (dispatch é síncrono no MVP).
- Billing/cobrança.
