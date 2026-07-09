import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import { listAudit, logAudit } from "../audit/audit";
import { getPlatformAnalytics } from "./analytics";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));

beforeAll(async () => {
  await initSchema(db);
  await db.sql`INSERT INTO companies (id, name, status) VALUES (1, 'A', 'active')`;
  await db.sql`INSERT INTO companies (id, name, status) VALUES (2, 'B', 'inactive')`;
  await db.sql`INSERT INTO users (company_id, name, email, password_hash) VALUES (1, 'U', 'u@x.com', 'h')`;
  await db.sql`INSERT INTO customers (company_id, name, email) VALUES (1, 'C', 'c@x.com')`;
  await db.sql`INSERT INTO messages (company_id, customer_id, status) VALUES (1, 1, 'sent')`;
  await db.sql`INSERT INTO nps_responses (company_id, customer_id, score) VALUES (1, 1, 9)`;
});
afterAll(() => db.dispose());

describe("platform analytics", () => {
  it("agrega totais da plataforma", async () => {
    const a = await getPlatformAnalytics(db);
    expect(a.companies).toBe(2);
    expect(a.active_companies).toBe(1);
    expect(a.users).toBe(1);
    expect(a.contacts).toBe(1);
    expect(a.messages).toBe(1);
    expect(a.responses).toBe(1);
  });
});

describe("audit log", () => {
  it("grava e lista eventos (mais recente primeiro)", async () => {
    await logAudit(db, { action: "a.one", companyId: 1, detail: "x" });
    await logAudit(db, { action: "a.two", companyId: 1, detail: "y" });
    const all = await listAudit(db, null);
    expect(all[0].action).toBe("a.two");
    const scoped = await listAudit(db, 1);
    expect(scoped.length).toBeGreaterThanOrEqual(2);
  });
});
