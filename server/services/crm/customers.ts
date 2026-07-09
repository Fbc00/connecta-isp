import type { Database } from "db0";
import { createError } from "h3";

export interface Customer {
  id: number;
  company_id: number;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  status: string;
  tags: string;
  created_at: string;
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const notFound = () =>
  createError({ statusCode: 404, message: "Cliente não encontrado" });

/** Normaliza uma string de tags "a, b ,c" -> "a,b,c" (sem vazios/duplicatas). */
export function normalizeTags(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const parts = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(parts)].join(",");
}

export async function listCustomers(
  db: Database,
  companyId: number,
): Promise<Customer[]> {
  const result = await db.sql`
    SELECT * FROM customers WHERE company_id = ${companyId} ORDER BY id DESC
  `;
  return result.rows as unknown as Customer[];
}

export async function createCustomer(
  db: Database,
  companyId: number,
  data: {
    name: unknown;
    email: unknown;
    phone?: unknown;
    plan?: unknown;
    tags?: unknown;
  },
): Promise<Customer> {
  if (typeof data.name !== "string" || data.name.trim() === "")
    throw badRequest("Nome é obrigatório");
  if (typeof data.email !== "string" || !data.email.includes("@"))
    throw badRequest("E-mail inválido");

  const plan = typeof data.plan === "string" ? data.plan : "basic";
  const phone = typeof data.phone === "string" ? data.phone.trim() : null;
  const tags = normalizeTags(data.tags);

  try {
    const { lastInsertRowid } = await db.sql`
      INSERT INTO customers (company_id, name, email, phone, plan, tags)
      VALUES (${companyId}, ${data.name.trim()}, ${data.email.trim().toLowerCase()}, ${phone}, ${plan}, ${tags})
    `;
    return getById(db, companyId, Number(lastInsertRowid));
  } catch {
    throw createError({ statusCode: 409, message: "E-mail já cadastrado" });
  }
}

/**
 * Importa contatos em massa. Ignora linhas inválidas ou com e-mail já existente.
 * Retorna quantos foram criados e quantos foram pulados.
 */
export async function importCustomers(
  db: Database,
  companyId: number,
  rows: unknown,
): Promise<{ created: number; skipped: number }> {
  if (!Array.isArray(rows)) throw badRequest("Lista de contatos inválida");
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    try {
      await createCustomer(db, companyId, {
        name: r.name,
        email: r.email,
        phone: r.phone,
        plan: r.plan,
        tags: r.tags,
      });
      created += 1;
    } catch {
      skipped += 1;
    }
  }
  return { created, skipped };
}

export async function updateCustomer(
  db: Database,
  companyId: number,
  id: number,
  data: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    plan?: unknown;
    status?: unknown;
    tags?: unknown;
  },
): Promise<Customer> {
  const existing = await findRow(db, companyId, id);
  if (!existing) throw notFound();

  const name =
    typeof data.name === "string" && data.name.trim() ? data.name.trim() : existing.name;
  const email =
    typeof data.email === "string" && data.email.includes("@")
      ? data.email.trim().toLowerCase()
      : existing.email;
  const phone = typeof data.phone === "string" ? data.phone.trim() : existing.phone;
  const plan = typeof data.plan === "string" ? data.plan : existing.plan;
  const status = typeof data.status === "string" ? data.status : existing.status;
  const tags = data.tags === undefined ? existing.tags : normalizeTags(data.tags);

  await db.sql`
    UPDATE customers SET name=${name}, email=${email}, phone=${phone},
    plan=${plan}, status=${status}, tags=${tags} WHERE id=${id} AND company_id=${companyId}
  `;
  return getById(db, companyId, id);
}

export async function deleteCustomer(
  db: Database,
  companyId: number,
  id: number,
): Promise<void> {
  const { changes } = await db.sql`
    DELETE FROM customers WHERE id = ${id} AND company_id = ${companyId}
  `;
  if (!changes) throw notFound();
}

async function findRow(
  db: Database,
  companyId: number,
  id: number,
): Promise<Customer | undefined> {
  const result = await db.sql`
    SELECT * FROM customers WHERE id = ${id} AND company_id = ${companyId}
  `;
  return (result.rows as unknown as Customer[])[0];
}

async function getById(db: Database, companyId: number, id: number): Promise<Customer> {
  const row = await findRow(db, companyId, id);
  if (!row) throw notFound();
  return row;
}
