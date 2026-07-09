import type { Database } from "db0";
import { createError } from "h3";
import { hashPassword } from "../auth/auth";

export interface CompanyRow {
  id: number;
  name: string;
  status: string;
  created_at: string;
  users_count: number;
  contacts_count: number;
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const conflict = (msg: string) => createError({ statusCode: 409, message: msg });
const notFound = () =>
  createError({ statusCode: 404, message: "Empresa não encontrada" });

export async function listCompanies(db: Database): Promise<CompanyRow[]> {
  const { rows } = await db.sql`
    SELECT
      c.id, c.name, c.status, c.created_at,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id)     AS users_count,
      (SELECT COUNT(*) FROM customers ct WHERE ct.company_id = c.id) AS contacts_count
    FROM companies c
    ORDER BY c.id DESC
  `;
  return rows as unknown as CompanyRow[];
}

export interface CreateCompanyInput {
  name: unknown;
  adminName: unknown;
  adminEmail: unknown;
  adminPassword: unknown;
}

export async function createCompany(
  db: Database,
  input: CreateCompanyInput,
): Promise<{
  company: { id: number; name: string; status: string };
  adminEmail: string;
}> {
  const name = str(input.name);
  const adminName = str(input.adminName);
  const adminEmail = str(input.adminEmail).toLowerCase();
  const adminPassword =
    typeof input.adminPassword === "string" ? input.adminPassword : "";

  if (!name) throw badRequest("O nome da empresa é obrigatório");
  if (!adminName) throw badRequest("O nome do admin é obrigatório");
  if (!isEmail(adminEmail)) throw badRequest("E-mail do admin inválido");
  if (adminPassword.length < 8)
    throw badRequest("A senha deve ter ao menos 8 caracteres");

  const existing = await db.sql`SELECT id FROM users WHERE email = ${adminEmail}`;
  if ((existing.rows as unknown[]).length > 0) throw conflict("E-mail já cadastrado");

  const { lastInsertRowid: companyId } = await db.sql`
    INSERT INTO companies (name) VALUES (${name})
  `;
  const company = Number(companyId);

  await db.sql`
    INSERT INTO users (company_id, name, email, password_hash, role)
    VALUES (${company}, ${adminName}, ${adminEmail}, ${hashPassword(adminPassword)}, 'owner')
  `;

  return { company: { id: company, name, status: "active" }, adminEmail };
}

export async function setCompanyStatus(
  db: Database,
  id: number,
  status: unknown,
): Promise<CompanyRow> {
  if (status !== "active" && status !== "inactive") throw badRequest("Status inválido");

  const { changes } = await db.sql`
    UPDATE companies SET status = ${status} WHERE id = ${id}
  `;
  if (!changes) throw notFound();

  const { rows } = await db.sql`
    SELECT
      c.id, c.name, c.status, c.created_at,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id)     AS users_count,
      (SELECT COUNT(*) FROM customers ct WHERE ct.company_id = c.id) AS contacts_count
    FROM companies c WHERE c.id = ${id}
  `;
  return (rows as unknown as CompanyRow[])[0];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
