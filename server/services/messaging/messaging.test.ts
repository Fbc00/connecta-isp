import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import type { Customer } from "../crm/customers";
import { dispatchCampaign, listMessages, renderTemplate } from "./campaigns";
import { getProvider, MockProvider } from "./provider";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from "./templates";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));
const CO = 1;
const OTHER = 2;

beforeAll(async () => {
  await initSchema(db);
  await db.sql`INSERT INTO companies (id, name) VALUES (${CO}, 'Acme')`;
  await db.sql`INSERT INTO companies (id, name) VALUES (${OTHER}, 'Globex')`;
});
afterAll(() => db.dispose());
beforeEach(async () => {
  await db.sql`DELETE FROM messages`;
  await db.sql`DELETE FROM templates`;
  await db.sql`DELETE FROM customers`;
});

describe("MockProvider", () => {
  it("marca como enviado quando há destino", async () => {
    const r = await MockProvider.send({
      to: "x@x.com",
      channel: "email",
      subject: "s",
      body: "b",
    });
    expect(r.status).toBe("sent");
    expect(r.providerId).toMatch(/^mock-/);
  });

  it("falha sem destino", async () => {
    const r = await MockProvider.send({ to: "", channel: "sms", subject: "", body: "b" });
    expect(r.status).toBe("failed");
  });

  it("getProvider default é o mock", () => {
    expect(getProvider("email").name).toBe("mock");
  });
});

describe("renderTemplate", () => {
  it("substitui placeholders pelo contato", () => {
    const c = { name: "João", email: "joao@x.com" } as Customer;
    expect(renderTemplate("Oi {{name}} ({{email}})", c)).toBe("Oi João (joao@x.com)");
  });
});

describe("templates", () => {
  it("faz CRUD e isola por empresa", async () => {
    const t = await createTemplate(db, CO, { channel: "email", subject: "S", body: "B" });
    expect(t.channel).toBe("email");
    expect(await listTemplates(db, CO)).toHaveLength(1);
    expect(await listTemplates(db, OTHER)).toHaveLength(0);

    const up = await updateTemplate(db, CO, t.id, { subject: "S2" });
    expect(up.subject).toBe("S2");

    await expect(updateTemplate(db, OTHER, t.id, {})).rejects.toThrowError(
      /não encontrado/i,
    );
    await deleteTemplate(db, CO, t.id);
    expect(await listTemplates(db, CO)).toHaveLength(0);
  });

  it("exige corpo", async () => {
    await expect(createTemplate(db, CO, { body: "" })).rejects.toThrowError(/corpo/i);
  });
});

describe("dispatchCampaign", () => {
  it("envia para contatos e grava mensagens", async () => {
    const a =
      await db.sql`INSERT INTO customers (company_id, name, email) VALUES (${CO}, 'A', 'a@x.com')`;
    const b =
      await db.sql`INSERT INTO customers (company_id, name, email) VALUES (${CO}, 'B', 'b@x.com')`;
    const t = await createTemplate(db, CO, {
      channel: "email",
      subject: "Oi {{name}}",
      body: "corpo",
    });

    const res = await dispatchCampaign(db, CO, {
      templateId: t.id,
      customerIds: [Number(a.lastInsertRowid), Number(b.lastInsertRowid)],
    });
    expect(res).toEqual({ sent: 2, failed: 0, total: 2 });

    const msgs = await listMessages(db, CO);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].status).toBe("sent");
    expect(msgs.some((m) => m.subject === "Oi A")).toBe(true);
  });

  it("conta falha para contato inexistente", async () => {
    const t = await createTemplate(db, CO, { body: "x" });
    const res = await dispatchCampaign(db, CO, { templateId: t.id, customerIds: [9999] });
    expect(res.failed).toBe(1);
    expect(res.sent).toBe(0);
  });

  it("rejeita sem contatos ou template inválido", async () => {
    const t = await createTemplate(db, CO, { body: "x" });
    await expect(
      dispatchCampaign(db, CO, { templateId: t.id, customerIds: [] }),
    ).rejects.toThrowError(/contato/i);
    await expect(
      dispatchCampaign(db, CO, { templateId: 0, customerIds: [1] }),
    ).rejects.toThrowError(/template/i);
  });
});
