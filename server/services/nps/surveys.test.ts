import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import { getInviteByToken, sendInvites, submitPublicResponse } from "./invites";
import {
  createSurvey,
  getSurvey,
  getSurveyQuestionScores,
  listSurveys,
  setSurveyStatus,
} from "./surveys";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));
const CO = 1;
let c1 = 0;
let c2 = 0;

beforeAll(async () => {
  await initSchema(db);
  await db.sql`INSERT INTO companies (id, name) VALUES (${CO}, 'Acme')`;
});
afterAll(() => db.dispose());
beforeEach(async () => {
  await db.sql`DELETE FROM nps_responses`;
  await db.sql`DELETE FROM nps_invites`;
  await db.sql`DELETE FROM messages`;
  await db.sql`DELETE FROM nps_questions`;
  await db.sql`DELETE FROM nps_surveys`;
  await db.sql`DELETE FROM customers`;
  const a =
    await db.sql`INSERT INTO customers (company_id, name, email) VALUES (${CO}, 'A', 'a@x.com')`;
  const b =
    await db.sql`INSERT INTO customers (company_id, name, email) VALUES (${CO}, 'B', 'b@x.com')`;
  c1 = Number(a.lastInsertRowid);
  c2 = Number(b.lastInsertRowid);
});

describe("surveys", () => {
  it("cria com pergunta default e exige título", async () => {
    const s = await createSurvey(db, CO, { title: "Q3" });
    expect(s.questions).toHaveLength(1);
    expect(s.questions[0].text).toMatch(/recomendaria/i);
    expect((await listSurveys(db, CO)).length).toBe(1);
    await expect(createSurvey(db, CO, { title: "" })).rejects.toThrowError(/título/i);
  });

  it("cria com N perguntas na ordem informada", async () => {
    const s = await createSurvey(db, CO, {
      title: "Multi",
      questions: ["Atendimento?", "Velocidade?", "Preço?"],
    });
    expect(s.questions.map((q) => q.text)).toEqual([
      "Atendimento?",
      "Velocidade?",
      "Preço?",
    ]);
    expect(s.questions.map((q) => q.position)).toEqual([0, 1, 2]);
    // Retrocompat: primeira pergunta espelhada em survey.question.
    expect(s.question).toBe("Atendimento?");
  });

  it("ignora perguntas vazias e exige ao menos uma", async () => {
    const s = await createSurvey(db, CO, { title: "T", questions: ["  ", "Ok?"] });
    expect(s.questions.map((q) => q.text)).toEqual(["Ok?"]);
    await expect(
      createSurvey(db, CO, { title: "T", questions: ["   "] }),
    ).rejects.toThrowError(/pergunta/i);
  });

  it("altera status com validação", async () => {
    const s = await createSurvey(db, CO, { title: "Q" });
    expect((await setSurveyStatus(db, CO, s.id, "closed")).status).toBe("closed");
    await expect(setSurveyStatus(db, CO, s.id, "x")).rejects.toThrowError(/inválido/i);
  });

  it("score por pergunta é zero quando sem respostas", async () => {
    const s = await createSurvey(db, CO, { title: "Q", questions: ["A?", "B?"] });
    const scores = await getSurveyQuestionScores(db, CO, s.id);
    expect(scores).toHaveLength(2);
    expect(scores[0]).toMatchObject({
      text: "A?",
      promoters: 0,
      passives: 0,
      detractors: 0,
      total: 0,
      nps: 0,
    });
  });
});

describe("nps ciclo completo", () => {
  it("envia convite, responde por token e computa score", async () => {
    const s = await createSurvey(db, CO, { title: "Q" });
    const res = await sendInvites(db, CO, s.id, { customerIds: [c1, c2] });
    expect(res.sent).toBe(2);

    const invites = await db.sql`SELECT token FROM nps_invites ORDER BY id`;
    const tokens = (invites.rows as { token: string }[]).map((r) => r.token);

    const pub = await getInviteByToken(db, tokens[0]);
    expect(pub.survey.title).toBe("Q");
    expect(pub.status).toBe("sent");

    await submitPublicResponse(db, tokens[0], { score: 10, comment: "ótimo" });
    await submitPublicResponse(db, tokens[1], { score: 3 });

    const score = await getSurveyScore(db, CO, s.id);
    expect(score.total).toBe(2);
    expect(score.promoters).toBe(1);
    expect(score.detractors).toBe(1);
    expect(score.nps).toBe(0);

    // uma mensagem por convite (tracking)
    const msgs = await db.sql`SELECT COUNT(*) AS n FROM messages`;
    expect(Number((msgs.rows as { n: number }[])[0].n)).toBe(2);
  });

  it("recusa segunda resposta e nota inválida", async () => {
    const s = await createSurvey(db, CO, { title: "Q" });
    await sendInvites(db, CO, s.id, { customerIds: [c1] });
    const { token } = await db.sql`SELECT token FROM nps_invites LIMIT 1`.then(
      (r) => (r.rows as { token: string }[])[0],
    );

    await expect(submitPublicResponse(db, token, { score: 42 })).rejects.toThrowError(
      /nota/i,
    );
    await submitPublicResponse(db, token, { score: 8 });
    await expect(submitPublicResponse(db, token, { score: 9 })).rejects.toThrowError(
      /respondido/i,
    );
  });

  it("token inexistente falha", async () => {
    await expect(getInviteByToken(db, "nope")).rejects.toThrowError(/não encontrado/i);
  });
});
