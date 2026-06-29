import type { Database } from "db0";

export async function initSchema(db: Database): Promise<void> {
  // empresas (tenants) — raiz do isolamento multi-tenant
  await db.sql`
    CREATE TABLE IF NOT EXISTS companies (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  // usuários — sempre pertencem a uma empresa; role para RBAC
  await db.sql`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id    INTEGER NOT NULL REFERENCES companies(id),
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'member',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  // sessões — token de cookie httpOnly -> usuário, com expiração
  await db.sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT    PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      expires_at TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  // clientes (CRM) — escopados por empresa; e-mail único dentro da empresa
  await db.sql`
    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL,
      phone      TEXT,
      plan       TEXT    NOT NULL DEFAULT 'basic',
      status     TEXT    NOT NULL DEFAULT 'active',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (company_id, email)
    )
  `;

  // respostas de NPS — escopadas por empresa; cliente pertence à mesma empresa
  await db.sql`
    CREATE TABLE IF NOT EXISTS nps_responses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id  INTEGER NOT NULL REFERENCES companies(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      score       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
      comment     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;
}
