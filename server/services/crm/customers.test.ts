import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "./customers";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));
const CO = 1;
const OTHER = 2;

beforeAll(async () => {
  await initSchema(db);
  await db.sql`INSERT INTO companies (id, name) VALUES (${CO}, 'Acme')`;
  await db.sql`INSERT INTO companies (id, name) VALUES (${OTHER}, 'Globex')`;
});
afterAll(() => db.dispose());
beforeEach(() => db.sql`DELETE FROM customers`);

describe("customers", () => {
  it("cria e lista cliente da empresa", async () => {
    const c = await createCustomer(db, CO, { name: "João", email: "joao@x.com" });
    expect(c.company_id).toBe(CO);
    expect(await listCustomers(db, CO)).toHaveLength(1);
  });

  it("permite o mesmo e-mail em empresas diferentes", async () => {
    await createCustomer(db, CO, { name: "A", email: "dup@x.com" });
    const b = await createCustomer(db, OTHER, { name: "B", email: "dup@x.com" });
    expect(b.id).toBeGreaterThan(0);
  });

  it("isola clientes por empresa", async () => {
    const mine = await createCustomer(db, CO, { name: "Meu", email: "meu@x.com" });
    await createCustomer(db, OTHER, { name: "Outro", email: "outro@x.com" });

    expect(await listCustomers(db, CO)).toHaveLength(1);
    expect(await listCustomers(db, OTHER)).toHaveLength(1);

    // não dá pra atualizar/remover cliente de outra empresa
    await expect(
      updateCustomer(db, OTHER, mine.id, { name: "hack" }),
    ).rejects.toThrowError(/não encontrado/i);
    await expect(deleteCustomer(db, OTHER, mine.id)).rejects.toThrowError(
      /não encontrado/i,
    );
  });
});
