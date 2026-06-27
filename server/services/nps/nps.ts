import type { Database } from "db0";
import { createError } from "h3";

export interface NpsResponse {
  id: number;
  customer_id: number;
  score: number;
  comment: string | null;
  created_at: string;
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });

export async function listResponses(db: Database): Promise<NpsResponse[]> {
  const result = await db.sql`SELECT * FROM nps_responses ORDER BY id DESC`;
  return result.rows as unknown as NpsResponse[];
}

export async function createResponse(
  db: Database,
  data: { customer_id: unknown; score: unknown; comment?: unknown },
): Promise<NpsResponse> {
  if (typeof data.customer_id !== "number" || data.customer_id <= 0)
    throw badRequest("customer_id inválido");
  if (typeof data.score !== "number" || data.score < 0 || data.score > 10)
    throw badRequest("Score deve ser entre 0 e 10");

  const comment = typeof data.comment === "string" ? data.comment.trim() : null;

  const { lastInsertRowid } = await db.sql`
    INSERT INTO nps_responses (customer_id, score, comment)
    VALUES (${data.customer_id}, ${data.score}, ${comment})
  `;

  const result = await db.sql`
    SELECT * FROM nps_responses WHERE id = ${Number(lastInsertRowid)}
  `;
  return (result.rows as unknown as NpsResponse[])[0];
}

export async function getNpsSummary(db: Database): Promise<{
  promoters: number;
  passives: number;
  detractors: number;
  nps: number;
}> {
  const result = await db.sql`SELECT score FROM nps_responses`;
  const scores = (result.rows as unknown as { score: number }[]).map((r) => r.score);

  const total = scores.length;
  if (total === 0) return { promoters: 0, passives: 0, detractors: 0, nps: 0 };

  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const nps = Math.round(((promoters - detractors) / total) * 100);

  return { promoters, passives, detractors, nps };
}
