import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import { authenticate } from "../auth/auth";
import { createCompany, listCompanies, setCompanyStatus } from "./companies";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));

beforeAll(() => initSchema(db));
afterAll(() => db.dispose());
beforeEach(async () => {
  await db.sql`DELETE FROM users`;
  await db.sql`DELETE FROM customers`;
  await db.sql`DELETE FROM companies`;
});

const input = {
  name: "Acme ISP",
  adminName: "Alice",
  adminEmail: "alice@acme.com",
  adminPassword: "supersecret",
};

describe("admin/companies", () => {
  it("cria empresa + usuário owner", async () => {
    const { company, adminEmail } = await createCompany(db, input);
    expect(company.id).toBeGreaterThan(0);
    expect(company.status).toBe("active");
    expect(adminEmail).toBe("alice@acme.com");

    const owner = await authenticate(db, adminEmail, input.adminPassword);
    expect(owner.role).toBe("owner");
    expect(owner.company_id).toBe(company.id);
  });

  it("lista empresas com contagens", async () => {
    const { company } = await createCompany(db, input);
    await db.sql`INSERT INTO customers (company_id, name, email) VALUES (${company.id}, 'C', 'c@x.com')`;

    const list = await listCompanies(db);
    expect(list).toHaveLength(1);
    expect(list[0].users_count).toBe(1);
    expect(list[0].contacts_count).toBe(1);
  });

  it("rejeita e-mail de admin duplicado", async () => {
    await createCompany(db, input);
    await expect(createCompany(db, input)).rejects.toThrowError(/já cadastrado/i);
  });

  it("valida entradas", async () => {
    await expect(
      createCompany(db, { ...input, adminPassword: "123" }),
    ).rejects.toThrowError(/senha/i);
    await expect(
      createCompany(db, { ...input, adminEmail: "nope" }),
    ).rejects.toThrowError(/e-mail/i);
    await expect(createCompany(db, { ...input, name: "" })).rejects.toThrowError(
      /empresa/i,
    );
  });

  it("ativa e desativa empresa", async () => {
    const { company } = await createCompany(db, input);
    const off = await setCompanyStatus(db, company.id, "inactive");
    expect(off.status).toBe("inactive");
    const on = await setCompanyStatus(db, company.id, "active");
    expect(on.status).toBe("active");
    await expect(setCompanyStatus(db, company.id, "bogus")).rejects.toThrowError(
      /inválido/i,
    );
    await expect(setCompanyStatus(db, 9999, "active")).rejects.toThrowError(
      /não encontrada/i,
    );
  });
});
