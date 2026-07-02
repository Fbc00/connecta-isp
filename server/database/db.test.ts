import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateSchema } from "./db";

// Simula o schema ANTIGO (Fase 0) e valida que migrateSchema atualiza sem perder dados.
const db = createDatabase(nodeSqlite({ name: ":memory:" }));

beforeAll(async () => {
  await db.exec("PRAGMA foreign_keys=ON");
  await db.sql`
    CREATE TABLE companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`;
  await db.sql`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`;
  await db.sql`
    CREATE TABLE sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`;
  await db.sql`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`;
  await db.sql`
    CREATE TABLE nps_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      score INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`;

  await db.sql`INSERT INTO companies (id, name) VALUES (1, 'Acme')`;
  await db.sql`INSERT INTO users (id, company_id, name, email, password_hash) VALUES (1, 1, 'Alice', 'a@x.com', 'h')`;
  await db.sql`INSERT INTO sessions (token, user_id, expires_at) VALUES ('tok', 1, '2099-01-01')`;
});
afterAll(() => db.dispose());

describe("migrateSchema (schema antigo -> novo)", () => {
  it("adiciona colunas e torna users.company_id nullable sem perder dados", async () => {
    await migrateSchema(db);

    // colunas novas presentes
    const cCols = await db.sql`SELECT name FROM pragma_table_info('companies')`;
    expect((cCols.rows as { name: string }[]).some((r) => r.name === "status")).toBe(
      true,
    );
    const ctCols = await db.sql`SELECT name FROM pragma_table_info('customers')`;
    expect((ctCols.rows as { name: string }[]).some((r) => r.name === "tags")).toBe(true);

    // dados preservados
    const users = await db.sql`SELECT id, email FROM users`;
    expect((users.rows as { email: string }[])[0].email).toBe("a@x.com");
    const sess = await db.sql`SELECT user_id FROM sessions WHERE token = 'tok'`;
    expect((sess.rows as unknown[]).length).toBe(1);

    // super_admin sem empresa agora é possível
    await db.sql`INSERT INTO users (company_id, name, email, password_hash, role) VALUES (NULL, 'Root', 'root@x.com', 'h', 'super_admin')`;
    const sa = await db.sql`SELECT company_id FROM users WHERE role = 'super_admin'`;
    expect((sa.rows as { company_id: number | null }[])[0].company_id).toBeNull();
  });

  it("é idempotente (rodar de novo não quebra)", async () => {
    await migrateSchema(db);
    const users = await db.sql`SELECT COUNT(*) AS n FROM users`;
    expect(Number((users.rows as { n: number }[])[0].n)).toBe(2);
  });
});
