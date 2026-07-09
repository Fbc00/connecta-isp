import type { Database } from "db0";

export interface PlatformAnalytics {
  companies: number;
  active_companies: number;
  users: number;
  contacts: number;
  messages: number;
  responses: number;
}

async function scalar(res: { rows: unknown[] }): Promise<number> {
  const row = (res.rows as { n: number }[])[0];
  return row ? Number(row.n) : 0;
}

export async function getPlatformAnalytics(db: Database): Promise<PlatformAnalytics> {
  return {
    companies: await scalar(await db.sql`SELECT COUNT(*) AS n FROM companies`),
    active_companies: await scalar(
      await db.sql`SELECT COUNT(*) AS n FROM companies WHERE status = 'active'`,
    ),
    users: await scalar(await db.sql`SELECT COUNT(*) AS n FROM users`),
    contacts: await scalar(await db.sql`SELECT COUNT(*) AS n FROM customers`),
    messages: await scalar(
      await db.sql`SELECT COUNT(*) AS n FROM messages WHERE status = 'sent'`,
    ),
    responses: await scalar(await db.sql`SELECT COUNT(*) AS n FROM nps_responses`),
  };
}
