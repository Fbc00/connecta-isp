import { randomBytes } from "node:crypto";
import type { Database } from "db0";
import { createError } from "h3";
import type { Customer } from "../crm/customers";
import { getProvider } from "../messaging/provider";
import { getSurvey } from "./surveys";

export interface Invite {
  id: number;
  company_id: number;
  survey_id: number;
  customer_id: number;
  token: string;
  channel: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface PublicInvite {
  token: string;
  status: string;
  survey: {
    title: string;
    question: string;
    status: string;
    questions: { id: number; text: string }[];
  };
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });

function appUrl(): string {
  return (process.env.APP_URL ?? "").replace(/\/$/, "");
}

/**
 * Cria convites de NPS para os contatos escolhidos e "envia" o link único via
 * o provider de mensagens (Fase 3). Grava uma mensagem por envio para tracking.
 */
export async function sendInvites(
  db: Database,
  companyId: number,
  surveyId: number,
  data: { customerIds: unknown; channel?: unknown },
): Promise<{ sent: number; failed: number; total: number }> {
  const survey = await getSurvey(db, companyId, surveyId);
  if (!Array.isArray(data.customerIds) || data.customerIds.length === 0)
    throw badRequest("Selecione ao menos um contato");
  const channel = data.channel === "sms" ? "sms" : "email";
  const provider = getProvider(channel);

  let sent = 0;
  let failed = 0;

  for (const rawId of data.customerIds) {
    const id = Number(rawId);
    const c = await db.sql`
      SELECT * FROM customers WHERE id = ${id} AND company_id = ${companyId}
    `;
    const contact = (c.rows as unknown as Customer[])[0];
    if (!contact) {
      failed += 1;
      continue;
    }

    const token = randomBytes(16).toString("hex");
    const { lastInsertRowid: inviteId } = await db.sql`
      INSERT INTO nps_invites (company_id, survey_id, customer_id, token, channel, status)
      VALUES (${companyId}, ${surveyId}, ${contact.id}, ${token}, ${channel}, 'pending')
    `;

    const link = `${appUrl()}/nps/${token}`;
    const to = channel === "sms" ? (contact.phone ?? "") : contact.email;
    const result = await provider.send({
      to,
      channel,
      subject: survey.title,
      body: `${survey.question}\nResponda: ${link}`,
    });

    const sentAt = result.status === "sent" ? new Date().toISOString() : null;
    await db.sql`
      UPDATE nps_invites SET status = ${result.status}, sent_at = ${sentAt}
      WHERE id = ${Number(inviteId)}
    `;
    await db.sql`
      INSERT INTO messages
        (company_id, customer_id, channel, status, provider_id, subject, body, sent_at)
      VALUES
        (${companyId}, ${contact.id}, ${channel}, ${result.status},
         ${result.providerId || null}, ${survey.title}, ${`NPS: ${link}`}, ${sentAt})
    `;

    if (result.status === "sent") sent += 1;
    else failed += 1;
  }

  return { sent, failed, total: sent + failed };
}

/** Busca o convite por token (fluxo público, sem escopo de empresa). */
export async function getInviteByToken(
  db: Database,
  token: string,
): Promise<PublicInvite> {
  const { rows } = await db.sql`
    SELECT i.token, i.status, i.survey_id,
           s.title AS s_title, s.question AS s_question, s.status AS s_status
    FROM nps_invites i
    JOIN nps_surveys s ON s.id = i.survey_id
    WHERE i.token = ${token}
  `;
  const row = (
    rows as unknown as {
      token: string;
      status: string;
      survey_id: number;
      s_title: string;
      s_question: string;
      s_status: string;
    }[]
  )[0];
  if (!row) throw createError({ statusCode: 404, message: "Convite não encontrado" });

  const q = await db.sql`
    SELECT id, text FROM nps_questions
    WHERE survey_id = ${row.survey_id} ORDER BY position, id
  `;
  return {
    token: row.token,
    status: row.status,
    survey: {
      title: row.s_title,
      question: row.s_question,
      status: row.s_status,
      questions: q.rows as unknown as { id: number; text: string }[],
    },
  };
}

/**
 * Registra a resposta pública de um convite. Idempotente por convite: um token
 * só pode responder uma vez.
 */
export async function submitPublicResponse(
  db: Database,
  token: string,
  data: {
    answers?: unknown;
    score?: unknown;
    comment?: unknown;
  },
): Promise<{ ok: true }> {
  const { rows } = await db.sql`SELECT * FROM nps_invites WHERE token = ${token}`;
  const invite = (rows as unknown as Invite[])[0];
  if (!invite) throw createError({ statusCode: 404, message: "Convite não encontrado" });
  if (invite.status === "responded")
    throw createError({ statusCode: 409, message: "Este convite já foi respondido" });

  // Perguntas válidas do survey deste convite.
  const qRows = await db.sql`
    SELECT id FROM nps_questions WHERE survey_id = ${invite.survey_id} ORDER BY position, id
  `;
  const questionIds = (qRows.rows as unknown as { id: number }[]).map((r) => r.id);
  if (questionIds.length === 0)
    throw createError({ statusCode: 400, message: "Pesquisa sem perguntas" });

  // Retrocompat: {score} solto vira uma resposta para a primeira pergunta.
  const rawAnswers = Array.isArray(data.answers)
    ? data.answers
    : data.score !== undefined
      ? [{ question_id: questionIds[0], score: data.score, comment: data.comment }]
      : [];

  const parsed = rawAnswers.map((a) => {
    const answer = a as { question_id?: unknown; score?: unknown; comment?: unknown };
    const questionId = Number(answer.question_id);
    if (!questionIds.includes(questionId))
      throw badRequest("Pergunta inválida para esta pesquisa");
    const score = Number(answer.score);
    if (!Number.isInteger(score) || score < 0 || score > 10)
      throw badRequest("A nota deve ser entre 0 e 10");
    const comment = typeof answer.comment === "string" ? answer.comment.trim() : null;
    return { questionId, score, comment };
  });

  // Exige exatamente uma resposta por pergunta do survey.
  const answered = new Set(parsed.map((p) => p.questionId));
  if (answered.size !== questionIds.length || parsed.length !== questionIds.length)
    throw badRequest("Responda todas as perguntas");

  for (const p of parsed) {
    await db.sql`
      INSERT INTO nps_responses
        (company_id, customer_id, survey_id, invite_id, question_id, score, comment)
      VALUES
        (${invite.company_id}, ${invite.customer_id}, ${invite.survey_id},
         ${invite.id}, ${p.questionId}, ${p.score}, ${p.comment})
    `;
  }
  await db.sql`UPDATE nps_invites SET status = 'responded' WHERE id = ${invite.id}`;
  return { ok: true };
}
