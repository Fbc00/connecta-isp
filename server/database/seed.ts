import type { Database } from "db0";
import { createSuperAdmin, hashPassword } from "../services/auth/auth";

/**
 * Garante um super_admin na subida. Credenciais via env; default só para dev.
 */
export async function seedSuperAdmin(db: Database): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL ?? "admin@connecta.local";
  const password = process.env.SUPERADMIN_PASSWORD ?? "connecta-admin";
  const name = process.env.SUPERADMIN_NAME ?? "Super Admin";
  await createSuperAdmin(db, { name, email, password });
}

/**
 * Dados de demonstração (apenas dev). Idempotente: só roda se não houver empresa.
 */
export async function seedDemo(db: Database): Promise<void> {
  const { rows } = await db.sql`SELECT id FROM companies LIMIT 1`;
  if ((rows as unknown[]).length > 0) return;

  const { lastInsertRowid: companyId } = await db.sql`
    INSERT INTO companies (name, status) VALUES ('Acme ISP', 'active')
  `;
  const company = Number(companyId);

  await db.sql`
    INSERT INTO users (company_id, name, email, password_hash, role)
    VALUES (${company}, 'Alice Owner', 'owner@acme.local', ${hashPassword("owner-demo1")}, 'owner')
  `;

  const contacts = [
    { name: "João Silva", email: "joao@cliente.com", tags: "fibra,vip" },
    { name: "Maria Souza", email: "maria@cliente.com", tags: "fibra" },
    { name: "Carlos Lima", email: "carlos@cliente.com", tags: "radio" },
  ];
  for (const c of contacts) {
    await db.sql`
      INSERT INTO customers (company_id, name, email, tags)
      VALUES (${company}, ${c.name}, ${c.email}, ${c.tags})
    `;
  }
}
