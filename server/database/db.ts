import type { Database } from "db0";

export async function initSchema(db: Database): Promise<void> {
  await db.sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      completed  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      phone      TEXT,
      plan       TEXT    NOT NULL DEFAULT 'basic',
      status     TEXT    NOT NULL DEFAULT 'active',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;

  await db.sql`
    CREATE TABLE IF NOT EXISTS nps_responses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      score       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
      comment     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;
}