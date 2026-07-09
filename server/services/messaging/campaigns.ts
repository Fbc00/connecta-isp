import type { Database } from "db0";
import { createError } from "h3";
import type { Customer } from "../crm/customers";
import { getProvider } from "./provider";
import type { Template } from "./templates";

export interface Message {
  id: number;
  company_id: number;
  customer_id: number;
  channel: string;
  status: string;
  provider_id: string | null;
  subject: string | null;
  body: string;
  sent_at: string | null;
  created_at: string;
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });

/** Substitui {{name}} / {{email}} pelo dado do contato. */
export function renderTemplate(text: string, contact: Customer): string {
  return text.replaceAll("{{name}}", contact.name).replaceAll("{{email}}", contact.email);
}

export async function listMessages(db: Database, companyId: number): Promise<Message[]> {
  const { rows } = await db.sql`
    SELECT * FROM messages WHERE company_id = ${companyId} ORDER BY id DESC LIMIT 200
  `;
  return rows as unknown as Message[];
}

/**
 * Dispara uma campanha síncrona: para cada contato selecionado, renderiza o
 * template, envia pelo provider e grava a mensagem com o status resultante.
 */
export async function dispatchCampaign(
  db: Database,
  companyId: number,
  data: { templateId: unknown; customerIds: unknown },
): Promise<{ sent: number; failed: number; total: number }> {
  const templateId = Number(data.templateId);
  if (!templateId) throw badRequest("Template inválido");
  if (!Array.isArray(data.customerIds) || data.customerIds.length === 0)
    throw badRequest("Selecione ao menos um contato");

  const t = await db.sql`
    SELECT * FROM templates WHERE id = ${templateId} AND company_id = ${companyId}
  `;
  const template = (t.rows as unknown as Template[])[0];
  if (!template)
    throw createError({ statusCode: 404, message: "Template não encontrado" });

  const provider = getProvider(template.channel);
  let sent = 0;
  let failed = 0;

  for (const rawId of data.customerIds) {
    const id = Number(rawId);
    const c = await db.sql`
      SELECT * FROM customers WHERE id = ${id} AND company_id = ${companyId}
    `;
    const contact = (c.rows as unknown as Customer[])[0];
    if (!contact) {
      failed += 1;
      continue;
    }

    const subject = renderTemplate(template.subject, contact);
    const body = renderTemplate(template.body, contact);
    const to = template.channel === "sms" ? (contact.phone ?? "") : contact.email;

    const result = await provider.send({
      to,
      channel: template.channel,
      subject,
      body,
    });

    const sentAt = result.status === "sent" ? new Date().toISOString() : null;
    await db.sql`
      INSERT INTO messages
        (company_id, customer_id, channel, status, provider_id, subject, body, sent_at)
      VALUES
        (${companyId}, ${contact.id}, ${template.channel}, ${result.status},
         ${result.providerId || null}, ${subject}, ${body}, ${sentAt})
    `;

    if (result.status === "sent") sent += 1;
    else failed += 1;
  }

  return { sent, failed, total: sent + failed };
}
