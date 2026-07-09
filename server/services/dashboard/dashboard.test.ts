import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import { getDashboardSummary } from "./dashboard";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));
const CO = 1;

beforeAll(async () => {
  await initSchema(db);
  await db.sql`INSERT INTO companies (id, name) VALUES (${CO}, 'Acme')`;
});
afterAll(() => db.dispose());
beforeEach(async () => {
  await db.sql`DELETE FROM messages`;
  await db.sql`DELETE FROM nps_responses`;
  await db.sql`DELETE FROM nps_surveys`;
  await db.sql`DELETE FROM customers`;
});

describe("dashboard summary", () => {
  it("conta contatos, mensagens enviadas, surveys e NPS", async () => {
    await db.sql`INSERT INTO customers (id, company_id, name, email) VALUES (1, ${CO}, 'A', 'a@x.com')`;
    await db.sql`INSERT INTO customers (id, company_id, name, email) VALUES (2, ${CO}, 'B', 'b@x.com')`;
    await db.sql`INSERT INTO messages (company_id, customer_id, status) VALUES (${CO}, 1, 'sent')`;
    await db.sql`INSERT INTO messages (company_id, customer_id, status) VALUES (${CO}, 1, 'failed')`;
    await db.sql`INSERT INTO nps_surveys (company_id, title) VALUES (${CO}, 'Q3')`;
    await db.sql`INSERT INTO nps_responses (company_id, customer_id, score) VALUES (${CO}, 1, 10)`;
    await db.sql`INSERT INTO nps_responses (company_id, customer_id, score) VALUES (${CO}, 2, 0)`;

    const s = await getDashboardSummary(db, CO);
    expect(s.contacts).toBe(2);
    expect(s.messages_sent).toBe(1);
    expect(s.surveys).toBe(1);
    expect(s.nps).toBe(0); // 1 promotor - 1 detrator = 0%
  });

  it("zera quando não há dados", async () => {
    const s = await getDashboardSummary(db, CO);
    expect(s).toEqual({ contacts: 0, messages_sent: 0, surveys: 0, nps: 0 });
  });
});
