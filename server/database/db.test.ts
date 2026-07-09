import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initSchema, migrateSchema } from "./db";

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

describe("migração nps_questions", () => {
  it("cria pergunta a partir de survey legado e faz backfill das respostas", async () => {
    const db = createDatabase(nodeSqlite({ name: ":memory:" }));
    // Simula banco legado: survey com coluna question e uma resposta sem question_id.
    await db.sql`CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT)`;
    await db.sql`INSERT INTO companies (id, name) VALUES (1, 'Acme')`;
    await db.sql`
      CREATE TABLE nps_surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER, title TEXT,
        question TEXT DEFAULT 'Pergunta legada?', status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')))`;
    await db.sql`INSERT INTO nps_surveys (company_id, title, question) VALUES (1, 'Legada', 'Pergunta legada?')`;
    await db.sql`
      CREATE TABLE nps_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER, customer_id INTEGER,
        survey_id INTEGER, invite_id INTEGER, score INTEGER, comment TEXT,
        created_at TEXT DEFAULT (datetime('now')))`;
    await db.sql`INSERT INTO nps_responses (company_id, customer_id, survey_id, score) VALUES (1, 1, 1, 9)`;

    await initSchema(db); // roda migrateSchema idempotente sobre as tabelas acima

    const q = await db.sql`SELECT * FROM nps_questions WHERE survey_id = 1`;
    const questions = q.rows as { id: number; text: string; position: number }[];
    expect(questions).toHaveLength(1);
    expect(questions[0].text).toBe("Pergunta legada?");
    expect(questions[0].position).toBe(0);

    const r = await db.sql`SELECT question_id FROM nps_responses WHERE survey_id = 1`;
    expect((r.rows as { question_id: number }[])[0].question_id).toBe(questions[0].id);

    // Idempotência: rodar de novo não duplica perguntas.
    await migrateSchema(db);
    const again =
      await db.sql`SELECT COUNT(*) AS n FROM nps_questions WHERE survey_id = 1`;
    expect(Number((again.rows as { n: number }[])[0].n)).toBe(1);
    db.dispose();
  });
});
