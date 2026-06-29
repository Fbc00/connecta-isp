import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import { createResponse, getNpsSummary, listResponses } from "./nps";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));
const CO = 1;
const OTHER = 2;
let custCO = 0;
let custOTHER = 0;

beforeAll(async () => {
  await initSchema(db);
  await db.sql`INSERT INTO companies (id, name) VALUES (${CO}, 'Acme')`;
  await db.sql`INSERT INTO companies (id, name) VALUES (${OTHER}, 'Globex')`;
  const a =
    await db.sql`INSERT INTO customers (company_id, name, email) VALUES (${CO}, 'A', 'a@x.com')`;
  const b =
    await db.sql`INSERT INTO customers (company_id, name, email) VALUES (${OTHER}, 'B', 'b@x.com')`;
  custCO = Number(a.lastInsertRowid);
  custOTHER = Number(b.lastInsertRowid);
});
afterAll(() => db.dispose());
beforeEach(() => db.sql`DELETE FROM nps_responses`);

describe("nps", () => {
  it("rejeita resposta p/ cliente de outra empresa", async () => {
    await expect(
      createResponse(db, CO, { customer_id: custOTHER, score: 10 }),
    ).rejects.toThrowError(/não encontrado/i);
  });

  it("calcula NPS escopado por empresa", async () => {
    await createResponse(db, CO, { customer_id: custCO, score: 10 }); // promotor
    await createResponse(db, CO, { customer_id: custCO, score: 3 }); // detrator
    await createResponse(db, OTHER, { customer_id: custOTHER, score: 9 }); // outra empresa

    expect(await listResponses(db, CO)).toHaveLength(2);
    const sum = await getNpsSummary(db, CO);
    expect(sum.promoters).toBe(1);
    expect(sum.detractors).toBe(1);
    expect(sum.nps).toBe(0); // (1-1)/2 * 100

    // empresa OTHER isolada
    expect(await listResponses(db, OTHER)).toHaveLength(1);
    expect((await getNpsSummary(db, OTHER)).nps).toBe(100);
  });
});
