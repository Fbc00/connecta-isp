import type { Database } from "db0";
import { createError } from "h3";

export interface Question {
  id: number;
  text: string;
  position: number;
}

export interface QuestionScore extends Question {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  nps: number;
}

export interface Survey {
  id: number;
  company_id: number;
  title: string;
  question: string;
  status: string;
  created_at: string;
  questions: Question[];
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const notFound = () =>
  createError({ statusCode: 404, message: "Pesquisa não encontrada" });

const DEFAULT_QUESTION = "De 0 a 10, o quanto você recomendaria a gente?";

/** Normaliza a entrada de perguntas: aceita questions[] ou question legado. */
function normalizeQuestions(data: { questions?: unknown; question?: unknown }): string[] {
  const raw = Array.isArray(data.questions)
    ? data.questions
    : typeof data.question === "string"
      ? [data.question]
      : [];
  const cleaned = raw
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.trim())
    .filter((q) => q.length > 0);
  if (Array.isArray(data.questions) || typeof data.question === "string") {
    if (cleaned.length === 0) throw badRequest("Informe ao menos uma pergunta");
    return cleaned;
  }
  return [DEFAULT_QUESTION];
}

async function questionsOf(
  db: Database,
  companyId: number,
  surveyId: number,
): Promise<Question[]> {
  const { rows } = await db.sql`
    SELECT id, text, position FROM nps_questions
    WHERE survey_id = ${surveyId} AND company_id = ${companyId} ORDER BY position, id
  `;
  return rows as unknown as Question[];
}

export async function listSurveys(db: Database, companyId: number): Promise<Survey[]> {
  const { rows } = await db.sql`
    SELECT * FROM nps_surveys WHERE company_id = ${companyId} ORDER BY id DESC
  `;
  const surveys = rows as unknown as Survey[];
  for (const s of surveys) s.questions = await questionsOf(db, companyId, s.id);
  return surveys;
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
  row.questions = await questionsOf(db, companyId, row.id);
  return row;
}

export async function createSurvey(
  db: Database,
  companyId: number,
  data: { title?: unknown; questions?: unknown; question?: unknown },
): Promise<Survey> {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) throw badRequest("O título é obrigatório");
  const questions = normalizeQuestions(data);

  const { lastInsertRowid } = await db.sql`
    INSERT INTO nps_surveys (company_id, title, question)
    VALUES (${companyId}, ${title}, ${questions[0]})
  `;
  const surveyId = Number(lastInsertRowid);

  for (let i = 0; i < questions.length; i++) {
    await db.sql`
      INSERT INTO nps_questions (company_id, survey_id, text, position)
      VALUES (${companyId}, ${surveyId}, ${questions[i]}, ${i})
    `;
  }
  return getSurvey(db, companyId, surveyId);
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

function tally(scores: number[]): Omit<QuestionScore, keyof Question> {
  const total = scores.length;
  if (total === 0) return { promoters: 0, passives: 0, detractors: 0, total: 0, nps: 0 };
  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const nps = Math.round(((promoters - detractors) / total) * 100);
  return { promoters, passives, detractors, total, nps };
}

/** NPS de cada pergunta da pesquisa: %promotores − %detratores. */
export async function getSurveyQuestionScores(
  db: Database,
  companyId: number,
  surveyId: number,
): Promise<QuestionScore[]> {
  const questions = await questionsOf(db, companyId, surveyId);
  const result: QuestionScore[] = [];
  for (const q of questions) {
    const { rows } = await db.sql`
      SELECT score FROM nps_responses
      WHERE company_id = ${companyId} AND survey_id = ${surveyId} AND question_id = ${q.id}
    `;
    const scores = (rows as unknown as { score: number }[]).map((r) => r.score);
    result.push({ ...q, ...tally(scores) });
  }
  return result;
}
