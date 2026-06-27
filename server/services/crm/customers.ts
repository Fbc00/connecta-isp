import type { Database } from "db0";
import { createError } from "h3";

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  status: string;
  created_at: string;
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const notFound = () =>
  createError({ statusCode: 404, message: "Cliente não encontrado" });

export async function listCustomers(db: Database): Promise<Customer[]> {
  const result = await db.sql`SELECT * FROM customers ORDER BY id DESC`;
  return result.rows as unknown as Customer[];
}

export async function createCustomer(
  db: Database,
  data: { name: unknown; email: unknown; phone?: unknown; plan?: unknown },
): Promise<Customer> {
  if (typeof data.name !== "string" || data.name.trim() === "")
    throw badRequest("Nome é obrigatório");
  if (typeof data.email !== "string" || !data.email.includes("@"))
    throw badRequest("E-mail inválido");

  const plan = typeof data.plan === "string" ? data.plan : "basic";
  const phone = typeof data.phone === "string" ? data.phone.trim() : null;

  try {
    const { lastInsertRowid } = await db.sql`
      INSERT INTO customers (name, email, phone, plan)
      VALUES (${data.name.trim()}, ${data.email.trim().toLowerCase()}, ${phone}, ${plan})
    `;
    return getById(db, Number(lastInsertRowid));
  } catch {
    throw createError({ statusCode: 409, message: "E-mail já cadastrado" });
  }
}

export async function updateCustomer(
  db: Database,
  id: number,
  data: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    plan?: unknown;
    status?: unknown;
  },
): Promise<Customer> {
  const existing = await findRow(db, id);
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

  await db.sql`
    UPDATE customers SET name=${name}, email=${email}, phone=${phone},
    plan=${plan}, status=${status} WHERE id=${id}
  `;
  return getById(db, id);
}

export async function deleteCustomer(db: Database, id: number): Promise<void> {
  const { changes } = await db.sql`DELETE FROM customers WHERE id = ${id}`;
  if (!changes) throw notFound();
}

async function findRow(db: Database, id: number): Promise<Customer | undefined> {
  const result = await db.sql`SELECT * FROM customers WHERE id = ${id}`;
  return (result.rows as unknown as Customer[])[0];
}

async function getById(db: Database, id: number): Promise<Customer> {
  const row = await findRow(db, id);
  if (!row) throw notFound();
  return row;
}
