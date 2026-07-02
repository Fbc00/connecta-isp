import type { Database } from "db0";

export interface AuditEntry {
  id: number;
  user_id: number | null;
  company_id: number | null;
  action: string;
  detail: string;
  created_at: string;
}

export interface LogInput {
  userId?: number | null;
  companyId?: number | null;
  action: string;
  detail?: string;
}

/** Registra uma ação no audit log. Nunca lança — auditoria não deve quebrar o fluxo. */
export async function logAudit(db: Database, input: LogInput): Promise<void> {
  try {
    await db.sql`
      INSERT INTO audit_log (user_id, company_id, action, detail)
      VALUES (${input.userId ?? null}, ${input.companyId ?? null}, ${input.action}, ${input.detail ?? ""})
    `;
  } catch {
    // silencioso de propósito
  }
}

/** Lista entradas do audit log. Sem companyId => escopo plataforma (super_admin). */
export async function listAudit(
  db: Database,
  companyId: number | null,
  limit = 100,
): Promise<AuditEntry[]> {
  const { rows } =
    companyId == null
      ? await db.sql`SELECT * FROM audit_log ORDER BY id DESC LIMIT ${limit}`
      : await db.sql`SELECT * FROM audit_log WHERE company_id = ${companyId} ORDER BY id DESC LIMIT ${limit}`;
  return rows as unknown as AuditEntry[];
}
