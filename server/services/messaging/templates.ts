import type { Database } from "db0";
import { createError } from "h3";
import type { Channel } from "./provider";

export interface Template {
  id: number;
  company_id: number;
  channel: Channel;
  subject: string;
  body: string;
  created_at: string;
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const notFound = () =>
  createError({ statusCode: 404, message: "Template não encontrado" });

function channelOf(v: unknown): Channel {
  return v === "sms" ? "sms" : "email";
}

export async function listTemplates(
  db: Database,
  companyId: number,
): Promise<Template[]> {
  const { rows } = await db.sql`
    SELECT * FROM templates WHERE company_id = ${companyId} ORDER BY id DESC
  `;
  return rows as unknown as Template[];
}

export async function createTemplate(
  db: Database,
  companyId: number,
  data: { channel?: unknown; subject?: unknown; body?: unknown },
): Promise<Template> {
  const body = typeof data.body === "string" ? data.body.trim() : "";
  if (!body) throw badRequest("O corpo da mensagem é obrigatório");
  const channel = channelOf(data.channel);
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";

  const { lastInsertRowid } = await db.sql`
    INSERT INTO templates (company_id, channel, subject, body)
    VALUES (${companyId}, ${channel}, ${subject}, ${body})
  `;
  return getById(db, companyId, Number(lastInsertRowid));
}

export async function updateTemplate(
  db: Database,
  companyId: number,
  id: number,
  data: { channel?: unknown; subject?: unknown; body?: unknown },
): Promise<Template> {
  const existing = await findRow(db, companyId, id);
  if (!existing) throw notFound();

  const channel = data.channel === undefined ? existing.channel : channelOf(data.channel);
  const subject =
    typeof data.subject === "string" ? data.subject.trim() : existing.subject;
  const body =
    typeof data.body === "string" && data.body.trim() ? data.body.trim() : existing.body;

  await db.sql`
    UPDATE templates SET channel=${channel}, subject=${subject}, body=${body}
    WHERE id=${id} AND company_id=${companyId}
  `;
  return getById(db, companyId, id);
}

export async function deleteTemplate(
  db: Database,
  companyId: number,
  id: number,
): Promise<void> {
  const { changes } = await db.sql`
    DELETE FROM templates WHERE id = ${id} AND company_id = ${companyId}
  `;
  if (!changes) throw notFound();
}

async function findRow(
  db: Database,
  companyId: number,
  id: number,
): Promise<Template | undefined> {
  const { rows } = await db.sql`
    SELECT * FROM templates WHERE id = ${id} AND company_id = ${companyId}
  `;
  return (rows as unknown as Template[])[0];
}

async function getById(db: Database, companyId: number, id: number): Promise<Template> {
  const row = await findRow(db, companyId, id);
  if (!row) throw notFound();
  return row;
}
