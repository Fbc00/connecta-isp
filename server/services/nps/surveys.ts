import type { Database } from "db0";
import { createError } from "h3";

export interface Survey {
  id: number;
  company_id: number;
  title: string;
  question: string;
  status: string;
  created_at: string;
}

export interface SurveyScore {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  nps: number;
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const notFound = () =>
  createError({ statusCode: 404, message: "Pesquisa não encontrada" });

const DEFAULT_QUESTION = "De 0 a 10, o quanto você recomendaria a gente?";

export async function listSurveys(db: Database, companyId: number): Promise<Survey[]> {
  const { rows } = await db.sql`
    SELECT * FROM nps_surveys WHERE company_id = ${companyId} ORDER BY id DESC
  `;
  return rows as unknown as Survey[];
}

export async function getSurvey(
  db: Database,
  companyId: number,
  id: number,
): Promise<Survey> {
  const { rows } = await db.sql`
    SELECT * FROM nps_surveys WHERE id = ${id} AND company_id = ${companyId}
  `;
  const row = (rows as unknown as Survey[])[0];
  if (!row) throw notFound();
  return row;
}

export async function createSurvey(
  db: Database,
  companyId: number,
  data: { title?: unknown; question?: unknown },
): Promise<Survey> {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) throw badRequest("O título é obrigatório");
  const question =
    typeof data.question === "string" && data.question.trim()
      ? data.question.trim()
      : DEFAULT_QUESTION;

  const { lastInsertRowid } = await db.sql`
    INSERT INTO nps_surveys (company_id, title, question)
    VALUES (${companyId}, ${title}, ${question})
  `;
  return getSurvey(db, companyId, Number(lastInsertRowid));
}

export async function setSurveyStatus(
  db: Database,
  companyId: number,
  id: number,
  status: unknown,
): Promise<Survey> {
  if (status !== "active" && status !== "closed") throw badRequest("Status inválido");
  const { changes } = await db.sql`
    UPDATE nps_surveys SET status = ${status} WHERE id = ${id} AND company_id = ${companyId}
  `;
  if (!changes) throw notFound();
  return getSurvey(db, companyId, id);
}

/** NPS de uma pesquisa: %promotores − %detratores. */
export async function getSurveyScore(
  db: Database,
  companyId: number,
  surveyId: number,
): Promise<SurveyScore> {
  const { rows } = await db.sql`
    SELECT score FROM nps_responses
    WHERE company_id = ${companyId} AND survey_id = ${surveyId}
  `;
  const scores = (rows as unknown as { score: number }[]).map((r) => r.score);
  const total = scores.length;
  if (total === 0) return { promoters: 0, passives: 0, detractors: 0, total: 0, nps: 0 };

  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const nps = Math.round(((promoters - detractors) / total) * 100);
  return { promoters, passives, detractors, total, nps };
}
