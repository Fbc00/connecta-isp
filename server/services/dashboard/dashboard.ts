import type { Database } from "db0";
import { getNpsSummary } from "../nps/nps";

export interface DashboardSummary {
  contacts: number;
  messages_sent: number;
  surveys: number;
  nps: number;
}

function count(result: { rows: unknown[] }): number {
  const row = (result.rows as { n: number }[])[0];
  return row ? Number(row.n) : 0;
}

export async function getDashboardSummary(
  db: Database,
  companyId: number,
): Promise<DashboardSummary> {
  const contacts = count(
    await db.sql`SELECT COUNT(*) AS n FROM customers WHERE company_id = ${companyId}`,
  );
  const messages_sent = count(
    await db.sql`SELECT COUNT(*) AS n FROM messages WHERE company_id = ${companyId} AND status = 'sent'`,
  );
  const surveys = count(
    await db.sql`SELECT COUNT(*) AS n FROM nps_surveys WHERE company_id = ${companyId}`,
  );
  const { nps } = await getNpsSummary(db, companyId);
  return { contacts, messages_sent, surveys, nps };
}
