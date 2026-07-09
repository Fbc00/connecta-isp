import type { Database } from "db0";

export async function initSchema(db: Database): Promise<void> {
  await db.sql`
    CREATE TABLE IF NOT EXISTS companies (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      status     TEXT    NOT NULL DEFAULT 'active',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  // company_id é NULL para super_admin (opera fora do escopo de empresa).
  await db.sql`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id    INTEGER REFERENCES companies(id),
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'member',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT    PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      expires_at TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL,
      phone      TEXT,
      plan       TEXT    NOT NULL DEFAULT 'basic',
      status     TEXT    NOT NULL DEFAULT 'active',
      tags       TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (company_id, email)
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      channel    TEXT    NOT NULL DEFAULT 'email',
      subject    TEXT    NOT NULL DEFAULT '',
      body       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id  INTEGER NOT NULL REFERENCES companies(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      channel     TEXT    NOT NULL DEFAULT 'email',
      status      TEXT    NOT NULL DEFAULT 'queued',
      provider_id TEXT,
      subject     TEXT,
      body        TEXT    NOT NULL DEFAULT '',
      sent_at     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS nps_surveys (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      title      TEXT    NOT NULL,
      question   TEXT    NOT NULL DEFAULT 'De 0 a 10, o quanto você recomendaria a gente?',
      status     TEXT    NOT NULL DEFAULT 'active',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS nps_questions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      survey_id  INTEGER NOT NULL REFERENCES nps_surveys(id),
      text       TEXT    NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS nps_invites (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id  INTEGER NOT NULL REFERENCES companies(id),
      survey_id   INTEGER NOT NULL REFERENCES nps_surveys(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      token       TEXT    NOT NULL UNIQUE,
      channel     TEXT    NOT NULL DEFAULT 'email',
      status      TEXT    NOT NULL DEFAULT 'sent',
      sent_at     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS nps_responses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id  INTEGER NOT NULL REFERENCES companies(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      survey_id   INTEGER REFERENCES nps_surveys(id),
      invite_id   INTEGER REFERENCES nps_invites(id),
      score       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
      comment     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id),
      company_id INTEGER REFERENCES companies(id),
      action     TEXT    NOT NULL,
      detail     TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await migrateSchema(db);
}

/**
 * Migrações idempotentes para bancos criados por versões anteriores do schema.
 * `CREATE TABLE IF NOT EXISTS` não altera tabelas já existentes, então aplicamos
 * as diferenças manualmente aqui.
 */
export async function migrateSchema(db: Database): Promise<void> {
  await addColumnIfMissing(db, "companies", "status", "TEXT NOT NULL DEFAULT 'active'");
  await addColumnIfMissing(db, "customers", "tags", "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, "nps_responses", "survey_id", "INTEGER");
  await addColumnIfMissing(db, "nps_responses", "invite_id", "INTEGER");
  await addColumnIfMissing(db, "nps_responses", "question_id", "INTEGER");
  await backfillNpsQuestions(db);

  // users.company_id nasceu NOT NULL (sem suporte a super_admin). Reconstrói a
  // tabela para torná-la nullable, uma única vez, seguindo o padrão seguro do
  // SQLite (FK desligada, cria nova, copia, troca) — evita quebrar a FK de
  // sessions durante o processo.
  const cols = await tableColumns(db, "users");
  const companyCol = cols.find((c) => c.name === "company_id");
  if (companyCol && companyCol.notnull === 1) {
    await db.exec("PRAGMA foreign_keys=OFF");
    try {
      await db.sql`
        CREATE TABLE users_new (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id    INTEGER REFERENCES companies(id),
          name          TEXT    NOT NULL,
          email         TEXT    NOT NULL UNIQUE,
          password_hash TEXT    NOT NULL,
          role          TEXT    NOT NULL DEFAULT 'member',
          created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        )
      `;
      await db.sql`
        INSERT INTO users_new (id, company_id, name, email, password_hash, role, created_at)
        SELECT id, company_id, name, email, password_hash, role, created_at FROM users
      `;
      await db.sql`DROP TABLE users`;
      await db.sql`ALTER TABLE users_new RENAME TO users`;
    } finally {
      await db.exec("PRAGMA foreign_keys=ON");
    }
  }
}

interface ColumnInfo {
  name: string;
  notnull: number;
}

async function tableColumns(db: Database, table: string): Promise<ColumnInfo[]> {
  const { rows } = await db.sql`SELECT name, "notnull" FROM pragma_table_info(${table})`;
  return rows as unknown as ColumnInfo[];
}

async function addColumnIfMissing(
  db: Database,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const cols = await tableColumns(db, table);
  if (cols.some((c) => c.name === column)) return;
  // Nomes de tabela/coluna são literais internos (não vêm de input do usuário).
  await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/**
 * Cria uma pergunta (position 0) a partir de nps_surveys.question para surveys
 * que ainda não têm perguntas, e aponta as respostas antigas para ela.
 * Idempotente: só age sobre surveys sem perguntas.
 */
async function backfillNpsQuestions(db: Database): Promise<void> {
  // Bancos muito antigos (pré-Fase NPS) não têm nps_surveys/nps_questions ainda.
  const surveyCols = await tableColumns(db, "nps_surveys");
  if (surveyCols.length === 0) return;

  const { rows } = await db.sql`
    SELECT s.id, s.company_id, s.question
    FROM nps_surveys s
    WHERE NOT EXISTS (SELECT 1 FROM nps_questions q WHERE q.survey_id = s.id)
  `;
  const surveys = rows as unknown as {
    id: number;
    company_id: number;
    question: string;
  }[];
  for (const s of surveys) {
    const { lastInsertRowid } = await db.sql`
      INSERT INTO nps_questions (company_id, survey_id, text, position)
      VALUES (${s.company_id}, ${s.id}, ${s.question}, 0)
    `;
    await db.sql`
      UPDATE nps_responses SET question_id = ${Number(lastInsertRowid)}
      WHERE survey_id = ${s.id} AND question_id IS NULL
    `;
  }
}
